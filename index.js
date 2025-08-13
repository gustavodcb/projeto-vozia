// 1. IMPORTS ORGANIZADOS NO TOPO
require('dotenv').config();
const fs = require('fs');
// LINHA CORRETA
const path = require('path');
// Importe TUDO o que você precisa do discord.js em uma única linha
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// 2. CRIAÇÃO DO ESTADO GLOBAL E DO CLIENTE
const activeRecordings = new Map();

// Crie a instância do cliente com as permissões (Intents) necessárias
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // Essencial para o bot entrar em canais de voz e ouvir
        GatewayIntentBits.GuildMessages,    // Essencial para receber mensagens como !record e !stop
        GatewayIntentBits.MessageContent,   // Essencial para o bot ler o conteúdo das mensagens
    ]
});

// Anexe a coleção de comandos ao cliente
client.commands = new Collection();

// 3. EXPORTAÇÕES
// Agora que 'client' e 'activeRecordings' existem, você pode exportá-los.
module.exports = { client, activeRecordings };


client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.name && typeof command.execute === 'function') {
    client.commands.set(command.name, command);
  } else {
    console.warn(`⚠️ Comando "${file}" não possui 'name' ou 'execute'.`);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ Erro ao executar o comando!');
  }
});

const token = process.env.DISCORD_TOKEN;
client.login(token);
