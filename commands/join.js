const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
  name: 'join',
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