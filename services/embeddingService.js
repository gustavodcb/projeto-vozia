// services/embeddingService.js

// 1. Importa a biblioteca do Google
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 2. Pega a chave de API do seu arquivo .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gera um vetor de embedding para um texto usando a API do Google (modelo Gemini).
 * @param {string} text O texto de entrada para o qual o embedding será gerado.
 * @returns {Promise<number[]>} Uma promessa que resolve para o vetor de embedding.
 */
async function getEmbedding(text) {
  if (!text) {
    throw new Error("O texto de entrada não pode ser vazio.");
  }

  try {
    // 3. Seleciona o modelo de embedding do Google. 'text-embedding-004' é o mais recente.
    const model = genAI.getGenerativeModel({ model: "text-embedding-004"});

    // 4. Faz a chamada para a API para gerar o embedding
    const result = await model.embedContent(text);
    
    // 5. Extrai o vetor de números da resposta
    const embedding = result.embedding;
    return embedding.values;

  } catch (error) {
    console.error("Erro ao conectar com a API do Google AI:", error);
    // Adiciona uma mensagem de erro mais clara
    if (error.message.includes('API key not valid')) {
      throw new Error("Falha ao gerar embedding: A chave da API do Google é inválida ou não foi encontrada. Verifique o arquivo .env.");
    }
    throw new Error("Falha ao gerar embedding com a API do Google.");
  }
}

module.exports = getEmbedding;