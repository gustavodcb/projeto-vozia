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
    data: new SlashCommandBuilder()
        .setName('reunioes')
        .setDescription('Lista as últimas reuniões gravadas.'),
    
    async execute(interaction) {
        try {
            const reunioes = await listarReunioes();

            if (reunioes.length === 0) {
                return interaction.reply('Nenhuma reunião gravada encontrada.');
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Últimas Reuniões Gravadas')
                .setDescription('Use o ID de uma reunião para fazer perguntas sobre ela com o comando `/perguntar`.');

            reunioes.forEach(reuniao => {
                // <-- MUDANÇA AQUI: Início da formatação da data
                let dataFormatada = 'Data não registrada';
                if (reuniao.data_inicio) {
                    // Converte o timestamp (segundos) para milissegundos para o JavaScript
                    const dataInicio = new Date(reuniao.data_inicio * 1000);
                    // Formata para o padrão brasileiro, incluindo data e hora
                    dataFormatada = dataInicio.toLocaleString('pt-BR', {
                        timeZone: 'America/Brasília' // IMPORTANTE: Defina seu fuso horário
                    });
                }
                // <-- MUDANÇA AQUI: Fim da formatação da data

                embed.addFields({
                    name: `📝 ID: ${reuniao.id} - ${reuniao.titulo}`,
                    // <-- MUDANÇA AQUI: Exibe a data formatada e a duração na mesma linha
                    value: `📅 Início: **${dataFormatada}**\n🕒 Duração: ${formatarDuracao(reuniao.duracao_segundos)}`
                });
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao executar o comando /reunioes:', error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao buscar a lista de reuniões.', ephemeral: true });
        }
    },
};