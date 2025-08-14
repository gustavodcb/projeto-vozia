// commands/comandos.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'comandos',
    description: 'Exibe a lista de todos os comandos disponíveis.',
    async execute(message) {
        try {
            // Pega a lista de todos os comandos que foram carregados pelo bot.
            // O 'message.client' nos dá acesso ao cliente do bot, que contém a coleção de comandos.
            const { commands } = message.client;

            // Cria a base do nosso "Embed", que é um bloco de mensagem rico e formatado.
            const embed = new EmbedBuilder()
                .setColor('#5865F2') // Cor oficial do Discord
                .setTitle('🤖 Lista de Comandos do Vozia')
                .setDescription('Aqui está tudo que eu posso fazer por você:')
                .setThumbnail(message.client.user.displayAvatarURL()); // Adiciona o avatar do bot

            // Passa por cada comando na lista para adicioná-lo ao embed.
            commands.forEach(command => {
                // Ignora o próprio comando '!comandos' para não se listar.
                if (command.name === 'comandos') return;

                // Adiciona um "campo" ao embed com o nome e a descrição do comando.
                embed.addFields({
                    name: `\`!${command.name}\``, // O nome do comando formatado como código
                    value: command.description,  // A descrição que você escreveu em cada arquivo de comando
                    inline: false // Garante que cada comando fique em sua própria linha
                });
            });

            // Envia a mensagem formatada para o canal.
            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao executar o comando !comandos:', error);
            message.reply('❌ Ocorreu um erro ao tentar exibir a lista de comandos.');
        }
    },
};