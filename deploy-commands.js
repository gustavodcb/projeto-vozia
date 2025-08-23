// deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Lendo arquivos de comando de barra (/).');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`[INFO] Comando /${command.data.name} encontrado e preparado para registro.`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    if (commands.length === 0) {
        console.log('Nenhum comando de barra encontrado para registrar.');
        return;
    }

    try {
        console.log(`\nIniciando o registro de ${commands.length} comandos de barra (/).`);
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log(`✅ ${data.length} comandos de barra (/) foram registrados com sucesso.`);
    } catch (error) {
        console.error(error);
    }
})();