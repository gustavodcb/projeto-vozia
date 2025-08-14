const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');
const { pipeline } = require('stream');
const { activeRecordings } = require('../index.js');
const { iniciarReuniao } = require('../database/dbManager.js');

module.exports = {
  name: 'record',
  description: 'Inicia uma nova gravação, registrando-a no banco de dados.',
  async execute(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ Você precisa estar em um canal de voz para iniciar uma gravação!');
    }

    if (activeRecordings.has(message.guild.id)) {
      return message.reply('⚠️ Uma gravação já está em andamento neste servidor.');
    }

    try {
      await message.reply('Iniciando uma nova reunião... Registrando participantes no banco de dados.');
      
      const participantes = voiceChannel.members
        .filter(member => !member.user.bot)
        .map(member => ({
          id: member.id,
          username: member.user.username,
        }));

      const tituloReuniao = `Reunião em ${voiceChannel.name} - ${new Date().toLocaleString()}`;
      const idReuniao = await iniciarReuniao(tituloReuniao, voiceChannel.name, participantes);
      
      await message.channel.send(`✅ Reunião registrada com ID: \`${idReuniao}\`. Iniciando gravação de áudio...`);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      const recordingsDir = path.resolve(__dirname, '../recordings');
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

      const userStreams = new Map();

      for (const member of voiceChannel.members.values()) {
        if (member.user.bot) {
          continue;
        }

        const userId = member.id;
        // ================== A MUDANÇA ESTÁ AQUI ==================
        const opusStream = connection.receiver.subscribe(userId, {
          end: {
            // Diz ao bot para NUNCA parar de gravar sozinho.
            // A gravação só vai parar quando o comando !stop for executado.
            behavior: EndBehaviorType.Never, 
          },
        });
        // ========================================================

        const pcmPath = path.join(recordingsDir, `${idReuniao}-${userId}.pcm`);
        const outputStream = fs.createWriteStream(pcmPath);
        
        userStreams.set(userId, outputStream);

        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });

        pipeline(opusStream, decoder, outputStream, (err) => {
          if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error(`Erro no pipeline do usuário ${userId}:`, err);
          }
        });
      }

      activeRecordings.set(message.guild.id, {
        reuniaoId: idReuniao,
        connection: connection,
        userStreams: userStreams,
        participantes: participantes,
        startTime: Date.now(),
      });
      
      message.channel.send('🎙️ **Gravação contínua iniciada!** Use `!stop` para finalizar.');

    } catch (error) {
      console.error('Erro ao iniciar a gravação:', error);
      message.reply('❌ Ocorreu um erro crítico ao iniciar a gravação. Verifique os logs.');
      if (activeRecordings.has(message.guild.id)) {
        activeRecordings.get(message.guild.id).connection.destroy();
        activeRecordings.delete(message.guild.id);
      }
    }
  },
};