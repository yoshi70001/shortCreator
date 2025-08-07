const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

/**
 * Transcribe audio a texto usando faster-whisper
 * @param {string} audioPath - Ruta al archivo de audio
 * @returns {Promise<string>} Texto transcrito con marcas de tiempo
 */
async function transcribeAudio(audioPath) {
  try {
    // Verificar que el archivo de audio existe
    if (!fs.existsSync(audioPath)) {
      throw new Error(`El archivo de audio no existe: ${audioPath}`);
    }
    
    // Ruta para el archivo de subtítulos de salida
    const srtPath = audioPath.replace(path.extname(audioPath), '.srt');
    
    // Comando para faster-whisper (asumiendo que está instalado y en el PATH)
    // Usamos el modelo "xxl" como mencionó el usuario
    const command = `faster-whisper-xxl.exe --model large-v3-turbo "${audioPath}"`;
    
    console.log('Ejecutando comando:', command);
    const { stdout, stderr } = await execPromise(command);
    
    // Leer el archivo SRT generado
    if (!fs.existsSync(srtPath)) {
      throw new Error('No se generó el archivo de subtítulos');
    }
    
    const srtContent = fs.readFileSync(srtPath, 'utf-8');
    
    // Convertir SRT a texto plano con marcas de tiempo
    const transcription = convertSrtToText(srtContent);
    
    console.log('Audio transcrito exitosamente');
    return transcription;
  } catch (error) {
    console.error('Error al transcribir audio:', error.message);
    throw error;
  }
}

/**
 * Convierte contenido SRT a texto plano con marcas de tiempo
 * @param {string} srtContent - Contenido del archivo SRT
 * @returns {string} Texto con marcas de tiempo
 */
function convertSrtToText(srtContent) {
  // Dividir el contenido SRT en bloques
  const blocks = srtContent.split('\n\n').filter(block => block.trim() !== '');
  
  // Procesar cada bloque para extraer tiempo y texto
  const segments = blocks.map(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // La primera línea es el número del subtítulo (ignoramos)
      // La segunda línea contiene los tiempos
      const timeLine = lines[1];
      // Las líneas restantes contienen el texto
      const textLines = lines.slice(2);
      
      // Extraer tiempo de inicio (formato hh:mm:ss,mmm --> hh:mm:ss,mmm)
      const startTime = timeLine.split(' --> ')[0];
      
      // Convertir tiempo a segundos
      const timeInSeconds = convertTimeToSeconds(startTime);
      
      // Unir las líneas de texto
      const text = textLines.join(' ');
      
      return {
        time: timeInSeconds,
        text: text
      };
    }
    return null;
  }).filter(segment => segment !== null);
  
  // Convertir segmentos a texto con marcas de tiempo
  return segments.map(segment => `[${segment.time}s] ${segment.text}`).join('\n');
}

/**
 * Convierte tiempo en formato hh:mm:ss,mmm a segundos
 * @param {string} timeString - Tiempo en formato hh:mm:ss,mmm
 * @returns {number} Tiempo en segundos
 */
function convertTimeToSeconds(timeString) {
  const [timePart, millisecondsPart] = timeString.split(',');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const milliseconds = Number(millisecondsPart);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

module.exports = { transcribeAudio };
