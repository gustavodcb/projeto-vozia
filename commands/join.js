const { SlashCommandBuilder } = require('@discordjs/builders');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Faz o Vozia entrar na reunião.'),
  async execute(interaction) {
    // Pega o canal de voz do membro que executou o comando através do objeto interaction
    const channel = interaction.member.voice.channel;

    // Verifica se o membro está em um canal de voz
    if (!channel) {
      // Responde à interação informando que o usuário precisa estar em um canal de voz
      return interaction.reply({ content: '❌ Você precisa estar em um canal de voz para usar este comando.', ephemeral: true });
    }

    try {
      // Tenta entrar no canal de voz
      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      // Responde à interação confirmando que o bot entrou no canal
      await interaction.reply('✅ Entrei no canal de voz!');
    } catch (error) {
      console.error(error);
      // Em caso de erro, informa ao usuário
      await interaction.reply({ content: '❌ Ocorreu um erro ao tentar entrar no canal de voz.', ephemeral: true });
    }
  }
};