const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
  name: 'stop',
  description: 'Para a gravação e converte o último áudio gravado',
  async execute(message, args) {
    const recordingsDir = path.resolve(__dirname, '../recordings');

    // Listar todos os arquivos .pcm
    const pcmFiles = fs.readdirSync(recordingsDir).filter(file => file.endsWith('.pcm'));

    if (pcmFiles.length === 0) {
      return message.reply('❌ Nenhuma gravação ativa encontrada.');
    }

    // Ordenar para pegar o mais recente
    const lastPcmFile = pcmFiles.map(f => ({
      name: f,
      time: fs.statSync(path.join(recordingsDir, f)).mtimeMs
    })).sort((a, b) => b.time - a.time)[0];

    const inputPath = path.join(recordingsDir, lastPcmFile.name);
    const outputPath = inputPath.replace('.pcm', '.wav');

    const ffmpegCmd = `ffmpeg -f s16le -ar 48000 -ac 2 -i "${inputPath}" "${outputPath}"`;

    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro na conversão: ${error.message}`);
        return message.channel.send('❌ Erro ao converter o áudio.');
      }

      console.log(`✅ Áudio convertido: ${outputPath}`);
      message.channel.send(`✅ Áudio convertido para WAV: \`${path.basename(outputPath)}\``);
    });
  },
};
