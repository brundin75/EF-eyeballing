import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'react-qr-code';
import Plot from 'react-plotly.js';
import { CheckCircle, Lock, Play, BarChart2, RotateCcw } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState(null); // 'setup' | 'presenter' | 'summary' | 'participant'
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [isQuestionActive, setIsQuestionActive] = useState(true);
  
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  
  // Svarsdata per fråga: { [qNum]: [svar1, svar2, ...] }
  const [allAnswers, setAllAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Beräkna statistik (Medelvärde, Standardavvikelse, Min, Max)
  const calcStats = (data = []) => {
    const count = data.length;
    if (count === 0) return { count: 0, avg: '0', sd: '0', sdNum: 0, minVal: 0, maxVal: 0 };
    
    const sum = data.reduce((a, b) => a + b, 0);
    const avgNum = sum / count;
    
    let variance = 0;
    if (count > 1) {
      variance = data.reduce((acc, val) => acc + Math.pow(val - avgNum, 2), 0) / (count - 1);
    }
    const sdNum = Math.sqrt(variance);

    return {
      count,
      avg: avgNum.toFixed(1),
      sd: sdNum.toFixed(1),
      sdNum: sdNum,
      minVal: Math.min(...data),
      maxVal: Math.max(...data)
    };
  };

  const startSetup = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(code);
    setRole('setup');
  };

  const startPresentation = () => {
    setCurrentQuestionIndex(1);
    setIsQuestionActive(true);
    setAllAnswers({});
    setRole('presenter');
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (inputCode.trim().length > 0) {
      setRoomCode(inputCode.trim());
      setRole('participant');
    }
  };

  const currentQuestionAnswers = allAnswers[currentQuestionIndex] || [];

  const submitAnswer = () => {
    const val = Number(currentAnswer);
    setAllAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: [...(prev[currentQuestionIndex] || []), val]
    }));
    setHasSubmitted(true);
  };

  const toggleQuestionStatus = () => {
    setIsQuestionActive(!isQuestionActive);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsQuestionActive(true);
      setHasSubmitted(false);
      setCurrentAnswer(50);
    } else {
      setRole('summary');
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lvef-eyeballing.vercel.app';
  const joinUrl = `${currentUrl}?room=${roomCode}`;
  const currentStats = calcStats(currentQuestionAnswers);

  // Välkomstsida
  if (!role) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '2.8rem', marginBottom: '10px', color: '#38bdf8', fontWeight: 'bold' }}>lvef-eyeballing</h1>
        <p style={{ color: '#94a3b8', marginBottom: '40px', textAlign: 'center', fontSize: '1.1rem' }}>Visuell bedömning och realtidssammanställning för föreläsningar</p>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={startSetup} style={{ backgroundColor: '#2563eb', color: 'white', padding: '16px 32px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Starta som Föreläsare
          </button>

          <form onSubmit={joinRoom} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Rumskod"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', fontSize: '1rem', width: '130px', textAlign: 'center' }}
            />
            <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
              Anslut
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Föreläsare: Inställningar innan start
  if (role === 'setup') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '20px', border: '1px solid #334155', maxWidth: '450px', width: '100%' }}>
          <h2 style={{ marginTop: 0, color: '#38bdf8' }}>Konfigurera föreläsning</h2>
          <p style={{ color: '#94a3b8' }}>Välj hur många frågor/fall som ingår i din presentation.</p>

          <div style={{ margin: '30px 0' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#cbd5e1', fontWeight: 'bold' }}>Antal frågor:</label>
            <input
              type="number"
              min="1"
              max="30"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '1.2rem', textAlign: 'center' }}
            />
          </div>

          <button onClick={startPresentation} style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Starta rum ({roomCode})
          </button>
        </div>
      </div>
    );
  }

  // Föreläsare: Live vy för aktiv fråga
  if (role === 'presenter') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '30px', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#38bdf8' }}>lvef-eyeballing</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#f8fafc' }}>Fråga {currentQuestionIndex} av {totalQuestions}</h2>
              <span style={{ backgroundColor: isQuestionActive ? '#065f46' : '#991b1b', color: isQuestionActive ? '#34d399' : '#fca5a5', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                {isQuestionActive ? '● Röstning öppen' : '🔒 Röstning avslutad'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#1e293b', padding: '12px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>RUMSKOD</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '2px', color: '#f59e0b' }}>{roomCode}</div>
            </div>
            <div style={{ background: 'white', padding: '4px', borderRadius: '6px' }}>
              <QRCode value={joinUrl} size={56} />
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '25px' }}>
          {/* Grafsektion */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' }}>
            <h3 style={{ marginTop: 0, color: '#cbd5e1' }}>Svarsfördelning (Violinplott)</h3>
            {currentQuestionAnswers.length > 0 ? (
              <Plot
                data={[
                  {
                    type: 'violin',
                    y: currentQuestionAnswers,
                    points: 'all',
                    jitter: 0.3,
                    pointpos: -0.8,
                    box: { visible: true },
                    meanline: { visible: true },
                    fillcolor: '#38bdf8',
                    line: { color: '#0284c7' },
                    marker: { color: '#f59e0b', size: 8 },
                    name: 'EF %'
                  }
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#f8fafc' },
                  yaxis: { range: [10, 80], dtick: 10, gridcolor: '#334155', title: 'Angivet värde (10-80)' },
                  xaxis: { showticklabels: false },
                  margin: { l: 50, r: 40, t: 20, b: 20 }
                }}
                style={{ width: '100%', height: '420px' }}
                config={{ displayModeBar: false }}
              />
            ) : (
              <div style={{ height: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <BarChart2 size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>Väntar på att deltagarna ska skicka sina svar...</p>
              </div>
            )}
          </div>

          {/* Statistikpaneler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Antal svar</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f8fafc' }}>{currentStats.count}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Medelvärde</div>
              <div style={{ fontSize: '2.3rem', fontWeight: 'bold', color: '#38bdf8' }}>{currentStats.avg}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Standardavvikelse (SD)</div>
              <div style={{ fontSize: '2.3rem', fontWeight: 'bold', color: '#a855f7' }}>{currentStats.sd}</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Min / Max</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {currentStats.count > 0 ? `${currentStats.minVal} / ${currentStats.maxVal}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Kontroller */}
        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setRole(null)} style={{ backgroundColor: '#334155', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Avsluta föreläsning
          </button>

          <div style={{ display: 'flex', gap: '15px' }}>
            {isQuestionActive ? (
              <button onClick={toggleQuestionStatus} style={{ backgroundColor: '#dc2626', color: 'white', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> Avsluta röstning för Fråga {currentQuestionIndex}
              </button>
            ) : (
              <button onClick={goToNextQuestion} style={{ backgroundColor: '#2563eb', color: 'white', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentQuestionIndex < totalQuestions ? `Gå till Fråga ${currentQuestionIndex + 1} →` : 'Visa Slutsammanfattning →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Föreläsare: Slutsammanfattning sorterad på Standardavvikelse (SD)
  if (role === 'summary') {
    const summaryList = Array.from({ length: totalQuestions }, (_, i) => {
      const qNum = i + 1;
      const qAnswers = allAnswers[qNum] || [];
      const stats = calcStats(qAnswers);
      return { qNum, answers: qAnswers, ...stats };
    }).sort((a, b) => b.sdNum - a.sdNum); // Sorterat på störst SD först

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '30px', fontFamily: 'sans-serif' }}>
        <header style={{ marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#38bdf8' }}>Sammanfattning – Spridning & Variabilitet</h1>
            <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Frågorna nedan är sorterade efter <strong>störst standardavvikelse (SD)</strong> för att belysa de svåraste fallen.</p>
          </div>
          <button onClick={() => setRole(null)} style={{ backgroundColor: '#334155', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Stäng
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {summaryList.map((item, index) => (
            <div key={item.qNum} style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.3rem' }}>Fråga {item.qNum}</h3>
                  <span style={{ backgroundColor: index === 0 ? '#581c87' : '#0f172a', color: index === 0 ? '#c084fc' : '#94a3b8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Rank #{index + 1} i spricka
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SD (Spridning)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#a855f7' }}>{item.sd}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Medelvärde</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#38bdf8' }}>{item.avg}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div>• <strong>Antal svar:</strong> {item.count}</div>
                  <div>• <strong>Min / Max:</strong> {item.count > 0 ? `${item.minVal} / ${item.maxVal}` : '-'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Deltagare Vy
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#064e3b', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#047857', borderRadius: '16px', padding: '25px', border: '1px solid #059669' }}>
        <h2 style={{ margin: '0 0 5px 0', textAlign: 'center', color: '#a7f3d0' }}>lvef-eyeballing</h2>
        <p style={{ textAlign: 'center', color: '#d1fae5', fontSize: '0.9rem', marginBottom: '25px' }}>
          Rum: <strong>{roomCode}</strong> | Fråga {currentQuestionIndex} av {totalQuestions}
        </p>

        {!isQuestionActive ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Lock size={48} color="#fca5a5" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#fecdd3', margin: '0 0 10px 0' }}>Röstningen är stängd</h3>
            <p style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Föreläsaren går strax vidare till nästa fråga...</p>
          </div>
        ) : !hasSubmitted ? (
          <div>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Ange din visuella bedömning (10-80 %):
            </label>
            <div style={{ fontSize: '3.5rem', textAlign: 'center', fontWeight: 'bold', color: '#fef08a', marginBottom: '20px' }}>
              {currentAnswer} %
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
            <CheckCircle size={56} color="#a7f3d0" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#ecfdf5', margin: '0 0 10px 0' }}>Svaret är registrerat!</h3>
            <p style={{ color: '#a7f3d0', fontSize: '1rem' }}>Ditt svar för fråga {currentQuestionIndex}: <strong>{currentAnswer} %</strong></p>
            <p style={{ color: '#d1fae5', fontSize: '0.85rem', marginTop: '20px' }}>Vänta tills föreläsaren avslutar frågan...</p>
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
