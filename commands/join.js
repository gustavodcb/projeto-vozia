const { joinVoiceChannel } = require('@discordjs/voice');
const { description } = require('./stop');

module.exports = {
  name: 'join',
  description: 'Faz o bot entrar no canal de voz.',
  execute(message) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('❌ Você precisa estar em um canal de voz.');

    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    message.reply('✅ Entrei no canal de voz!');
  }
};