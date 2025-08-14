// services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializa o cliente do Gemini com sua chave de API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Ou GOOGLE_API_KEY, dependendo de como está no seu .env

/**
 * Gera uma resposta para uma pergunta usando o Gemini.
 * @param {string} pergunta A pergunta original do usuário.
 * @param {Array<{username: string, texto_fala: string}>} contexto Uma lista de falas relevantes.
 * @returns {Promise<string>} A resposta gerada pela IA.
 */
async function gerarRespostaComIA(pergunta, contexto) {
    
    // ================== A CORREÇÃO ESTÁ AQUI ==================
    // Usamos um modelo mais recente e recomendado pelo Google.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    // ==========================================================

    const contextoFormatado = contexto
        .map(fala => `[${fala.username}]: "${fala.texto_fala}"`)
        .join('\n');
    
    const prompt = `
        Você é o Vozia, um assistente de IA especialista em resumir atas de reuniões.
        Sua tarefa é responder à pergunta do usuário baseando-se ESTA ESTRITAMENTE no contexto da reunião fornecido abaixo.
        Se a resposta não estiver no contexto, diga educadamente que não encontrou essa informação na discussão.

        CONTEXTO DA REUNIÃO:
        ---
        ${contextoFormatado}
        ---

        PERGUNTA DO USUÁRIO: "${pergunta}"

        Resposta:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro ao gerar resposta com o Gemini:", error);
        throw new Error("Não foi possível gerar uma resposta no momento.");
    }
}

module.exports = { gerarRespostaComIA };