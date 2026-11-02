import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'react-qr-code';
import Plot from 'react-plotly.js';
import { CheckCircle } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState(null); // 'presenter' | 'participant'
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [answers, setAnswers] = useState([55, 60, 45, 70, 65, 50, 55, 75, 40, 60, 65, 50, 70, 35, 80, 55, 60, 48, 52, 62]);
  const [currentAnswer, setCurrentAnswer] = useState(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(1);

  const createRoom = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(code);
    setRole('presenter');
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (inputCode.trim().length > 0) {
      setRoomCode(inputCode.trim());
      setRole('participant');
    }
  };

  const submitAnswer = () => {
    setAnswers([...answers, Number(currentAnswer)]);
    setHasSubmitted(true);
  };

  const nextQuestion = () => {
    setQuestionIndex(prev => prev + 1);
    setAnswers([]);
    setHasSubmitted(false);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ef-eyeballing.vercel.app';
  const joinUrl = `${currentUrl}?room=${roomCode}`;

  const count = answers.length;
  const avg = count > 0 ? (answers.reduce((a, b) => a + b, 0) / count).toFixed(1) : 0;
  const median = count > 0 ? [...answers].sort((a, b) => a - b)[Math.floor(count / 2)] : 0;
  const minVal = count > 0 ? Math.min(...answers) : 0;
  const maxVal = count > 0 ? Math.max(...answers) : 0;

  if (!role) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#38bdf8' }}>ef-eyeballing</h1>
        <p style={{ color: '#94a3b8', marginBottom: '40px', textAlign: 'center' }}>Realtidsutvärdering för interaktiva föreläsningar</p>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={createRoom} style={{ backgroundColor: '#2563eb', color: 'white', padding: '16px 32px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Starta som Föreläsare
          </button>

          <form onSubmit={joinRoom} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ange rumskod"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', fontSize: '1rem', width: '140px' }}
            />
            <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
              Anslut
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (role === 'presenter') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '30px', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#38bdf8' }}>ef-eyeballing</h1>
            <h2 style={{ fontSize: '1.2rem', margin: '5px 0 0 0', color: '#94a3b8' }}>Fråga {questionIndex}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#1e293b', padding: '15px 25px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>RUMSKOD</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '2px', color: '#f59e0b' }}>{roomCode}</div>
            </div>
            <div style={{ background: 'white', padding: '5px', borderRadius: '6px' }}>
              <QRCode value={joinUrl} size={64} />
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, color: '#cbd5e1' }}>Svarsfördelning (Violinplott)</h3>
            {answers.length > 0 ? (
              <Plot
                data={[
                  {
                    type: 'violin',
                    y: answers,
                    points: 'all',
                    jitter: 0.3,
                    pointpos: -0.8,
                    box: { visible: true },
                    meanline: { visible: true },
                    fillcolor: '#38bdf8',
                    line: { color: '#0284c7' },
                    marker: { color: '#f59e0b', size: 8 },
                    name: 'Svar'
                  }
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#f8fafc' },
                  yaxis: { range: [10, 80], dtick: 10, gridcolor: '#334155' },
                  xaxis: { showticklabels: false },
                  margin: { l: 40, r: 40, t: 20, b: 20 }
                }}
                style={{ width: '100%', height: '400px' }}
                config={{ displayModeBar: false }}
              />
            ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Väntar på första svaret...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Antal svar</div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f8fafc' }}>{count}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Medelvärde</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#38bdf8' }}>{avg}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Median</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>{median}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Min / Max</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>{minVal} / {maxVal}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setRole(null)} style={{ backgroundColor: '#475569', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Avsluta rum
          </button>
          <button onClick={nextQuestion} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Nästa fråga →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#064e3b', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#047857', borderRadius: '16px', padding: '25px', border: '1px solid #059669' }}>
        <h2 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#a7f3d0' }}>ef-eyeballing</h2>
        <p style={{ textAlign: 'center', color: '#d1fae5', fontSize: '0.9rem', marginBottom: '30px' }}>Rum: <strong>{roomCode}</strong> | Fråga {questionIndex}</p>

        {!hasSubmitted ? (
          <div>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Ange ditt svar (10-80):
            </label>
            <div style={{ fontSize: '3rem', textAlign: 'center', fontWeight: 'bold', color: '#fef08a', marginBottom: '20px' }}>
              {currentAnswer}
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              style={{ width: '100%', height: '12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '30px' }}
            />
            <button
              onClick={submitAnswer}
              style={{ width: '100%', backgroundColor: '#f59e0b', color: '#78350f', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Skicka svar
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <CheckCircle size={64} color="#a7f3d0" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#ecfdf5', margin: '0 0 10px 0' }}>Svaret är skickat!</h3>
            <p style={{ color: '#a7f3d0', fontSize: '0.9rem' }}>Ditt svar: <strong>{currentAnswer}</strong></p>
            <p style={{ color: '#d1fae5', fontSize: '0.8rem', marginTop: '20px' }}>Vänta på att föreläsaren byter fråga...</p>
          </div>
        )}
      </div>
    </div>
  );
}
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
