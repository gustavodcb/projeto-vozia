// database/dbManager.js

const pool = require('./db'); // Seu arquivo de conexão com o banco
const getEmbedding = require('../services/embeddingService'); // O serviço para gerar embeddings (agora usando Google AI)

/**
 * Cria uma nova reunião no banco de dados e registra os participantes iniciais.
 * Esta versão é otimizada para usar "ON CONFLICT" e evitar queries desnecessárias.
 * @param {string} titulo O título para a reunião.
 * @param {string} canal O nome do canal de voz.
 * @param {Array<{id: string, username: string}>} participantes Um array de objetos de participantes.
 * @returns {Promise<number>} O ID da reunião recém-criada.
 */
async function iniciarReuniao(titulo, canal, participantes) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inicia uma transação para garantir que todas as operações funcionem ou falhem juntas

        // 1. Cria a reunião
        const resReuniao = await client.query(
            'INSERT INTO reuniao (titulo, canal_chamada) VALUES ($1, $2) RETURNING id',
            [titulo, canal]
        );
        const idReuniao = resReuniao.rows[0].id;

        // 2. Insere/Verifica usuários e os associa à reunião
        for (const user of participantes) {
            // Otimização: Esta query única insere o usuário APENAS se ele não existir.
            // O 'ON CONFLICT (id) DO NOTHING' previne erros se o usuário já estiver na tabela,
            // tornando o 'SELECT' anterior desnecessário.
            await client.query(
                'INSERT INTO usuario (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                [user.id, user.username]
            );

            // Associa o usuário à reunião na tabela 'participou'
            await client.query(
                'INSERT INTO participou (id_usuario, id_reuniao) VALUES ($1, $2)',
                [user.id, idReuniao]
            );
        }

        await client.query('COMMIT'); // Confirma todas as operações da transação se tudo deu certo
        console.log(`✅ Reunião ${idReuniao} iniciada com sucesso.`);
        return idReuniao; 

    } catch (e) {
        await client.query('ROLLBACK'); // Desfaz tudo em caso de qualquer erro
        console.error('❌ Erro ao iniciar reunião, revertendo transação.', e);
        throw e; // Propaga o erro para o comando saber que falhou
    } finally {
        client.release(); // ESSENCIAL: Libera a conexão de volta para o pool para ser reutilizada
    }
}

/**
 * Salva uma única fala transcrita, gerando seu embedding antes de inserir.
 * @param {number} idReuniao O ID da reunião.
 * @param {string} idUsuario O ID (BIGINT) do usuário do Discord que falou.
 * @param {string} textoFala O texto transcrito da fala.
 */
async function salvarFala(idReuniao, idUsuario, textoFala) {
    try {
        // 1. Gera o embedding para o texto da fala usando nosso serviço
        const embedding = await getEmbedding(textoFala);

        // 2. Converte o array de embedding para o formato de string esperado pelo pgvector: '[1.23,4.56,...]'
        // Isso é necessário para que o PostgreSQL entenda que é um vetor.
        const embeddingString = `[${embedding.join(',')}]`;

        // 3. Insere tudo na tabela de transcricoes
        await pool.query(
            // CORREÇÃO: A query agora insere a 'embeddingString', não o objeto 'embedding'
            'INSERT INTO transcricoes (id_reuniao, id_usuario, texto_fala, embedding) VALUES ($1, $2, $3, $4)',
            [idReuniao, idUsuario, textoFala, embeddingString]
        );
        console.log(`🗣️ Fala salva para o usuário ${idUsuario} na reunião ${idReuniao}`);

    } catch (e) {
        console.error('❌ Erro ao salvar fala e embedding:', e);
        throw e;
    }
}

// Exporta as funções para serem usadas nos seus comandos
module.exports = {
    iniciarReuniao,
    salvarFala,
};