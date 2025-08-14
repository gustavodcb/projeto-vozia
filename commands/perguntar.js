// commands/perguntar.js

const { buscarFalasRelevantes } = require('../database/dbManager.js');
const getEmbedding = require('../services/embeddingService.js');
const { gerarRespostaComIA } = require('../services/aiService.js');

module.exports = {
  name: 'perguntar',
  description: 'Faz uma pergunta sobre uma reunião específica.',
  async execute(message, args) {
    // 1. PARSE DO INPUT
    const idReuniao = args.shift(); // Pega o primeiro argumento, que deve ser o ID.
    const pergunta = args.join(' '); // Junta o resto para formar a pergunta.

    // 2. VALIDAÇÃO DO INPUT
    if (!idReuniao || isNaN(idReuniao) || !pergunta) {
      return message.reply('❓ Formato incorreto! Use: `!perguntar <ID da reunião> [sua pergunta]`.\nUse `!reunioes` para ver a lista de IDs.');
    }

    const feedbackMessage = await message.reply(`🔍 Entendido! Buscando na reunião **ID ${idReuniao}** uma resposta para: "${pergunta}"`);

    try {
      feedbackMessage.edit('🧠 Analisando sua pergunta...');
      const embeddingDaPergunta = await getEmbedding(pergunta);

      feedbackMessage.edit(`🗄️ Buscando no histórico da reunião ${idReuniao}...`);
      // 3. CHAMADA DA FUNÇÃO ATUALIZADA
      // Agora passamos o ID da reunião e o embedding.
      const contexto = await buscarFalasRelevantes(idReuniao, embeddingDaPergunta);

      if (contexto.length === 0) {
        return feedbackMessage.edit(`🤔 Não encontrei nenhuma informação sobre esse tópico na reunião **ID ${idReuniao}**.`);
      }

      feedbackMessage.edit('🤖 Formulando uma resposta inteligente...');
      const respostaFinal = await gerarRespostaComIA(pergunta, contexto);

      feedbackMessage.edit(`**Reunião ID ${idReuniao} | Pergunta:** ${pergunta}\n\n**Resposta:**\n${respostaFinal}`);

    } catch (error) {
      console.error('Erro ao processar a pergunta:', error);
      feedbackMessage.edit('❌ Ocorreu um erro crítico ao tentar encontrar a resposta. Verifique os logs.');
    }
  },
};