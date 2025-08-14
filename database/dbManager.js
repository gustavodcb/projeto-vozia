// database/dbManager.js

const pool = require('./db');
const getEmbedding = require('../services/embeddingService');

// =========================================================================
// CONFIGURAÇÃO CENTRAL DE NOMES - BASEADO NAS SUAS IMAGENS E ERROS
const NOME_DA_TABELA_REUNIOES = 'reuniao';
const NOME_DA_TABELA_USUARIOS = 'usuario';
const NOME_DA_TABELA_TRANSCRICOES = 'transcricoes';
const NOME_DA_TABELA_PARTICIPOU = 'participou';
// =========================================================================


async function iniciarReuniao(titulo, nomeCanal, participantes) {
    console.log('[DB] Tentando iniciar uma nova reunião...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // CORREÇÃO 1: Removida a coluna 'data_inicio' da query INSERT.
        const resReuniao = await client.query(
            `INSERT INTO ${NOME_DA_TABELA_REUNIOES} (titulo, canal_chamada) VALUES ($1, $2) RETURNING id`,
            [titulo, nomeCanal]
        );
        const idReuniao = resReuniao.rows[0].id;
        
        console.log(`[DB] Reunião criada com sucesso. ID: ${idReuniao}`);

        for (const user of participantes) {
            await client.query(`INSERT INTO ${NOME_DA_TABELA_USUARIOS} (id, nome) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [user.id, user.username]);
            await client.query(`INSERT INTO ${NOME_DA_TABELA_PARTICIPOU} (id_usuario, id_reuniao) VALUES ($1, $2)`, [user.id, idReuniao]);
        }

        await client.query('COMMIT');
        return idReuniao;
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao iniciar reunião:', e);
        throw e;
    } finally {
        client.release();
    }
}

// As funções salvarFala e buscarFalasRelevantes permanecem as mesmas da versão anterior,
// pois estavam corretas.

async function salvarFala(reuniaoId, usuarioId, texto) {
    if (!texto || texto.trim() === '') return;
    try {
        const embedding = await getEmbedding(texto);
        const embeddingString = JSON.stringify(embedding);
        const query = `
            INSERT INTO ${NOME_DA_TABELA_TRANSCRICOES} (id_reuniao, id_usuario, texto_fala, embedding) 
            VALUES ($1, $2, $3, $4)
        `;
        await pool.query(query, [reuniaoId, usuarioId, texto, embeddingString]);
    } catch (error) {
        console.error('Erro ao salvar fala na tabela de transcrições:', error);
        throw error;
    }
}

async function buscarFalasRelevantes(idReuniao, embeddingDaPergunta) {
    const embeddingString = JSON.stringify(embeddingDaPergunta);
    
    // A MUDANÇA ESTÁ AQUI: Adicionamos a cláusula "WHERE" para filtrar pelo ID da reunião.
    const query = `
        SELECT
            u.nome AS username,
            t.texto_fala
        FROM ${NOME_DA_TABELA_TRANSCRICOES} t
        JOIN ${NOME_DA_TABELA_USUARIOS} u ON t.id_usuario = u.id
        WHERE t.id_reuniao = $2  -- <-- FILTRO ADICIONADO AQUI
        ORDER BY
            t.embedding <=> $1
        LIMIT 5;
    `;
    try {
        // Agora passamos DOIS parâmetros para a query: o embedding e o id da reunião.
        const { rows } = await pool.query(query, [embeddingString, idReuniao]);
        return rows;
    } catch (error) {
        console.error('Erro ao buscar falas relevantes:', error);
        throw error;
    }
}

async function listarReunioes() {
    // CORREÇÃO 2: Removida a coluna 'data_inicio' da query SELECT.
    const query = `
        SELECT id, titulo, duracao_segundos
        FROM ${NOME_DA_TABELA_REUNIOES} 
        ORDER BY id DESC 
        LIMIT 10;
    `;
    try {
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error("Erro ao listar reuniões:", error);
        throw error;
    }
}

async function finalizarReuniao(reuniaoId, duracaoEmSegundos) {
    const query = `UPDATE ${NOME_DA_TABELA_REUNIOES} SET duracao_segundos = $1 WHERE id = $2`;
    try {
        await pool.query(query, [duracaoEmSegundos, reuniaoId]);
        console.log(`[DB] Duração da reunião ID ${reuniaoId} salva.`);
    } catch (error) {
        console.error("Erro ao finalizar a reunião:", error);
    }
}

module.exports = {
    iniciarReuniao,
    salvarFala,
    buscarFalasRelevantes,
    listarReunioes,
    finalizarReuniao,
};