// commands/perguntar.js

const { SlashCommandBuilder } = require('discord.js');
const { buscarFalasRelevantes } = require('../database/dbManager.js'); // Ajuste o caminho
const getEmbedding = require('../services/embeddingService.js'); // Ajuste o caminho
const { gerarRespostaComIA } = require('../services/aiService.js'); // Ajuste o caminho

module.exports = {
  // 1. Definição do comando de barra com opções
  data: new SlashCommandBuilder()
    .setName('perguntar')
    .setDescription('Faz uma pergunta sobre uma reunião específica.')
    .addIntegerOption(option => 
      option.setName('id')
        .setDescription('O ID da reunião para consultar.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('pergunta')
        .setDescription('A pergunta que você quer fazer sobre a reunião.')
        .setRequired(true)),

  // 2. A função execute agora recebe 'interaction'
  async execute(interaction) {
    // 3. Obtenção dos argumentos através das opções
    const idReuniao = interaction.options.getInteger('id');
    const pergunta = interaction.options.getString('pergunta');

    // A validação de formato é feita automaticamente pela API do Discord
    // graças a .setRequired(true) e addIntegerOption.

    // 4. A primeira resposta usa interaction.reply()
    await interaction.reply(`🔍 Entendido! Buscando na reunião **ID ${idReuniao}** uma resposta para: "${pergunta}"`);

    try {
      // 5. As atualizações subsequentes usam interaction.editReply()
      await interaction.editReply('🧠 Analisando sua pergunta...');
      const embeddingDaPergunta = await getEmbedding(pergunta);

      await interaction.editReply(`🗄️ Buscando no histórico da reunião ${idReuniao}...`);
      const contexto = await buscarFalasRelevantes(idReuniao, embeddingDaPergunta);

      if (contexto.length === 0) {
        return interaction.editReply(`🤔 Não encontrei nenhuma informação sobre esse tópico na reunião **ID ${idReuniao}**.`);
      }

      await interaction.editReply('🤖 Formulando uma resposta inteligente...');
      const respostaFinal = await gerarRespostaComIA(pergunta, contexto);

      // 5. A resposta final também usa editReply para atualizar a mensagem inicial
      await interaction.editReply(`**Reunião ID ${idReuniao} | Pergunta:** ${pergunta}\n\n**Resposta:**\n${respostaFinal}`);

    } catch (error) {
      console.error('Erro ao processar a pergunta:', error);
      // 5. A mensagem de erro também atualiza a mensagem inicial
      await interaction.editReply('❌ Ocorreu um erro crítico ao tentar encontrar a resposta. Verifique os logs.');
    }
  },
};