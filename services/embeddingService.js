// services/embeddingService.js

// Importa a biblioteca da OpenAI
const OpenAI = require('openai');

// Carrega as variáveis de ambiente (como a sua chave da API) do arquivo .env
require('dotenv').config();

// Inicializa o cliente da OpenAI com a sua chave de API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera um vetor de embedding para um determinado texto usando a API da OpenAI.
 * @param {string} text O texto de entrada para o qual o embedding será gerado.
 * @returns {Promise<number[]>} Uma promessa que resolve para um array de números (o vetor de embedding).
 */
async function getEmbedding(text) {
    // Verifica se o texto de entrada não está vazio
    if (!text || typeof text !== 'string') {
        throw new Error("O texto de entrada não pode ser vazio e deve ser uma string.");
    }
    
    try {
        // Faz a chamada para a API de embeddings da OpenAI
        const response = await openai.embeddings.create({
            // Modelo recomendado: é poderoso, rápido e com o melhor custo-benefício atualmente.
            model: "text-embedding-3-small", 
            input: text,
        });

        // O resultado que nos interessa está em response.data[0].embedding
        const embeddingVector = response.data[0].embedding;
        
        return embeddingVector;

    } catch (error) {
        console.error("Erro ao gerar o embedding da OpenAI:", error);
        // Propaga o erro para que a função que chamou saiba que algo deu errado
        throw new Error("Falha ao gerar o embedding.");
    }
}

// Exporta a função para que ela possa ser usada em outros arquivos (como no seu database/dbManager.js)
module.exports = getEmbedding;