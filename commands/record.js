const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');
const { pipeline } = require('stream');
const { activeRecordings } = require('../sharedState.js'); // Ajuste o caminho se necessário
const { iniciarReuniao } = require('../database/dbManager.js'); // Ajuste o caminho

module.exports = {
  // 1. Definição do comando de barra
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Inicia uma gravação de áudio da reunião.'),

  // 2. A função execute agora recebe 'interaction'
  async execute(interaction) {
    // 3. Obtém o canal de voz e o ID do servidor a partir da interação
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Você precisa estar em um canal de voz para iniciar uma gravação!', ephemeral: true });
    }

    if (activeRecordings.has(interaction.guild.id)) {
      return interaction.reply({ content: '⚠️ Uma gravação já está em andamento neste servidor.', ephemeral: true });
    }

    try {
      // 4. A primeira resposta usa interaction.reply() para confirmar o início do processo
      await interaction.reply('Iniciando uma nova reunião... Registrando participantes no banco de dados.');
      
      const participantes = voiceChannel.members
        .filter(member => !member.user.bot)
        .map(member => ({
          id: member.id,
          username: member.user.username,
        }));

      const tituloReuniao = `Reunião em ${voiceChannel.name} - ${new Date().toLocaleString()}`;
      const idReuniao = await iniciarReuniao(tituloReuniao, voiceChannel.name, participantes);
      
      // 5. Mensagens seguintes usam interaction.followUp()
      await interaction.followUp(`✅ Reunião registrada com ID: \`${idReuniao}\`. Iniciando gravação de áudio...`);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator, // <- vindo da interação
        selfDeaf: false,
      });

      const recordingsDir = path.resolve(__dirname, '../recordings');
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

      const userStreams = new Map();

      for (const member of voiceChannel.members.values()) {
        if (member.user.bot) continue;

        const userId = member.id;
        const opusStream = connection.receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.Never, 
          },
        });

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

      activeRecordings.set(interaction.guild.id, {
        reuniaoId: idReuniao,
        connection: connection,
        userStreams: userStreams,
        participantes: participantes,
        startTime: Date.now(),
      });
      
      // 5. Mensagens seguintes usam interaction.followUp()
      await interaction.followUp('🎙️ **Gravação contínua iniciada!** Use `/stop` para finalizar.');

    } catch (error) {
      console.error('Erro ao iniciar a gravação:', error);
      // Se a interação já foi respondida, edita a resposta original ou envia um follow-up com o erro.
      await interaction.followUp('❌ Ocorreu um erro crítico ao iniciar a gravação. Verifique os logs.');

      // Limpeza em caso de falha
      if (activeRecordings.has(interaction.guild.id)) {
        activeRecordings.get(interaction.guild.id).connection.destroy();
        activeRecordings.delete(interaction.guild.id);
      }
    }
  },
};