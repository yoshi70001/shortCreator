const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
// Inicializar el cliente de Gemini con la API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Modelo a usar (puedes cambiarlo según tus preferencias)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

/**
 * Analiza la transcripción para encontrar segmentos virales basados en emociones
 * @param {string} transcription - Texto transcrito con marcas de tiempo
 * @returns {Promise<Array>} Array de segmentos virales con tiempos de inicio y fin
 */
async function findViralSegments(transcription) {
  try {
    // Prompt para Gemini solicitando identificación de segmentos emocionales virales
    const prompt = `
    Analiza la siguiente transcripción de video y encuentra segmentos que tengan alto potencial de volverse virales debido a su contenido emocional.
    
    La transcripción contiene líneas con el formato "[tiempo en segundos] texto".
    
    Identifica hasta 5 segmentos virales y devuelve únicamente una lista en formato JSON con esta estructura:
    [
      {
        "start": 0,
        "end": 35,
        "text": "texto del segmento",
        "emotion": "tipo de emoción"
      }
    ]
    
    Cada segmento debe tener una duración mínima de 30 segundos y máxima de 50 segundos (end - start).
    No incluyas ningún otro texto en tu respuesta, solo el JSON.
    
    Transcripción:
    ${transcription}
    `;

    console.log("Enviando transcripción a Gemini para análisis...");

    // Generar contenido con Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.debug("Respuesta de Gemini:", text);
    // Extraer el JSON de la respuesta
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]") + 1;
    const jsonString = text.substring(jsonStart, jsonEnd);

    // Parsear el JSON
    const viralSegments = JSON.parse(jsonString);

    console.log("Segmentos virales identificados:", viralSegments.length);
    fs.writeFileSync(
      "viral_segments.json",
      JSON.stringify(viralSegments, null, 2)
    );
    return viralSegments;
  } catch (error) {
    console.error("Error al analizar con Gemini:", error.message);
    throw error;
  }
}

module.exports = { findViralSegments };
