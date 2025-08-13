const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');
const { pipeline } = require('stream');
const { activeRecordings } = require('../index.js'); // Importa o estado global
const { iniciarReuniao } = require('../database/dbManager.js'); // Importa a função do DB

module.exports = {
  name: 'record',
  description: 'Inicia uma nova gravação, registrando-a no banco de dados.',
  async execute(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ Você precisa estar em um canal de voz para iniciar uma gravação!');
    }

    // Verifica se já existe uma gravação ativa neste servidor
    if (activeRecordings.has(message.guild.id)) {
      return message.reply('⚠️ Uma gravação já está em andamento neste servidor.');
    }

    try {
      // --- 1. INTEGRAÇÃO COM O BANCO DE DADOS ---
      await message.reply('Iniciando uma nova reunião... Registrando participantes no banco de dados.');
      
      const participantes = voiceChannel.members.map(member => ({
        id: member.id,
        username: member.user.username,
      }));

      // Chama a função para criar a reunião e registrar quem está presente no início
      const tituloReuniao = `Reunião em ${voiceChannel.name} - ${new Date().toLocaleString()}`;
      const idReuniao = await iniciarReuniao(tituloReuniao, voiceChannel.name, participantes);
      
      await message.channel.send(`✅ Reunião registrada com ID: \`${idReuniao}\`. Iniciando gravação de áudio...`);

      // --- 2. LÓGICA DE GRAVAÇÃO (MODIFICADA) ---
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false, // O bot precisa "ouvir"
      });

      const receiver = connection.receiver;
      const recordingsDir = path.resolve(__dirname, '../recordings');
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

      const userStreams = new Map(); // Mapa para guardar os streams de cada usuário

      // Grava o áudio de cada participante em seu próprio arquivo PCM
      for (const [userId, member] of voiceChannel.members) {
        const opusStream = receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 200, // Um silêncio curto para não cortar o áudio no meio de frases
          },
        });

        // O nome do arquivo agora inclui o ID da reunião, para agruparmos depois
        const pcmPath = path.join(recordingsDir, `${idReuniao}-${userId}.pcm`);
        const outputStream = fs.createWriteStream(pcmPath, { flags: 'a' }); // 'a' para anexar, caso o usuário pare e volte a falar
        
        userStreams.set(userId, outputStream);

        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 }); // Usar MONO (channels: 1) para facilitar a mixagem

        pipeline(opusStream, decoder, outputStream, (err) => {
          if (err) console.error(`Erro no pipeline do usuário ${userId}:`, err);
        });
      }

      // --- 3. GERENCIAMENTO DE ESTADO ---
      activeRecordings.set(message.guild.id, {
        reuniaoId: idReuniao,
        connection: connection,
        userStreams: userStreams, // Guarda as referências dos streams para poder fechá-los
        participantes: participantes // Guarda quem estava na reunião
      });
      
      message.channel.send('🎙️ **Gravação iniciada!** Todos os participantes no canal estão sendo gravados. Use `!stop` para finalizar.');

    } catch (error) {
      console.error('Erro ao iniciar a gravação:', error);
      message.reply('❌ Ocorreu um erro crítico ao iniciar a gravação. Verifique os logs.');
      // Limpa o estado se a inicialização falhar
      if (activeRecordings.has(message.guild.id)) {
        activeRecordings.get(message.guild.id).connection.destroy();
        activeRecordings.delete(message.guild.id);
      }
    }
  },
};