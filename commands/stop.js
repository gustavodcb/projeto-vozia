// commands/stop.js

const fs = require('fs/promises');
const fsSync = require('fs'); // Importando a versão síncrona para verificar o tamanho dos arquivos
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { activeRecordings } = require('../index.js');

const execPromise = util.promisify(exec);

const transcreverAudio = require('../services/transcriptionService.js');
const { salvarFala } = require('../database/dbManager.js');

module.exports = {
  name: 'stop',
  description: 'Finaliza a gravação, processa e salva a transcrição.',
  async execute(message) {
    const gravacaoAtiva = activeRecordings.get(message.guild.id);
    if (!gravacaoAtiva) {
      return message.reply('❌ Nenhuma gravação ativa encontrada para este servidor.');
    }

    await message.reply('▶️ Gravação parada. Iniciando processamento... Isso pode levar vários minutos.');

    const { reuniaoId, connection, userStreams, participantes } = gravacaoAtiva;
    const recordingsDir = path.resolve(__dirname, '../recordings');
    
    // Encerra os streams de arquivo e a conexão de voz
    userStreams.forEach(stream => stream.end());
    if (connection) {
        connection.destroy();
    }
    
    try {
      // 2. ENCONTRAR OS ARQUIVOS PCM E FILTRAR OS VAZIOS
      const allPcmFiles = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`) && file.endsWith('.pcm'));
      
      // *** CORREÇÃO APLICADA AQUI ***
      // Filtra a lista para manter apenas os arquivos PCM que têm mais de 0 bytes de tamanho.
      const pcmFiles = allPcmFiles.filter(file => {
          const stats = fsSync.statSync(path.join(recordingsDir, file));
          return stats.size > 1024; // Usamos 1KB como um filtro seguro para ignorar arquivos só com ruído
      });

      // Se, após filtrar, não sobrar nenhum arquivo, ninguém falou.
      if (pcmFiles.length === 0) {
        // Lançamos um erro para pular direto para o bloco 'finally' e limpar os arquivos.
        throw new Error('Nenhum áudio com conteúdo gravado.');
      }
      
      const mixedWavPath = path.join(recordingsDir, `${reuniaoId}-mixed.wav`);
      
      // Constrói o comando ffmpeg APENAS com os arquivos que têm conteúdo.
      const inputs = pcmFiles.map(file => `-f s16le -ar 48000 -ac 1 -i "${path.join(recordingsDir, file)}"`).join(' ');
      const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "amix=inputs=${pcmFiles.length}:duration=first" "${mixedWavPath}"`;

      await message.channel.send(`🎛️ Mixando áudios de ${pcmFiles.length} participante(s)...`);
      await execPromise(ffmpegCmd);
      
      // 3. TRANSCREVER O ÁUDIO MIXADO
      await message.channel.send('🗣️ Enviando para a AssemblyAI para transcrição...');
      const falasTranscritas = await transcreverAudio(mixedWavPath);

      // 4. MAPEAMENTO DE LOCUTOR (Speaker Mapping)
      const speakerMap = {};
      const speakersIdentificados = [...new Set(falasTranscritas.map(f => f.speaker))];
      speakersIdentificados.forEach((speaker, index) => {
          if (participantes[index]) {
              speakerMap[speaker] = participantes[index].id;
          }
      });
      
      // 5. SALVAR CADA FALA NO BANCO DE DADOS
      await message.channel.send('💾 Salvando transcrições e gerando embeddings...');
      let falasSalvas = 0;
      for (const fala of falasTranscritas) {
        const idUsuario = speakerMap[fala.speaker];
        if (idUsuario) {
          await salvarFala(reuniaoId, idUsuario, fala.text);
          falasSalvas++;
        } else {
          console.warn(`Locutor ${fala.speaker} não encontrado no mapa de usuários. Esta fala não será salva.`);
        }
      }

      await message.channel.send(`✅ Processo finalizado! ${falasSalvas} falas foram salvas.`);

    } catch (error) {
      // Se o erro for por não ter áudio, envia uma mensagem amigável.
      if (error.message === 'Nenhum áudio com conteúdo gravado.') {
        await message.channel.send('⚠️ Gravação finalizada, mas ninguém falou. Nenhum áudio foi processado.');
      } else {
        console.error("Erro no processo de parada:", error);
        await message.channel.send("❌ Um erro crítico ocorreu durante o processamento. Verifique os logs.");
      }
    } finally {
      // 6. LIMPEZA FINAL
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