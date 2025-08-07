const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execPromise = promisify(exec);

/**
 * Crea shorts a partir de segmentos virales
 * @param {string} videoPath - Ruta al video original
 * @param {Array} viralSegments - Array de segmentos virales con tiempos
 * @param {string} outputFolder - Carpeta de salida para los shorts
 */
async function createShorts(videoPath, viralSegments, outputFolder) {
  try {
    // Verificar que el video existe
    if (!fs.existsSync(videoPath)) {
      throw new Error(`El video no existe: ${videoPath}`);
    }

    // Verificar que la carpeta de salida existe
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Procesar cada segmento viral
    for (let i = 0; i < viralSegments.length; i++) {
      const segment = viralSegments[i];
      const { start, end, emotion } = segment;

      // Calcular duración del segmento
      let duration = end - start;

      // Ajustar la duración para que esté entre 30 y 50 segundos
      duration = Math.min(Math.max(duration, 30), 50);

      // Crear nombre de archivo para el short
      const shortName = `short_${i + 1}_${emotion.replace("/", "-")}.mp4`;
      const outputPath = path.join(outputFolder, shortName);

      // Comando ffmpeg para cortar el segmento y ajustarlo al formato de YouTube Shorts (9:16)
      const command = `ffmpeg -i "${videoPath}" -ss ${start} -t ${duration} -vf "scale=-2:1920,crop=1080:1920" -c:v libx264 -preset fast -crf 23 -c:a copy -avoid_negative_ts make_zero "${outputPath}" -y`;

      console.log(
        `Cortando segmento ${i + 1}/${viralSegments.length}: ${start}s-${end}s`
      );
      console.log("Ejecutando comando:", command);

      try {
        const { stdout, stderr } = await execPromise(command);
        console.log(`Short generado: ${outputPath}`);
      } catch (cutError) {
        console.error(`Error al cortar segmento ${i + 1}:`, cutError.message);
        throw cutError;
      }
    }

    console.log("Todos los shorts han sido generados exitosamente");
  } catch (error) {
    console.error("Error al crear shorts:", error.message);
    throw error;
  }
}

module.exports = { createShorts };
