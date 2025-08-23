// commands/reunioes.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listarReunioes } = require('../database/dbManager'); // Ajuste o caminho se necessário

// Função auxiliar para formatar segundos em "Xm Ys"
function formatarDuracao(segundos) {
    if (segundos === null || segundos === undefined || segundos === 0) {
        return 'Duração não registrada';
    }
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}m ${segs}s`;
}

module.exports = {
    // 1. Definição do comando de barra
    data: new SlashCommandBuilder()
        .setName('reunioes')
        .setDescription('Lista as últimas reuniões gravadas.'),
    
    // 2. A função execute agora recebe 'interaction'
    async execute(interaction) {
        try {
            const reunioes = await listarReunioes();

            if (reunioes.length === 0) {
                // 3. Usa interaction.reply para enviar a resposta
                return interaction.reply('Nenhuma reunião gravada encontrada.');
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Últimas Reuniões Gravadas')
                // Atualizado para sugerir o uso de um comando de barra
                .setDescription('Use o ID de uma reunião para fazer perguntas sobre ela com o comando `/perguntar`.');

            reunioes.forEach(reuniao => {
                embed.addFields({
                    name: `📝 ID: ${reuniao.id} - ${reuniao.titulo}`,
                    value: `🕒 Duração: ${formatarDuracao(reuniao.duracao_segundos)}`
                });
            });

            // 3. Usa interaction.reply para enviar o embed
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao executar o comando /reunioes:', error);
            // 3. Usa interaction.reply para a mensagem de erro, tornando-a efêmera
            await interaction.reply({ content: '❌ Ocorreu um erro ao buscar a lista de reuniões.', ephemeral: true });
        }
    },
};