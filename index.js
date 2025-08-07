#!/usr/bin/env node

// Cargar variables de entorno
require("dotenv").config();

// Importar dependencias
const { program } = require("commander");
const fs = require("fs");
const path = require("path");

// Importar módulos locales
const { extractAudio } = require("./modules/audioExtractor");
const { transcribeAudio } = require("./modules/transcriber");
const { findViralSegments } = require("./modules/geminiAnalyzer");
const { createShorts } = require("./modules/videoCutter");

// Configurar CLI
program
  .name("short-creator")
  .description("CLI para crear shorts virales a partir de videos")
  .version("1.0.0");

program
  .command("create")
  .description("Crear shorts virales a partir de un video")
  .argument("<videoPath>", "ruta al video de origen")
  .option(
    "-o, --output <folder>",
    "carpeta de salida para los shorts",
    "output_shorts"
  )
  .option(
    "-t, --temp <folder>",
    "carpeta temporal para archivos intermedios",
    "temp"
  )
  .action(async (videoPath, options) => {
    try {
      console.log("Iniciando proceso de creación de shorts...");

      // Verificar que el video existe
      if (!fs.existsSync(videoPath)) {
        console.error("Error: El video no existe en la ruta especificada");
        process.exit(1);
      }

      // Verificar que la API key de Gemini está configurada
      if (!process.env.GEMINI_API_KEY) {
        console.error(
          "Error: GEMINI_API_KEY no está configurada en el archivo .env"
        );
        process.exit(1);
      }

      // Crear rutas absolutas para las carpetas
      const outputFolder = path.resolve(options.output);
      const tempFolder = path.resolve(options.temp);

      // Crear carpetas si no existen
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }

      // 1. Extraer audio del video
      console.log("1. Extrayendo audio del video...");
      const audioPath = path.join(tempFolder, "extracted_audio.mp3");
      await extractAudio(videoPath, audioPath);

      // 2. Transcribir audio a texto
      console.log("2. Transcribiendo audio a texto...");
      const transcription = await transcribeAudio(audioPath);

      // 3. Analizar texto con Gemini para encontrar segmentos virales
      console.log("3. Analizando texto con Gemini...");
      let viralSegments = await findViralSegments(transcription);
      fs.writeFileSync(
        "./temp/virals.json",
        JSON.stringify(viralSegments, null, 2)
      );
      viralSegments = JSON.parse(
        fs.readFileSync("./temp/virals.json", { encoding: "utf-8" })
      );
      // 4. Crear shorts a partir de los segmentos virales
      console.log("4. Creando shorts...");
      await createShorts(videoPath, viralSegments, outputFolder);

      console.log("¡Proceso completado! Shorts generados en:", outputFolder);
    } catch (error) {
      console.error("Error durante el proceso:", error.message);
      process.exit(1);
    }
  });

program.parse();
