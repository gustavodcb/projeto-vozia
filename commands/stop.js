const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { activeRecordings } = require('../index.js');
const transcreverAudio = require('../services/transcriptionService.js');
const { salvarFala } = require('../database/dbManager.js');

// Converte a função exec baseada em callback para uma baseada em Promises
const execPromise = util.promisify(exec);

module.exports = {
  name: 'stop',
  description: 'Finaliza a gravação, processa cada áudio individualmente e salva a transcrição.',
  async execute(message) {
    const gravacaoAtiva = activeRecordings.get(message.guild.id);
    if (!gravacaoAtiva) {
      return message.reply('❌ Nenhuma gravação ativa encontrada para este servidor.');
    }

    await message.reply('▶️ Gravação parada. Iniciando processamento individual... Isso pode levar alguns minutos.');

    const { reuniaoId, connection, userStreams } = gravacaoAtiva;
    const recordingsDir = path.resolve(__dirname, '../recordings');
    
    // Encerra os streams de arquivo e a conexão de voz
    userStreams.forEach(stream => stream.end());
    if (connection) {
        connection.destroy();
    }
    
    try {
      // Pequeno atraso para garantir que os arquivos foram completamente escritos no disco
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Encontra todos os arquivos PCM da reunião atual
      const allPcmFiles = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`) && file.endsWith('.pcm'));
      
      // Filtra para manter apenas os arquivos com áudio real (maior que 4KB)
      const pcmFilesComConteudo = allPcmFiles.filter(file => {
          const stats = fsSync.statSync(path.join(recordingsDir, file));
          return stats.size > 4096;
      });

      if (pcmFilesComConteudo.length === 0) {
        throw new Error('Nenhum áudio com conteúdo gravado.');
      }
      
      await message.channel.send(`🗣️ Encontrado áudio de ${pcmFilesComConteudo.length} participante(s). Iniciando transcrições individuais...`);

      // Mapeia cada arquivo para uma promessa de processamento (conversão, transcrição, salvamento)
      const processamentoPromises = pcmFilesComConteudo.map(async (pcmFile) => {
        const pcmPath = path.join(recordingsDir, pcmFile);
        const wavPath = pcmPath.replace('.pcm', '.wav');
        
        // Extrai o ID do usuário diretamente do nome do arquivo. Esta é a chave!
        const userId = pcmFile.split('-')[1].split('.')[0];

        try {
          // 1. Converte o PCM individual para WAV usando FFmpeg
          const ffmpegCmd = `ffmpeg -y -f s16le -ar 48000 -ac 1 -i "${pcmPath}" "${wavPath}"`;
          await execPromise(ffmpegCmd);
          
          // 2. Transcreve o arquivo WAV individual.
          // Assumindo que seu serviço retorna um objeto com a propriedade 'text'.
          const resultadoTranscricao = await transcreverAudio(wavPath);
          const textoTranscribed = resultadoTranscricao.text;

          console.log(`[DEBUG] Transcrição para ${userId}: "${textoTranscribed}"`); 

          // 3. Salva a transcrição no banco de dados se houver texto
          if (textoTranscribed && textoTranscribed.trim().length > 0) {
            await salvarFala(reuniaoId, userId, textoTranscribed);
            return 1; // Retorna 1 para contar como sucesso
          }
          return 0; // Retorna 0 se não houver texto para salvar
        } catch (err) {
            console.error(`Erro ao processar o arquivo para o usuário ${userId}:`, err);
            return 0; // Retorna 0 em caso de erro
        }
      });

      // Executa todas as promessas em paralelo e espera a conclusão
      const resultados = await Promise.all(processamentoPromises);
      // Soma os resultados para saber quantas falas foram salvas
      const totalFalasSalvas = resultados.reduce((sum, current) => sum + current, 0);

      await message.channel.send(`✅ Processo finalizado! ${totalFalasSalvas} transcrições foram salvas no banco de dados.`);

    } catch (error) {
      if (error.message === 'Nenhum áudio com conteúdo gravado.') {
        await message.channel.send('⚠️ Gravação finalizada, mas ninguém falou. Nenhum áudio foi processado.');
      } else {
        console.error("Erro no processo de parada:", error);
        await message.channel.send("❌ Um erro crítico ocorreu durante o processamento. Verifique os logs.");
      }
    } finally {
      // 6. LIMPEZA FINAL: Remove todos os arquivos .pcm e .wav da reunião
      console.log('Realizando limpeza de arquivos...');
      const filesToDelete = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`));
      for (const file of filesToDelete) {
        await fs.unlink(path.join(recordingsDir, file));
      }
      activeRecordings.delete(message.guild.id);
      console.log('Limpeza concluída.');
    }
  },
};