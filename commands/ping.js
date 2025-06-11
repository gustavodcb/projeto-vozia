module.exports = {
    name: 'ping',
    description: 'Responde com Pong!',
    execute(message, args) {
      message.channel.send('🏓 Pong!');
    },
  };