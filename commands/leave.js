const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  name: 'leave',
  description: 'Faz o bot sair do canal de voz.',
  execute(message, args) {
    const connection = getVoiceConnection(message.guild.id);

    if (!connection) {
      return message.reply('❌ Não estou conectado em nenhum canal de voz aqui.');
    }

    connection.destroy();
    message.reply('✅ Saí do canal de voz!');
  },
};