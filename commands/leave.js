const { getVoiceConnection } = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Faz o Vozia sair da reunião.'),
  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply('❌ Não estou conectado em nenhum canal de voz aqui.');
    }

    connection.destroy();
    await interaction.reply('✅ Saí do canal de voz!');
  },
};