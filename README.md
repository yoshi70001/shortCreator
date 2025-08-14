# Short Creator

Aplicación CLI para crear shorts virales a partir de múltiples videos de películas, series o YouTube.

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

1. Coloca tus videos y archivos SRT en la carpeta `input_shorts/`
2. Ejecuta la aplicación:
   ```bash
   node index.js create
   ```
   
3. Opcionalmente, puedes especificar el número máximo de videos a procesar en paralelo (por defecto es 7):
   ```bash
   node index.js create --parallel-limit 3
   ```

## Estructura del Proyecto

- `input_shorts/`: Carpeta para videos de origen y sus archivos SRT
- `output_shorts/`: Carpeta para shorts generados (organizados en subdirectorios por video)
- `temp/`: Carpeta para archivos temporales
- `modules/`: Módulos con funcionalidades específicas
  - `geminiAnalyzer.js`: Analiza texto para encontrar segmentos virales
  - `videoCutter.js`: Corta videos en segmentos

## ¿Cómo Funciona?

1. **Búsqueda de videos**: Busca todos los videos y archivos SRT en la carpeta `input_shorts/`
2. **Procesamiento en paralelo**: Procesa múltiples videos simultáneamente (máximo 7 por defecto)
3. **Transcripción**: Utiliza faster-whisper para convertir el audio a texto con marcas de tiempo
4. **Análisis emocional**: Envía el texto a Gemini AI para identificar segmentos con alto contenido emocional (duración de 30-50 segundos)
5. **Generación de shorts**: Usa ffmpeg para cortar los segmentos identificados en videos cortos con formato vertical (9:16) adecuado para YouTube Shorts

## Licencia

MIT
