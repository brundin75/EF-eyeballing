import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'react-qr-code';
import Plot from 'react-plotly.js';
import { CheckCircle, Lock, Play, BarChart2, Clock, ArrowRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';

// =========================================================================
// FIREBASE KONFIGURATION (LVEF-Eyeballing)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCzSVIr2jy9uu8Ok_SSTXdi-T9F5jaf0HQ",
  authDomain: "lvef-eyeballing.firebaseapp.com",
  databaseURL: "https://lvef-eyeballing-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lvef-eyeballing",
  storageBucket: "lvef-eyeballing.firebasestorage.app",
  messagingSenderId: "245542008658",
  appId: "1:245542008658:web:5cf6cae5d7cfe679b02c8b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [role, setRole] = useState(null); // null | 'setup' | 'presenter' | 'summary' | 'participant'
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  
  // Föreläsare & Synkade tillstånd
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [questionStatus, setQuestionStatus] = useState('pending'); // 'pending' | 'active' | 'closed'
  
  // Alla svar från databasen: { [qNum]: [svar1, svar2, ...] }
  const [allAnswers, setAllAnswers] = useState({});
  
  // Deltagare
  const [currentAnswer, setCurrentAnswer] = useState(50);
  const [mySubmittedAnswer, setMySubmittedAnswer] = useState(null);

  // Anslut via direktlänk/QR-kod (?room=1234)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qRoom = params.get('room');
      if (qRoom) {
        setInputCode(qRoom);
        setRoomCode(qRoom);
        setRole('participant');
      }
    }
  }, []);

  // Lyssna på rumsinfo från Firebase
  useEffect(() => {
    if (!roomCode) return;
    const infoRef = ref(db, `rooms/${roomCode}/info`);
    const unsubscribe = onValue(infoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTotalQuestions(data.totalQuestions || 5);
        setCurrentQuestionIndex(data.currentQuestion || 1);
        setQuestionStatus(data.status || 'pending');
      }
    });
    return () => unsubscribe();
  }, [roomCode]);

  // Lyssna på alla inkommande svar i realtid
  useEffect(() => {
    if (!roomCode) return;
    const answersRef = ref(db, `rooms/${roomCode}/answers`);
    const unsubscribe = onValue(answersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formatted = {};
      Object.keys(data).forEach((qNum) => {
        const qObj = data[qNum] || {};
        formatted[qNum] = Object.values(qObj).map(Number);
      });
      setAllAnswers(formatted);
    });
    return () => unsubscribe();
  }, [roomCode]);

  // Kontrollera om deltagaren redan svarat på den aktuella frågan (via localStorage)
  useEffect(() => {
    if (role === 'participant' && roomCode && currentQuestionIndex) {
      const saved = localStorage.getItem(`ans_${roomCode}_q${currentQuestionIndex}`);
      if (saved !== null) {
        setMySubmittedAnswer(Number(saved));
      } else {
        setMySubmittedAnswer(null);
      }
    }
  }, [role, roomCode, currentQuestionIndex]);

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
    set(ref(db, `rooms/${roomCode}/info`), {
      totalQuestions: Number(totalQuestions),
      currentQuestion: 1,
      status: 'pending'
    });
    setRole('presenter');
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (inputCode.trim().length > 0) {
      const code = inputCode.trim();
      setRoomCode(code);
      setRole('participant');
    }
  };

  const currentQuestionAnswers = allAnswers[currentQuestionIndex] || [];

  // Deltagare skickar svar (Endast 1 per fråga tillåts)
  const submitAnswer = () => {
    if (mySubmittedAnswer !== null || questionStatus !== 'active') return;

    const val = Number(currentAnswer);
    const ansRef = ref(db, `rooms/${roomCode}/answers/${currentQuestionIndex}`);
    const newRef = push(ansRef);

    set(newRef, val)
      .then(() => {
        localStorage.setItem(`ans_${roomCode}_q${currentQuestionIndex}`, val.toString());
        setMySubmittedAnswer(val);
      })
      .catch((err) => {
        console.error("Fel vid sparande av svar:", err);
        alert("Kunde inte skicka svar: " + err.message);
      });
  };

  // Föreläsare: Starta röstning
  const handleStartQuestion = () => {
    set(ref(db, `rooms/${roomCode}/info/status`), 'active');
  };

  // Föreläsare: Avsluta röstning
  const handleCloseQuestion = () => {
    set(ref(db, `rooms/${roomCode}/info/status`), 'closed');
  };

  // Föreläsare: Gå till nästa fråga
  const handleNextQuestion = () => {
    const nextQ = currentQuestionIndex + 1;
    if (nextQ <= totalQuestions) {
      set(ref(db, `rooms/${roomCode}/info`), {
        totalQuestions: Number(totalQuestions),
        currentQuestion: nextQ,
        status: 'pending'
      });
    } else {
      setRole('summary');
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lvef-eyeballing.vercel.app';
  const joinUrl = `${currentUrl}?room=${roomCode}`;
  const currentStats = calcStats(currentQuestionAnswers);

  // 1. Välkomstsida
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

  // 2. Föreläsare: Inställningar innan start
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

  // 3. Föreläsare: Live vy
  if (role === 'presenter') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '30px', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#38bdf8' }}>lvef-eyeballing</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#f8fafc' }}>Fråga {currentQuestionIndex} av {totalQuestions}</h2>
              
              {questionStatus === 'pending' && (
                <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={14} /> Väntar på start
                </span>
              )}
              {questionStatus === 'active' && (
                <span style={{ backgroundColor: '#065f46', color: '#34d399', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ● Röstning pågår
                </span>
              )}
              {questionStatus === 'closed' && (
                <span style={{ backgroundColor: '#991b1b', color: '#fca5a5', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Lock size={14} /> Röstning avslutad
                </span>
              )}
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
                <p>{questionStatus === 'pending' ? 'Klicka på "Starta röstning" nedan för att ta emot svar.' : 'Väntar på första svaret...'}</p>
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

        {/* Dynamiska styrknappar */}
        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setRole(null)} style={{ backgroundColor: '#334155', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Avsluta föreläsning
          </button>

          <div style={{ display: 'flex', gap: '15px' }}>
            {questionStatus === 'pending' && (
              <button onClick={handleStartQuestion} style={{ backgroundColor: '#10b981', color: 'white', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} /> Starta röstning för Fråga {currentQuestionIndex}
              </button>
            )}

            {questionStatus === 'active' && (
              <button onClick={handleCloseQuestion} style={{ backgroundColor: '#dc2626', color: 'white', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> Avsluta röstning & Lås resultat
              </button>
            )}

            {questionStatus === 'closed' && (
              <button onClick={handleNextQuestion} style={{ backgroundColor: '#2563eb', color: 'white', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentQuestionIndex < totalQuestions ? `Gå till Fråga ${currentQuestionIndex + 1} →` : 'Visa Slutsammanfattning →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Slutsammanfattning
  if (role === 'summary') {
    const summaryList = Array.from({ length: totalQuestions }, (_, i) => {
      const qNum = i + 1;
      const qAnswers = allAnswers[qNum] || [];
      const stats = calcStats(qAnswers);
      return { qNum, answers: qAnswers, ...stats };
    }).sort((a, b) => b.sdNum - a.sdNum);

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

  // 5. Deltagare Vy
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#064e3b', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#047857', borderRadius: '16px', padding: '25px', border: '1px solid #059669' }}>
        <h2 style={{ margin: '0 0 5px 0', textAlign: 'center', color: '#a7f3d0' }}>lvef-eyeballing</h2>
        <p style={{ textAlign: 'center', color: '#d1fae5', fontSize: '0.9rem', marginBottom: '25px' }}>
          Rum: <strong>{roomCode}</strong> | Fråga {currentQuestionIndex} av {totalQuestions}
        </p>

        {/* Om deltagaren redan svarat */}
        {mySubmittedAnswer !== null ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <CheckCircle size={56} color="#a7f3d0" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#ecfdf5', margin: '0 0 10px 0' }}>Svaret är registrerat!</h3>
            <p style={{ color: '#a7f3d0', fontSize: '1.1rem' }}>Ditt svar för fråga {currentQuestionIndex}: <strong>{mySubmittedAnswer} %</strong></p>
            <p style={{ color: '#d1fae5', fontSize: '0.85rem', marginTop: '20px' }}>Du har svarat på denna fråga. Vänta tills föreläsaren byter fråga...</p>
          </div>
        ) : questionStatus === 'pending' ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Clock size={48} color="#93c5fd" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#e0f2fe', margin: '0 0 10px 0' }}>Gör dig redo!</h3>
            <p style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Föreläsaren har inte startat röstningen för fråga {currentQuestionIndex} än.</p>
          </div>
        ) : questionStatus === 'closed' ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Lock size={48} color="#fca5a5" style={{ margin: '0 auto 15px auto' }} />
            <h3 style={{ color: '#fecdd3', margin: '0 0 10px 0' }}>Röstningen är stängd</h3>
            <p style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Inga fler svar tas emot för denna fråga. Vänta på nästa fråga...</p>
          </div>
        ) : (
          /* Aktiv röstning */
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
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
