// commands/reunioes.js

const { EmbedBuilder } = require('discord.js');
const { listarReunioes } = require('../database/dbManager');

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
    name: 'reunioes',
    description: 'Lista as últimas reuniões gravadas.',
    async execute(message) {
        try {
            const reunioes = await listarReunioes();

            if (reunioes.length === 0) {
                return message.channel.send('Nenhuma reunião gravada encontrada.');
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Últimas Reuniões Gravadas')
                .setDescription('Use o ID de uma reunião para fazer perguntas sobre ela com o comando `!perguntar <ID> [sua pergunta]`.');

            reunioes.forEach(reuniao => {
                embed.addFields({
                    name: `📝 ID: ${reuniao.id} - ${reuniao.titulo}`,
                    // CORREÇÃO 3: Removida a parte da data, exibindo apenas a duração.
                    value: `🕒 Duração: ${formatarDuracao(reuniao.duracao_segundos)}`
                });
            });

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao executar o comando !reunioes:', error);
            message.reply('❌ Ocorreu um erro ao buscar a lista de reuniões.');
        }
    },
};