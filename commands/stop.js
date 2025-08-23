const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { activeRecordings } = require('../sharedState.js'); // Ajuste o caminho se necessário
const transcreverAudio = require('../services/transcriptionService.js'); // Ajuste o caminho
const { salvarFala, finalizarReuniao } = require('../database/dbManager.js'); // Ajuste o caminho

// Converte a função exec baseada em callback para uma baseada em Promises
const execPromise = util.promisify(exec);

module.exports = {
  // 1. Definição do comando de barra
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Finaliza a gravação e salva a reunião.'),
  
  // 2. A função execute agora recebe 'interaction'
  async execute(interaction) {
    // 3. Acessa o ID do servidor através da interação
    const gravacaoAtiva = activeRecordings.get(interaction.guild.id);
    if (!gravacaoAtiva) {
      return interaction.reply({ content: '❌ Nenhuma gravação ativa encontrada para este servidor.', ephemeral: true });
    }

    // 4. A primeira resposta usa interaction.reply()
    // É importante responder rapidamente para o Discord não invalidar a interação.
    await interaction.reply('▶️ Gravação parada. Iniciando processamento... Isso pode levar alguns minutos.');

    const { reuniaoId, connection, userStreams, startTime } = gravacaoAtiva;
    const recordingsDir = path.resolve(__dirname, '../recordings');
    
    // Encerra os streams de arquivo e a conexão de voz
    userStreams.forEach(stream => stream.end());
    if (connection) {
        connection.destroy();
    }
    
    try {
      const endTime = Date.now();
      const duracaoEmSegundos = Math.round((endTime - startTime) / 1000);
      await finalizarReuniao(reuniaoId, duracaoEmSegundos);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const allPcmFiles = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`) && file.endsWith('.pcm'));
      
      const pcmFilesComConteudo = allPcmFiles.filter(file => {
          const stats = fsSync.statSync(path.join(recordingsDir, file));
          return stats.size > 4096;
      });

      if (pcmFilesComConteudo.length === 0) {
        throw new Error('Nenhum áudio com conteúdo gravado.');
      }
      
      // 5. Mensagens subsequentes usam interaction.followUp()
      await interaction.followUp(`🗣️ Encontrado áudio de ${pcmFilesComConteudo.length} participante(s). Iniciando transcrições...`);

      const processamentoPromises = pcmFilesComConteudo.map(async (pcmFile) => {
        const pcmPath = path.join(recordingsDir, pcmFile);
        const wavPath = pcmPath.replace('.pcm', '.wav');
        const userId = pcmFile.split('-')[1].split('.')[0];

        try {
          const ffmpegCmd = `ffmpeg -y -f s16le -ar 48000 -ac 1 -i "${pcmPath}" "${wavPath}"`;
          await execPromise(ffmpegCmd);
          
          const resultadoTranscricao = await transcreverAudio(wavPath);
          const textoTranscribed = resultadoTranscricao.text;

          console.log(`[DEBUG] Transcrição para ${userId}: "${textoTranscribed}"`); 

          if (textoTranscribed && textoTranscribed.trim().length > 0) {
            await salvarFala(reuniaoId, userId, textoTranscribed);
            return 1;
          }
          return 0;
        } catch (err) {
            console.error(`Erro ao processar o arquivo para o usuário ${userId}:`, err);
            return 0;
        }
      });

      const resultados = await Promise.all(processamentoPromises);
      const totalFalasSalvas = resultados.reduce((sum, current) => sum + current, 0);

      // 5. Mensagens subsequentes usam interaction.followUp()
      await interaction.followUp(`✅ Processo finalizado! ${totalFalasSalvas} transcrições foram salvas no banco de dados.`);

    } catch (error) {
      if (error.message === 'Nenhum áudio com conteúdo gravado.') {
        // 5. Mensagens subsequentes usam interaction.followUp()
        await interaction.followUp('⚠️ Gravação finalizada, mas ninguém falou. Nenhum áudio foi processado.');
      } else {
        console.error("Erro no processo de parada:", error);
        await interaction.followUp("❌ Um erro crítico ocorreu durante o processamento. Verifique os logs.");
      }
    } finally {
      console.log('Realizando limpeza de arquivos...');
      const filesToDelete = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`));
      for (const file of filesToDelete) {
        await fs.unlink(path.join(recordingsDir, file));
      }
      // 3. Acessa o ID do servidor através da interação
      activeRecordings.delete(interaction.guild.id);
      console.log('Limpeza concluída.');
    }
  },
};