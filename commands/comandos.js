// commands/comandos.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // 1. Definição do comando de barra
    data: new SlashCommandBuilder()
        .setName('comandos')
        .setDescription('Exibe a lista de todos os comandos disponíveis.'),
    
    // 2. A função execute agora recebe 'interaction'
    async execute(interaction) {
        try {
            // 3. Acessa a coleção de comandos através de 'interaction.client'
            const { commands } = interaction.client;

            const embed = new EmbedBuilder()
                .setColor('#5865F2') // Cor do Discord
                .setTitle('🤖 Lista de Comandos do Vozia')
                .setDescription('Aqui está tudo que eu posso fazer por você:')
                .setThumbnail(interaction.client.user.displayAvatarURL()); // Pega o avatar do bot

            // Itera sobre a coleção de comandos
            commands.forEach(command => {
                // 4. Acessa o nome do comando via 'command.data.name'
                if (command.data.name === 'comandos') return;

                // Adiciona um campo ao embed para cada comando
                embed.addFields({
                    // 4. Formata o nome e pega a descrição de 'command.data'
                    name: `\`/${command.data.name}\``,
                    value: command.data.description,
                    inline: false 
                });
            });

            // 5. Responde à interação com o embed final
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao executar o comando /comandos:', error);
            // 5. Responde à interação com uma mensagem de erro efêmera
            await interaction.reply({ content: '❌ Ocorreu um erro ao tentar exibir a lista de comandos.', ephemeral: true });
        }
    },
};