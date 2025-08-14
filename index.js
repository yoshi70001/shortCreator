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
 * @returns {{videoPath: string, srtPath: string}} Rutas a los archivos.
 */
function findInputFiles(inputDir) {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`El directorio de entrada no existe: ${inputDir}`);
  }

  const files = fs.readdirSync(inputDir);
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv"];

  const videoFile = files.find((f) =>
    videoExtensions.includes(path.extname(f).toLowerCase())
  );
  const srtFile = files.find((f) => path.extname(f).toLowerCase() === ".srt");

  if (!videoFile) {
    throw new Error(`No se encontró ningún archivo de video en ${inputDir}`);
  }
  if (!srtFile) {
    throw new Error(
      `No se encontró ningún archivo de subtítulos (.srt) en ${inputDir}`
    );
  }

  return {
    videoPath: path.join(inputDir, videoFile),
    srtPath: path.join(inputDir, srtFile),
  };
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
  .description("Crea shorts virales desde la carpeta 'input'")
  // .option("-i, --input <folder>", "Carpeta de entrada con video y SRT", "input")
  // .option("-o, --output <folder>", "Carpeta de salida para los shorts", "output_shorts")
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

      // 1. Encontrar archivos de video y subtítulos
      console.log(`1. Buscando archivos en la carpeta '${inputFolder}'...`);
      const { videoPath, srtPath } = findInputFiles(inputFolder);
      console.log(`   - Video encontrado: ${videoPath}`);
      console.log(`   - Subtítulos encontrados: ${srtPath}`);

      // 2. Leer y convertir subtítulos para Gemini
      console.log("2. Procesando archivo de subtítulos...");
      const srtContent = fs.readFileSync(srtPath, "utf-8");
      const transcription = convertSrtToText(srtContent);

      // 3. Analizar texto con Gemini para encontrar segmentos virales
      console.log("3. Analizando texto con Gemini...");
      const viralSegments = await findViralSegments(transcription);

      // Guardar segmentos para depuración (opcional)
      const tempFolder = path.resolve("temp");
      if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);
      fs.writeFileSync(
        path.join(tempFolder, "virals.json"),
        JSON.stringify(viralSegments, null, 2)
      );
      // const viralSegments = JSON.parse(
      //   fs.readFileSync("./temp/virals.json", {
      //     encoding: "utf-8",
      //   })
      // );
      // 4. Crear shorts con subtítulos a partir de los segmentos virales
      console.log("4. Creando shorts con subtítulos...");
      await createShorts(videoPath, viralSegments, outputFolder, srtPath);

      console.log("¡Proceso completado! Shorts generados en:", outputFolder);
    } catch (error) {
      console.error("Error durante el proceso:", error.message);
      process.exit(1);
    }
  });

program.parse();
