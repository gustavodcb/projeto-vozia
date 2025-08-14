// commands/perguntar.js

// Importando todas as nossas ferramentas
const { buscarFalasRelevantes } = require('../database/dbManager.js');
// MUDANÇA 1: Importamos sua função 'getEmbedding' diretamente, sem chaves {}.
const getEmbedding = require('../services/embeddingService.js');
const { gerarRespostaComIA } = require('../services/aiService.js');

module.exports = {
  name: 'perguntar',
  description: 'Faz uma pergunta sobre as reuniões gravadas.',
  async execute(message, args) {
    const pergunta = args.join(' ');

    if (!pergunta) {
      return message.reply('❓ Por favor, faça uma pergunta após o comando! Ex: `!perguntar Qual o prazo do projeto?`');
    }

    const feedbackMessage = await message.reply(`🔍 Entendido! Buscando uma resposta para: "${pergunta}"`);

    try {
      // ETAPA 1: Transformar a pergunta em embedding.
      feedbackMessage.edit('🧠 Analisando sua pergunta...');
      // MUDANÇA 2: Usamos o nome correto da sua função: getEmbedding.
      const embeddingDaPergunta = await getEmbedding(pergunta);

      // ETAPA 2: Buscar falas relevantes no banco de dados.
      feedbackMessage.edit('🗄️ Buscando no histórico de conversas...');
      const contexto = await buscarFalasRelevantes(embeddingDaPergunta);

      if (contexto.length === 0) {
        return feedbackMessage.edit('🤔 Não encontrei nenhuma informação relevante sobre esse tópico nas gravações.');
      }

      // ETAPA 3: Gerar uma resposta com IA usando o contexto.
      feedbackMessage.edit('🤖 Formulando uma resposta inteligente...');
      const respostaFinal = await gerarRespostaComIA(pergunta, contexto);

      // ETAPA 4: Enviar a resposta final.
      feedbackMessage.edit(`**Pergunta:** ${pergunta}\n\n**Resposta:**\n${respostaFinal}`);

    } catch (error) {
      console.error('Erro ao processar a pergunta:', error);
      feedbackMessage.edit('❌ Ocorreu um erro crítico ao tentar encontrar a resposta. Verifique os logs.');
    }
  },
};