const { joinVoiceChannel, createAudioResource, EndBehaviorType, createAudioPlayer, getVoiceConnection, createAudioReceiver } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');
const { pipeline } = require('stream');

module.exports = {
  name: 'record',
  description: 'Grava áudio da call',
  async execute(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('Você precisa estar em um canal de voz!');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const receiver = connection.receiver;
    message.reply('🎙️ Gravando o áudio dos usuários... Use `!stop` para finalizar.');

    const recordingsDir = path.resolve(__dirname, '../recordings');
    if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

    const recordedUsers = new Set();

    receiver.speaking.on('start', (userId) => {
      if (recordedUsers.has(userId)) return;
      recordedUsers.add(userId);
      console.log(`Começou a falar: ${userId}`);

      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000,
        },
      });

      const pcmPath = path.join(recordingsDir, `${userId}-${Date.now()}.pcm`);
      const outputStream = fs.createWriteStream(pcmPath);
      const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      pipeline(opusStream, decoder, outputStream, (err) => {
        if (err) console.error('Erro no pipeline:', err);
        else console.log(`✅ Áudio salvo: ${pcmPath}`);
      });
    });
  },
};
