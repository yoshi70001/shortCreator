#!/usr/bin/env node

// Cargar variables de entorno
require("dotenv").config();

// Importar dependencias
const { program } = require("commander");
const fs = require("fs");
const path = require("path");

// Importar módulos locales
const { findViralSegments } = require("./modules/geminiAnalyzer");
const { createShorts } = require("./modules/videoCutter");

// --- Funciones de utilidad ---

/**
 * Busca archivos de video y subtítulos en el directorio de entrada.
 * @param {string} inputDir - Ruta al directorio de entrada.
 * @returns {Array<{videoPath: string, srtPath: string}>} Array de pares de rutas a los archivos.
 */
function findInputVideos(inputDir) {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`El directorio de entrada no existe: ${inputDir}`);
  }

  const files = fs.readdirSync(inputDir);
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv"];
  
  // Obtener solo los archivos de video
  const videoFiles = files.filter((f) =>
    videoExtensions.includes(path.extname(f).toLowerCase())
  );
  
  // Obtener solo los archivos SRT
  const srtFiles = files.filter((f) => path.extname(f).toLowerCase() === ".srt");

  if (videoFiles.length === 0) {
    throw new Error(`No se encontró ningún archivo de video en ${inputDir}`);
  }
  
  // Si no hay archivos SRT, lanzar error
  if (srtFiles.length === 0) {
    throw new Error(
      `No se encontró ningún archivo de subtítulos (.srt) en ${inputDir}`
    );
  }

  // Agrupar videos con sus archivos SRT correspondientes
  const videoSrtPairs = videoFiles.map(videoFile => {
    // Obtener el nombre base del video (sin extensión)
    const videoBaseName = path.basename(videoFile, path.extname(videoFile));
    
    // Buscar un archivo SRT que coincida con el nombre base del video
    const matchingSrt = srtFiles.find(srtFile => {
      const srtBaseName = path.basename(srtFile, path.extname(srtFile));
      return srtBaseName === videoBaseName;
    });
    
    // Si no se encuentra un SRT correspondiente, usar el primero disponible
    const srtFile = matchingSrt || srtFiles[0];
    
    return {
      videoPath: path.join(inputDir, videoFile),
      srtPath: path.join(inputDir, srtFile),
      videoName: videoBaseName
    };
  });

  return videoSrtPairs;
}

/**
 * Procesa videos en lotes con un límite paralelo
 * @param {Array<{videoPath: string, srtPath: string, videoName: string}>} videos - Array de videos a procesar
 * @param {number} parallelLimit - Número máximo de videos a procesar en paralelo
 * @param {string} outputFolder - Carpeta de salida para los shorts
 * @returns {Promise<void>}
 */
async function processVideosInBatches(videos, parallelLimit, outputFolder) {
  // Procesar videos en lotes
  for (let i = 0; i < videos.length; i += parallelLimit) {
    const batch = videos.slice(i, i + parallelLimit);
    console.log(`\nProcesando lote de videos ${i + 1}-${Math.min(i + parallelLimit, videos.length)} de ${videos.length}...`);
    
    // Crear promesas para procesar todos los videos del lote en paralelo
    const promises = batch.map(async ({ videoPath, srtPath, videoName }) => {
      try {
        console.log(`Procesando video: ${videoName}`);
        
        // Crear subdirectorio para los shorts de este video
        const videoOutputFolder = path.join(outputFolder, videoName);
        if (!fs.existsSync(videoOutputFolder)) {
          fs.mkdirSync(videoOutputFolder, { recursive: true });
        }
        
        // Leer y convertir subtítulos para Gemini
        console.log(`  - Procesando subtítulos para ${videoName}...`);
        const srtContent = fs.readFileSync(srtPath, "utf-8");
        const transcription = convertSrtToText(srtContent);

        // Analizar texto con Gemini para encontrar segmentos virales
        console.log(`  - Analizando texto con Gemini para ${videoName}...`);
        const viralSegments = await findViralSegments(transcription);

        // Crear shorts con subtítulos a partir de los segmentos virales
        console.log(`  - Creando shorts para ${videoName}...`);
        await createShorts(videoPath, viralSegments, videoOutputFolder, srtPath);
        
        console.log(`  - ¡Video ${videoName} procesado exitosamente!`);
      } catch (error) {
        console.error(`Error procesando video ${videoName}:`, error.message);
        // Continuar con otros videos aunque este falle
      }
    });
    
    // Esperar a que todos los videos del lote terminen de procesarse
    await Promise.all(promises);
  }
}

/**
 * Convierte contenido SRT a texto plano con marcas de tiempo.
 * @param {string} srtContent - Contenido del archivo SRT.
 * @returns {string} Texto con marcas de tiempo.
 */
function convertSrtToText(srtContent) {
  const blocks = srtContent
    .split("\n\n")
    .filter((block) => block.trim() !== "");
  const segments = blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);
        const startTime = timeLine.split(" --> ")[0];
        const timeInSeconds = convertTimeToSeconds(startTime);
        const text = textLines.join(" ");
        return `[${timeInSeconds}s] ${text}`;
      }
      return null;
    })
    .filter((segment) => segment !== null);
  return segments.join("\n");
}

/**
 * Convierte tiempo en formato hh:mm:ss,mmm a segundos.
 * @param {string} timeString - Tiempo en formato hh:mm:ss,mmm.
 * @returns {number} Tiempo en segundos.
 */
function convertTimeToSeconds(timeString) {
  const [timePart, millisecondsPart] = timeString.split(",");
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  const milliseconds = Number(millisecondsPart);
  return hours * 3600 + minutes * 60 + seconds + (milliseconds || 0) / 1000;
}

// --- Configuración de CLI ---

program
  .name("short-creator")
  .description(
    "CLI para crear shorts virales a partir de un video y subtítulos"
  )
  .version("1.0.1");

program
  .command("create")
  .description("Crea shorts virales desde la carpeta 'input_shorts'")
  .option("-p, --parallel-limit <number>", "Número máximo de videos a procesar en paralelo", 7)
  .action(async (options) => {
    try {
      console.log("Iniciando proceso de creación de shorts...");

      // Verificar que la API key de Gemini está configurada
      if (!process.env.GEMINI_API_KEY) {
        console.error(
          "Error: GEMINI_API_KEY no está configurada en el archivo .env"
        );
        process.exit(1);
      }

      // Crear rutas absolutas
      const inputFolder = path.resolve("./input_shorts");
      const outputFolder = path.resolve("./output_shorts");

      // Crear carpeta de salida si no existe
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      // 1. Encontrar todos los archivos de video y subtítulos
      console.log(`1. Buscando archivos en la carpeta '${inputFolder}'...`);
      const videos = findInputVideos(inputFolder);
      console.log(`   - Se encontraron ${videos.length} videos para procesar`);

      // 2. Procesar videos en lotes con límite paralelo
      console.log("2. Procesando videos en paralelo...");
      await processVideosInBatches(videos, parseInt(options.parallelLimit), outputFolder);

      console.log("¡Proceso completado! Shorts generados en:", outputFolder);
    } catch (error) {
      console.error("Error durante el proceso:", error.message);
      process.exit(1);
    }
  });

program.parse();
