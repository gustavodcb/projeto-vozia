const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
  name: 'join',
  description: 'Faz o bot entrar no canal de voz do usuário.',
  async execute(message, args) {
    // Verifica se o autor está em um canal de voz
    const canalDeVoz = message.member.voice.channel;

    if (!canalDeVoz) {
      return message.reply('❌ Você precisa estar em um canal de voz primeiro.');
    }

    try {
      // Entra no canal de voz
      joinVoiceChannel({
        channelId: canalDeVoz.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      message.reply(`✅ Entrei no canal de voz: **${canalDeVoz.name}**`);
    } catch (err) {
      console.error(err);
      message.reply('❌ Ocorreu um erro ao tentar entrar no canal de voz.');
    }
  }
};