import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'react-qr-code';
import Plot from 'react-plotly.js';
import { CheckCircle, Lock, Play, BarChart2, Clock, KeyRound } from 'lucide-react';
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
  const [role, setRole] = useState(null); // null | 'password' | 'setup' | 'presenter' | 'summary' | 'participant'
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  
  // Lösenordsskydd för föreläsare
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

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

  // Kontrollera om deltagaren redan svarat på den aktuella frågan
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

  const openPasswordPrompt = () => {
    setPasswordInput('');
    setPasswordError(false);
    setRole('password');
  };

  const verifyPassword = (e) => {
    e.preventDefault();
    if (passwordInput === 'brundino') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
      setPasswordError(false);
      setRole('setup');
    } else {
      setPasswordError(true);
    }
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

  // Deltagare skickar svar
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

  // Föreläsare: Styrknappar
  const handleStartQuestion = () => {
    set(ref(db, `rooms/${roomCode}/info/status`), 'active');
  };

  const handleCloseQuestion = () => {
    set(ref(db, `rooms/${roomCode}/info/status`), 'closed');
  };

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
          <button onClick={openPasswordPrompt} style={{ backgroundColor: '#2563eb', color: 'white', padding: '16px 32px', borderRadius: '12px', border: 'none', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={20} /> Starta som Föreläsare
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

  // 1b. Lösenordskontroll
  if (role === 'password') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <form onSubmit={verifyPassword} style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '20px', border: '1px solid #334155', maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <KeyRound size={48} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
            <h2 style={{ margin: 0, color: '#f8fafc' }}>Behörighetskontroll</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '5px' }}>Ange föreläsarlösenordet för att fortsätta.</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Ange lösenord"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: passwordError ? '2px solid #ef4444' : '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '1.1rem', boxSizing: 'border-box', textAlign: 'center' }}
            />
            {passwordError && (
              <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center', marginBotton: 0 }}>
                Fel lösenord. Försök igen!
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => setRole(null)} style={{ flex: 1, backgroundColor: '#334155', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Avbryt
            </button>
            <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Lås upp
            </button>
          </div>
        </form>
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
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '1.2rem', textAlign: 'center', boxSizing: 'border-box' }}
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding
