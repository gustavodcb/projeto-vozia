// services/transcriptionService.js

const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

// Inicializa o cliente do AssemblyAI com a sua chave de API
const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY,
});

/**
 * Transcreve um arquivo de áudio usando a API do AssemblyAI,
 * identificando os diferentes locutores.
 * @param {string} caminhoDoAudio O caminho para o arquivo de áudio local (ex: './recordings/audio.wav').
 * @returns {Promise<Array<{speaker: string, text: string}>>} Uma promessa que resolve para um array de "falas", 
 * onde cada fala é um objeto com o locutor e o texto.
 */
async function transcreverAudio(caminhoDoAudio) {
    console.log(`Iniciando transcrição para o arquivo: ${caminhoDoAudio}`);

    try {
        const transcript = await client.transcripts.transcribe({
            audio: caminhoDoAudio,
            // Esta é a configuração MÁGICA que você precisa!
            // Ela diz para a API identificar e rotular quem está falando.
            speaker_labels: true, 
        });

        // Verifica se a transcrição falhou
        if (transcript.status === 'error') {
            throw new Error(`Erro de transcrição da AssemblyAI: ${transcript.error}`);
        }
        
        // 'utterances' é a lista de falas separadas por locutor.
        // Se não houver 'utterances', significa que a diarização pode não ter funcionado
        // ou a gravação estava vazia. Retornamos um array vazio para evitar erros.
        if (!transcript.utterances) {
            console.warn("A transcrição foi concluída, mas não foram identificadas falas separadas por locutor.");
            // Podemos retornar a transcrição completa como uma única fala de um locutor desconhecido
            return [{ speaker: 'Desconhecido', text: transcript.text }];
        }
        
        console.log("Transcrição concluída com sucesso!");
        // Retornamos apenas os dados que nos interessam: o locutor (speaker) e o texto (text) de cada fala.
        return transcript.utterances.map(fala => ({
            speaker: `Speaker ${fala.speaker}`, // ex: 'Speaker A', 'Speaker B'
            text: fala.text
        }));

    } catch (error) {
        console.error("Ocorreu um erro no serviço de transcrição:", error);
        throw error; // Propaga o erro
    }
}

// Exporta a função para ser usada em outros lugares
module.exports = transcreverAudio;