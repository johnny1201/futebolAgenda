// 📁 /server/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/buscar-jogos', async (req, res) => {
  const { time } = req.body;
  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    // Buscar ID do time
    const search = await axios.get('https://v3.football.api-sports.io/teams', {
      headers: { 'x-apisports-key': API_KEY },
      params: { search: time }
    });
    const teamData = search.data.response[0];
    if (!teamData) return res.status(404).json({ erro: 'Time não encontrado' });
    const TEAM_ID = teamData.team.id;

    // Buscar últimos 10 jogos
    const ultimos = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
      headers: { 'x-apisports-key': API_KEY },
      params: { team: TEAM_ID, last: 10 }
    });

    // Buscar próximos 5 jogos
    const proximos = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
      headers: { 'x-apisports-key': API_KEY },
      params: { team: TEAM_ID, next: 5 }
    });

    const resultados = ultimos.data.response.map(jogo => {
      const isHome = jogo.teams.home.id === TEAM_ID;
      const result = jogo.teams.home.winner === jogo.teams.away.winner ? 'Empate' :
                     (isHome === jogo.teams.home.winner ? 'Vitória' : 'Derrota');
      return result;
    });

    const agenda = proximos.data.response.map(jogo => {
      return `${jogo.fixture.date.split('T')[0]} - ${jogo.teams.home.name} x ${jogo.teams.away.name} (${jogo.fixture.venue.name}) - ${jogo.league.name}`;
    });

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
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ resposta: chatResponse.data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar dados.' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

