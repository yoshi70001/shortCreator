const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execPromise = promisify(exec);

let detectedGpuVendor = null;

/**
 * Detecta el mejor codificador de video acelerado por hardware disponible en FFmpeg.
 * Se ejecuta solo una vez y guarda el resultado en caché.
 * @returns {Promise<string>} 'nvidia', 'intel', 'amd', o 'cpu'.
 */
async function detectGpuVendor() {
  if (detectedGpuVendor) return detectedGpuVendor;
  try {
    console.log("Detectando hardware de GPU compatible con FFmpeg...");
    const { stdout } = await execPromise("ffmpeg -encoders");
    if (stdout.includes("h264_nvenc")) {
      console.log("GPU NVIDIA (NVENC) detectada.");
      detectedGpuVendor = "nvidia";
    } else if (stdout.includes("h264_qsv")) {
      console.log("GPU Intel (QSV) detectada.");
      detectedGpuVendor = "intel";
    } else if (stdout.includes("h264_amf")) {
      console.log("GPU AMD (AMF) detectada.");
      detectedGpuVendor = "amd";
    } else {
      console.log("No se detectó GPU compatible. Usando CPU.");
      detectedGpuVendor = "cpu";
    }
  } catch (error) {
    console.warn("Advertencia: No se pudo ejecutar 'ffmpeg -encoders'. Se asumirá CPU.");
    detectedGpuVendor = "cpu";
  }
  return detectedGpuVendor;
}

/**
 * Detecta el códec del primer stream de video en un archivo.
 * @param {string} videoPath - Ruta al archivo de video.
 * @returns {Promise<string|null>} El nombre del códec ('h264', 'hevc', etc.) o null si falla.
 */
async function getVideoCodec(videoPath) {
  const command = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  try {
    const { stdout } = await execPromise(command);
    const codec = stdout.trim();
    console.log(`Códec de video detectado: ${codec}`);
    return codec;
  } catch (error) {
    console.error(`Error al detectar el códec del video: ${videoPath}`);
    return null;
  }
}

/**
 * Crea shorts a partir de segmentos virales, detectando y usando automáticamente GPU y códec.
 * @param {string} videoPath - Ruta al video original.
 * @param {Array} viralSegments - Array de segmentos virales.
 * @param {string} outputFolder - Carpeta de salida para los shorts.
 * @param {string} srtPath - Ruta al archivo de subtítulos SRT.
 */
async function createShorts(
  videoPath,
  viralSegments,
  outputFolder,
  srtPath
) {
  try {
    if (!fs.existsSync(videoPath)) throw new Error(`El video no existe: ${videoPath}`);
    if (!fs.existsSync(srtPath)) throw new Error(`El archivo de subtítulos no existe: ${srtPath}`);
    if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });

    // 1. Detectar hardware y códec del video de entrada
    const gpuVendor = await detectGpuVendor();
    const videoCodec = await getVideoCodec(videoPath);
    if (!videoCodec) {
        throw new Error("No se pudo determinar el códec del video de entrada. Abortando.");
    }

    // 2. Configurar las opciones de decodificación y codificación de FFmpeg
    let decoderOpts = "";
    let videoEncoderOpts = "";

    switch (gpuVendor) {
      case "nvidia":
        // Seleccionar el decodificador específico de NVIDIA para el códec
        if (videoCodec === 'hevc') {
          decoderOpts = "-c:v hevc_cuvid";
        } else if (videoCodec === 'h264') {
          decoderOpts = "-c:v h264_cuvid";
        }
        videoEncoderOpts = "-c:v h264_nvenc -preset p5 -cq 23";
        break;
      case "intel":
        // Seleccionar el decodificador específico de Intel QSV
        if (videoCodec === 'hevc') {
          decoderOpts = "-c:v hevc_qsv";
        } else if (videoCodec === 'h264') {
          decoderOpts = "-c:v h264_qsv";
        }
        // QSV a menudo requiere que se inicialice el dispositivo hwaccel
        decoderOpts += " -hwaccel qsv -hwaccel_output_format qsv";
        videoEncoderOpts = "-c:v h264_qsv -preset fast -global_quality 23";
        break;
      case "amd":
        // Para AMD, es a menudo más estable usar el decodificador genérico d3d11va
        decoderOpts = "-hwaccel d3d11va";
        videoEncoderOpts = "-c:v h264_amf -quality quality -rc cqp -qp_i 23 -qp_p 23";
        break;
      default: // 'cpu'
        decoderOpts = "";
        videoEncoderOpts = "-c:v libx264 -preset fast -crf 23";
        break;
    }
    
    // Procesar cada segmento viral
    for (let i = 0; i < viralSegments.length; i++) {
      const segment = viralSegments[i];
      const { start, end, emotion } = segment;

      const duration = Math.min(Math.max(end - start, 30), 50);
      const shortName = `short_${i + 1}_${emotion.replace(/[\\/:"*?<>|]/g, "-")}.mp4`;
      const outputPath = path.join(outputFolder, shortName);
      const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      
      const filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=10[bg];[0:v]scale=-2:1080,crop=1080:1080,subtitles='${escapedSrtPath}':force_style='Alignment=2'[main];[bg][main]overlay=(W-w)/2:(H-h)/2[v]`.replace(/\s+/g, " ").trim();
      
      // 3. Construir el comando final con las opciones de decodificación específicas
      // Las opciones del decodificador van ANTES de -i
      const command = `ffmpeg ${decoderOpts} -i "${videoPath}" -ss ${start} -t ${duration} -filter_complex "${filterComplex}" -map "[v]" -map 0:a? ${videoEncoderOpts} -c:a copy -avoid_negative_ts make_zero "${outputPath}" -y`;

      console.log(`Cortando segmento ${i + 1}/${viralSegments.length}: ${start}s-${end}s`);
      console.log("Ejecutando comando:", command);

      try {
        await execPromise(command);
        console.log(`Short generado: ${outputPath}`);
      } catch (cutError) {
        console.error(`Error al cortar segmento ${i + 1}:`, cutError.message);
      }
    }

    console.log("Todos los shorts han sido generados exitosamente");
  } catch (error) {
    console.error("Error al crear shorts:", error.message);
    throw error;
  }
}

module.exports = { createShorts };