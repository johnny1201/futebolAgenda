// Atualizado com correção automática de nome do time via ChatGPT

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = '3';

async function corrigirNomeTime(nomeDigitado) {
  try {
    const resposta = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que corrige nomes de times de futebol. Retorne apenas o nome correto do time com base na digitação errada.'
        },
        {
          role: 'user',
          content: `Corrija o nome do time: ${nomeDigitado}`
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const nomeCorrigido = resposta.data.choices[0].message.content.trim();
    return nomeCorrigido;
  } catch (err) {
    console.error('Erro ao corrigir nome do time:', err.message);
    return nomeDigitado; // fallback: retorna o original
  }
}

app.post('/api/buscar-jogos', async (req, res) => {
  let { time } = req.body;
  try {
    if (!time || time.trim().length < 3) {
      return res.status(400).json({ erro: 'Nome do time inválido ou muito curto.' });
    }

    // Corrigir nome do time
    const nomeCorrigido = await corrigirNomeTime(time);

    // Buscar ID do time corrigido
    const searchRes = await axios.get(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php`, {
      params: { t: nomeCorrigido }
    });

    const team = searchRes.data.teams?.[0];
    if (!team) {
      return res.status(404).json({ erro: `Time não encontrado mesmo após correção: ${nomeCorrigido}` });
    }

    const teamId = team.idTeam;

    // Buscar últimos jogos
    const ultimosRes = await axios.get(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php`, {
      params: { id: teamId }
    });

    // Buscar próximos jogos
    const proximosRes = await axios.get(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnext.php`, {
      params: { id: teamId }
    });

    const resultados = ultimosRes.data.results?.map(jogo => {
      const placarMandante = parseInt(jogo.intHomeScore);
      const placarVisitante = parseInt(jogo.intAwayScore);
      if (isNaN(placarMandante) || isNaN(placarVisitante)) return 'Empate';

      const isMandante = jogo.idHomeTeam === teamId;
      const ganhou = (isMandante && placarMandante > placarVisitante) || (!isMandante && placarVisitante > placarMandante);
      const perdeu = (isMandante && placarMandante < placarVisitante) || (!isMandante && placarVisitante < placarMandante);

      return ganhou ? 'Vitória' : perdeu ? 'Derrota' : 'Empate';
    }) || [];

    const agenda = proximosRes.data.events?.slice(0, 5).map(jogo => {
      return `${jogo.dateEvent} - ${jogo.strHomeTeam} x ${jogo.strAwayTeam} (${jogo.strVenue || 'Estádio desconhecido'}) - ${jogo.strLeague}`;
    }) || [];

    // Enviar para OpenAI para formatar a resposta final
    const chatResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de futebol. Resuma os últimos 10 jogos como vitórias, empates e derrotas. Depois, liste os próximos 5 jogos com data, local e onde assistir.'
        },
        {
          role: 'user',
          content: `Resultados: ${resultados.join(', ')}.\nPróximos jogos: ${agenda.join('; ')}`
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ resposta: chatResponse.data.choices[0].message.content });
  } catch (err) {
    console.error('Erro ao processar requisição:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar dados. Detalhes no console.' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
