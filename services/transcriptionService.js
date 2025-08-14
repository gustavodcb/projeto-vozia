// services/transcriptionService.js

const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

// Inicializa o cliente do AssemblyAI com a sua chave de API
const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
});

/**
 * Transcreve um arquivo de áudio usando a API do AssemblyAI.
 * Esta versão é otimizada para transcrever um arquivo com um único locutor.
 * @param {string} caminhoDoAudio O caminho para o arquivo de áudio local (ex: './recordings/audio.wav').
 * @returns {Promise<{text: string}>} Uma promessa que resolve para o objeto de transcrição, 
 * que contém a propriedade 'text' com a transcrição completa.
 */
async function transcreverAudio(caminhoDoAudio) {
    console.log(`Iniciando transcrição para o arquivo de um único locutor: ${caminhoDoAudio}`);

    try {
        // A chamada para a API foi simplificada. Removemos 'speaker_labels'.
        // Agora, só pedimos a transcrição direta do áudio.
        const transcript = await client.transcripts.transcribe({
            audio: caminhoDoAudio,
            language_code: 'pt',
        });

        // Verifica se a transcrição falhou
        if (transcript.status === 'error') {
            throw new Error(`Erro de transcrição da AssemblyAI: ${transcript.error}`);
        }
        
        // Se a transcrição for bem-sucedida, mas o texto estiver vazio, avisamos no console.
        if (!transcript.text) {
            console.warn(`Transcrição concluída para ${caminhoDoAudio}, mas nenhum texto foi detectado.`);
        } else {
            console.log(`Transcrição de ${caminhoDoAudio} concluída com sucesso!`);
        }
        
        // Retornamos o objeto de transcrição completo.
        // O arquivo `stop.js` irá acessar a propriedade `transcript.text`.
        return transcript;

    } catch (error) {
        console.error(`Ocorreu um erro no serviço de transcrição para o arquivo ${caminhoDoAudio}:`, error);
        throw error; // Propaga o erro para ser tratado no 'stop.js'
    }
}

// Exporta a função para ser usada em outros lugares
module.exports = transcreverAudio;