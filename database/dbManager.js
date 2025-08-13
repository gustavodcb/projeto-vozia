// database/dbManager.js (um nome mais descritivo)

const pool = require('./db'); // Seu arquivo de conexão
const getEmbedding = require('../services/embeddingService'); // Um serviço que você criará para chamar a API de embedding

// Função para criar uma nova reunião e registrar participantes
async function iniciarReuniao(titulo, canal, participantes) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inicia uma transação

        // 1. Cria a reunião
        const resReuniao = await client.query(
            'INSERT INTO reuniao (titulo, canal_chamada) VALUES ($1, $2) RETURNING id',
            [titulo, canal]
        );
        const idReuniao = resReuniao.rows[0].id;

        // 2. Insere/Verifica usuários e os associa à reunião
        for (const user of participantes) {
            // Garante que o usuário existe na tabela 'usuario'
            let resUsuario = await client.query('SELECT id FROM usuario WHERE id = $1', [user.id]);
            if (resUsuario.rowCount === 0) {
                resUsuario = await client.query(
                    'INSERT INTO usuario (id, nome) VALUES ($1, $2) RETURNING id',
                    [user.id, user.username]
                );
            }
            const idUsuario = resUsuario.rows[0].id;

            // Associa o usuário à reunião na tabela 'participou'
            await client.query(
                'INSERT INTO participou (id_usuario, id_reuniao) VALUES ($1, $2)',
                [idUsuario, idReuniao]
            );
        }

        await client.query('COMMIT'); // Confirma a transação
        return idReuniao; // Retorna o ID da reunião para uso futuro

    } catch (e) {
        await client.query('ROLLBACK'); // Desfaz tudo em caso de erro
        throw e;
    } finally {
        client.release(); // Libera a conexão
    }
}

// Função para salvar uma única fala transcrita
async function salvarFala(idReuniao, idUsuario, textoFala) {
    try {
        // 1. Gera o embedding para o texto da fala
        const embedding = await getEmbedding(textoFala);

        // 2. Insere tudo na tabela de transcricoes
        await pool.query(
            'INSERT INTO transcricoes (id_reuniao, id_usuario, texto_fala, embedding) VALUES ($1, $2, $3, $4)',
            [idReuniao, idUsuario, textoFala, embedding]
        );
        console.log(`Fala salva para o usuário ${idUsuario} na reunião ${idReuniao}`);

    } catch (e) {
        console.error('Erro ao salvar fala e embedding:', e);
        throw e;
    }
}


module.exports = {
    iniciarReuniao,
    salvarFala
    // Você também terá aqui funções como 'finalizarReuniao', 'buscarRespostas', etc.
};