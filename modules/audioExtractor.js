const { exec } = require("child_process");
const { promisify } = require("util");

const execPromise = promisify(exec);

/**
 * Extrae el audio de un video usando ffmpeg
 * @param {string} videoPath - Ruta al video de origen
 * @param {string} audioPath - Ruta donde se guardará el audio extraído
 */
async function extractAudio(videoPath, audioPath) {
  try {
    // Comando ffmpeg para extraer audio manteniendo el codec original
    const command = `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`;

    console.log("Ejecutando comando:", command);
    const { stdout, stderr } = await execPromise(command);

    console.log("Audio extraído exitosamente a:", audioPath);
    return audioPath;
  } catch (error) {
    console.error("Error al extraer audio:", error.message);
    throw error;
  }
}

module.exports = { extractAudio };
