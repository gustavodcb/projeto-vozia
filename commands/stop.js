// commands/stop.js

const fs = require('fs/promises'); // Usando a versão de promessas do fs
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { activeRecordings } = require('../index.js'); // Importa o estado global

const execPromise = util.promisify(exec);

// Importa nossos serviços
const transcreverAudio = require('../services/transcriptionService.js');
const { salvarFala } = require('../database/dbManager.js');

module.exports = {
  name: 'stop',
  description: 'Finaliza a gravação, processa e salva a transcrição.',
  async execute(message) {
    // 1. VERIFICAR SE EXISTE UMA GRAVAÇÃO ATIVA
    const gravacaoAtiva = activeRecordings.get(message.guild.id);
    if (!gravacaoAtiva) {
      return message.reply('❌ Nenhuma gravação ativa encontrada para este servidor.');
    }

    await message.reply('▶️ Gravação parada. Iniciando processamento... Isso pode levar vários minutos.');

    const { reuniaoId, connection, userStreams, participantes } = gravacaoAtiva;
    const recordingsDir = path.resolve(__dirname, '../recordings');
    
    // Encerra a conexão de voz e os streams de arquivo
    connection.destroy();
    userStreams.forEach(stream => stream.end());
    
    try {
      // 2. ENCONTRAR E MIXAR OS ARQUIVOS PCM EM UM ÚNICO WAV
      const pcmFiles = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`) && file.endsWith('.pcm'));

      if (pcmFiles.length === 0) {
        throw new Error('Nenhum arquivo de áudio foi gravado para esta reunião.');
      }
      
      const mixedWavPath = path.join(recordingsDir, `${reuniaoId}-mixed.wav`);
      
      // Constrói o comando ffmpeg para mixar múltiplos arquivos
      const inputs = pcmFiles.map(file => `-f s16le -ar 48000 -ac 1 -i "${path.join(recordingsDir, file)}"`).join(' ');
      // O filtro 'amix' junta todos os inputs. 'duration=first' para quando o primeiro stream terminar.
      const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "amix=inputs=${pcmFiles.length}:duration=first" "${mixedWavPath}"`;

      await message.channel.send('🎛️ Mixando áudios individuais...');
      await execPromise(ffmpegCmd);
      
      // 3. TRANSCREVER O ÁUDIO MIXADO
      await message.channel.send('🗣️ Enviando para a AssemblyAI para transcrição...');
      const falasTranscritas = await transcreverAudio(mixedWavPath);

      // 4. MAPEAMENTO DE LOCUTOR (Speaker Mapping) - SOLUÇÃO SIMPLES
      // AssemblyAI não sabe os IDs do Discord. Esta é uma heurística simples:
      // Assumimos que a ordem dos 'Speakers' corresponde à ordem dos participantes.
      // ISTO PODE NÃO SER PRECISO! Mas é um começo funcional.
      const speakerMap = {};
      const speakersIdentificados = [...new Set(falasTranscritas.map(f => f.speaker))]; // ['Speaker A', 'Speaker B']
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
        }
      }

      await message.channel.send(`✅ Processo finalizado! ${falasSalvas} falas foram salvas.`);

    } catch (error) {
      console.error("Erro no processo de parada:", error);
      message.channel.send("❌ Um erro crítico ocorreu durante o processamento. Verifique os logs.");
    } finally {
      // 6. LIMPEZA FINAL
      console.log('Realizando limpeza de arquivos...');
      const filesToDelete = (await fs.readdir(recordingsDir)).filter(file => file.startsWith(`${reuniaoId}-`));
      for (const file of filesToDelete) {
        await fs.unlink(path.join(recordingsDir, file));
      }
      // Remove a gravação do estado ativo
      activeRecordings.delete(message.guild.id);
      console.log('Limpeza concluída.');
    }
  },
};