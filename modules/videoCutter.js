const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execPromise = promisify(exec);

/**
 * Crea shorts a partir de segmentos virales, quemando el SRT original con fondo desenfocado.
 * @param {string} videoPath - Ruta al video original.
 * @param {Array} viralSegments - Array de segmentos virales con tiempos.
 * @param {string} outputFolder - Carpeta de salida para los shorts.
 * @param {string} srtPath - Ruta al archivo de subtítulos SRT original.
 */
async function createShorts(videoPath, viralSegments, outputFolder, srtPath) {
  try {
    // Verificaciones iniciales
    if (!fs.existsSync(videoPath)) {
      throw new Error(`El video no existe: ${videoPath}`);
    }
    if (!fs.existsSync(srtPath)) {
      throw new Error(`El archivo de subtítulos no existe: ${srtPath}`);
    }
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Procesar cada segmento viral
    for (let i = 0; i < viralSegments.length; i++) {
      const segment = viralSegments[i];
      const { start, end, emotion } = segment;

      // Calcular duración del segmento
      const duration = Math.min(Math.max(end - start, 30), 50);

      // Crear nombre de archivo para el short
      const shortName = `short_${i + 1}_${emotion.replace(
        /[\\/:"*?<>|]/g,
        "-"
      )}.mp4`;
      const outputPath = path.join(outputFolder, shortName);

      // Escapar la ruta del archivo SRT para el filtro de ffmpeg
      const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

      // --- INICIO DE CAMBIOS ---

      // Definir el filtro complejo para:
      // 1. [bg] Crear fondo vertical (1080x1920) escalado, recortado y desenfocado.
      // 2. [main] Escalar video original a 1080p de alto, recortarlo a 1080x1080 y LUEGO quemar subtítulos.
      // 3. Superponer el video [main] centrado sobre el fondo [bg].
      const filterComplex = `
        [0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=10[bg];
        [0:v]scale=-2:1080,crop=1080:1080,subtitles='${escapedSrtPath}':force_style='Alignment=2'[main];
        [bg][main]overlay=(W-w)/2:(H-h)/2[v]
      `
        .replace(/\s+/g, " ")
        .trim();

      // Comando ffmpeg final con mapeo de video [v] y de audio 0:a?
      const command = `ffmpeg -i "${videoPath}" -ss ${start} -t ${duration} -filter_complex "${filterComplex}" -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 23 -c:a copy -avoid_negative_ts make_zero "${outputPath}" -y`;

      // --- FIN DE CAMBIOS ---

      console.log(
        `Cortando segmento ${i + 1}/${viralSegments.length}: ${start}s-${end}s`
      );
      console.log("Ejecutando comando:", command);

      try {
        await execPromise(command);
        console.log(`Short generado: ${outputPath}`);
      } catch (cutError) {
        console.error(`Error al cortar segmento ${i + 1}:`, cutError.message);
        // Continuar con el siguiente segmento aunque uno falle
      }
    }

    console.log("Todos los shorts han sido generados exitosamente");
  } catch (error) {
    console.error("Error al crear shorts:", error.message);
    throw error;
  }
}

module.exports = { createShorts };
