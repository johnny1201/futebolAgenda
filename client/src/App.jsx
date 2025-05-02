// 📁 /client/src/App.jsx
import { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [time, setTime] = useState('');
  const [resposta, setResposta] = useState('');
  const [carregando, setCarregando] = useState(false);

  const buscar = async () => {
    setCarregando(true);
    try {
      const resp = await axios.post('http://localhost:5000/api/buscar-jogos', { time });
      setResposta(resp.data.resposta);
    } catch (err) {
      setResposta('Erro ao buscar os dados.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <h1 className="text-2xl font-bold">Consulta de Jogos</h1>
      <input
        className="border p-2 rounded w-full max-w-md"
        placeholder="Digite o nome do time"
        value={time}
        onChange={e => setTime(e.target.value)}
      />
      <button onClick={buscar} disabled={carregando} className="bg-blue-600 text-white px-4 py-2 rounded">
        {carregando ? 'Buscando...' : 'Buscar'}
      </button>
      {resposta && (
        <div className="bg-gray-100 p-4 rounded max-w-2xl whitespace-pre-wrap">{resposta}</div>
      )}
    </div>
  );
}

