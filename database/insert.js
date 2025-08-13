const pool = require('./db');

async function salvarTranscricao(usuario, texto) {
  try {
    await pool.query(
      'INSERT INTO transcricoes (usuario, texto) VALUES ($1, $2)',
      [usuario, texto]
    );
    console.log('Transcrição salva no banco!');
  } catch (err) {
    console.error('Erro ao salvar no banco:', err);
  }
}

module.exports = salvarTranscricao;
