# Short Creator

Aplicación CLI para crear shorts virales a partir de videos de películas, series o YouTube.

## Descripción

Esta aplicación automatiza el proceso de creación de contenido viral para redes sociales a partir de videos largos. Utiliza las siguientes tecnologías:

- **ffmpeg**: Para extraer audio y cortar segmentos de video
- **faster-whisper**: Para transcribir el audio a texto
- **Gemini AI**: Para analizar el contenido emocional y determinar qué segmentos tienen mayor potencial de volverse virales

## Requisitos Previos

Antes de usar esta aplicación, asegúrate de tener instalado:

1. **Node.js** (versión 14 o superior)
2. **ffmpeg** - Debe estar agregado al PATH del sistema
3. **faster-whisper** - Debe estar instalado y agregado al PATH del sistema

## Instalación

1. Clona este repositorio o descarga los archivos
2. Navega a la carpeta del proyecto
3. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```

## Configuración

1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega tu API key de Gemini:
   ```
   GEMINI_API_KEY=tu_api_key_aqui
   ```

## Uso

1. Coloca tu video en la carpeta `input_videos/`
2. Ejecuta la aplicación con la ruta al video:
   ```bash
   node index.js create "ruta/al/video.mp4"
   ```
   
3. Opcionalmente, puedes especificar carpetas de salida y temporales:
   ```bash
   node index.js create "ruta/al/video.mp4" -o "ruta/salida" -t "ruta/temp"
   ```

## Estructura del Proyecto

- `input_videos/`: Carpeta para videos de origen
- `output_shorts/`: Carpeta para shorts generados
- `temp/`: Carpeta para archivos temporales
- `modules/`: Módulos con funcionalidades específicas
  - `audioExtractor.js`: Extrae audio de videos
  - `transcriber.js`: Transcribe audio a texto
  - `geminiAnalyzer.js`: Analiza texto para encontrar segmentos virales
  - `videoCutter.js`: Corta videos en segmentos

## ¿Cómo Funciona?

1. **Extracción de audio**: Usa ffmpeg para extraer el audio del video de origen manteniendo el codec original
2. **Transcripción**: Utiliza faster-whisper para convertir el audio a texto con marcas de tiempo
3. **Análisis emocional**: Envía el texto a Gemini AI para identificar segmentos con alto contenido emocional (duración de 30-50 segundos)
4. **Generación de shorts**: Usa ffmpeg para cortar los segmentos identificados en videos cortos con formato vertical (9:16) adecuado para YouTube Shorts

## Licencia

MIT
