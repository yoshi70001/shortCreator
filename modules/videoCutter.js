const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execPromise = promisify(exec);

/**
 * Crea shorts a partir de segmentos virales, quemando el SRT original.
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
      const shortName = `short_${i + 1}_${emotion.replace(/[\\/:"*?<>|]/g, "-")}.mp4`;
      const outputPath = path.join(outputFolder, shortName);

      // Escapar la ruta del archivo SRT para el filtro de ffmpeg
      // Es importante para manejar rutas de Windows (con '\') y caracteres especiales.
      const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

      // Definir los filtros de video para ffmpeg
      // 1. Recortar a 9:16
      const cropFilter = "scale=-2:1920,crop=1080:1920";
      // 2. Incrustar subtítulos desde el archivo SRT original
      const subtitlesFilter = `subtitles='${escapedSrtPath}'`;

      // Comando ffmpeg final
      const command = `ffmpeg -i "${videoPath}" -ss ${start} -t ${duration} -vf "${cropFilter},${subtitlesFilter}" -c:v libx264 -preset fast -crf 23 -c:a copy -avoid_negative_ts make_zero "${outputPath}" -y`;

      console.log(`Cortando segmento ${i + 1}/${viralSegments.length}: ${start}s-${end}s`);
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
