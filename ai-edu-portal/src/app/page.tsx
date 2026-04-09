'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type Tab = 'Home' | 'AI Tutor' | 'Notes Summarizer' | 'Quiz Generator' | 'Progress Tracker';
type Role = 'user' | 'ai';
type Theme = 'dark' | 'light' | 'ocean' | 'forest';
type FontSize = 'small' | 'medium' | 'large';
interface Message { role: Role; text: string; }
interface Conversation { _id?: string; id?: string; title: string; messages: Message[]; updatedAt?: string; }
interface QuizQ { q: string; options: string[]; answer: string; explanation?: string; }
interface QuizResult { score: number; total: number; details: { q: string; chosen: string; correct: string; ok: boolean; explanation?: string }[]; }
interface UserProfile { id: string; name: string; email: string; avatar: string; profilePic: string; purpose: string; }
interface TopicStat { topic: string; asked: number; correct: number; }

const AVATARS = ['🧑','👩','👨','🧒','👧','🧑‍💻','👩‍💻','👨‍🎓','👩‍🎓','🦊','🐼','🦁','🐯','🦋','🌟'];
const PURPOSES = [
  { id: 'student', label: 'Student', icon: '🎓', desc: 'Exams & assignments' },
  { id: 'professional', label: 'Professional', icon: '💼', desc: 'Career upskilling' },
  { id: 'self', label: 'Self Learning', icon: '📚', desc: 'Learning by curiosity' },
  { id: 'teacher', label: 'Teacher', icon: '👩‍🏫', desc: 'Teaching materials' },
  { id: 'researcher', label: 'Researcher', icon: '🔬', desc: 'Academic research' },
];

const DEFAULT_COURSES = [
  { id: 'python', title: 'Python Basics', icon: '🐍', desc: 'Variables, loops, functions & OOP', color: '#3b82f6', topic: 'Python programming basics for beginners' },
  { id: 'math', title: 'Mathematics', icon: '📐', desc: 'Algebra, geometry & calculus', color: '#8b5cf6', topic: 'Mathematics fundamentals algebra geometry calculus' },
  { id: 'science', title: 'General Science', icon: '🔬', desc: 'Physics, chemistry & biology', color: '#10b981', topic: 'General science physics chemistry biology' },
  { id: 'history', title: 'World History', icon: '🌍', desc: 'Key events & civilizations', color: '#f59e0b', topic: 'World history major events civilizations' },
  { id: 'english', title: 'English Grammar', icon: '📝', desc: 'Grammar, vocabulary & writing', color: '#ef4444', topic: 'English grammar vocabulary writing skills' },
  { id: 'ai', title: 'AI & Machine Learning', icon: '🤖', desc: 'Intro to AI concepts', color: '#ec4899', topic: 'Artificial intelligence machine learning basics' },
];

const themes = {
  dark:   { bg:'#0f172a',bg2:'#1e293b',bg3:'#1e293b',card:'#1e293b',sidebar:'#0a0f1e',sidebarBorder:'rgba(255,255,255,0.07)',text:'#f1f5f9',text2:'#94a3b8',text3:'#475569',border:'rgba(255,255,255,0.1)',input:'#0f172a',msgAi:'#1e293b',msgAiBorder:'rgba(255,255,255,0.08)',msgAiText:'#f1f5f9',topbar:'#0a0f1e',main:'#0d1117' },
  light:  { bg:'#f0f4fa',bg2:'#fff',bg3:'#f8faff',card:'#fff',sidebar:'#1e2d4f',sidebarBorder:'rgba(255,255,255,0.07)',text:'#1a1d2e',text2:'#6b7280',text3:'#9ca3af',border:'#e8edf5',input:'#fff',msgAi:'#f8faff',msgAiBorder:'#e8edf5',msgAiText:'#1a1d2e',topbar:'#fff',main:'#f0f4fa' },
  ocean:  { bg:'#0a1628',bg2:'#0d2137',bg3:'#0d2137',card:'#0d2137',sidebar:'#060e1a',sidebarBorder:'rgba(0,200,255,0.1)',text:'#e0f7ff',text2:'#7ec8e3',text3:'#4a8fa8',border:'rgba(0,200,255,0.15)',input:'#0a1628',msgAi:'#0d2137',msgAiBorder:'rgba(0,200,255,0.1)',msgAiText:'#e0f7ff',topbar:'#060e1a',main:'#060e1a' },
  forest: { bg:'#0d1f0f',bg2:'#132715',bg3:'#132715',card:'#132715',sidebar:'#091209',sidebarBorder:'rgba(100,255,100,0.08)',text:'#e8f5e9',text2:'#81c784',text3:'#4caf50',border:'rgba(100,200,100,0.15)',input:'#0d1f0f',msgAi:'#132715',msgAiBorder:'rgba(100,200,100,0.1)',msgAiText:'#e8f5e9',topbar:'#091209',main:'#091209' },
};

const fontSizes = { small: 12, medium: 14, large: 16 };

function checkPassword(p: string): { score: number; label: string; color: string; tips: string[] } {
  const tips: string[] = []; let score = 0;
  if (p.length >= 8) score++; else tips.push('At least 8 characters');
  if (/[A-Z]/.test(p)) score++; else tips.push('One uppercase letter');
  if (/[a-z]/.test(p)) score++; else tips.push('One lowercase letter');
  if (/[0-9]/.test(p)) score++; else tips.push('One number');
  if (/[^A-Za-z0-9]/.test(p)) score++; else tips.push('One special character (!@#$)');
  const labels = ['','Weak','Fair','Good','Strong','Very Strong'];
  const colors = ['','#ef4444','#f97316','#f59e0b','#22c55e','#3b82f6'];
  return { score, label: labels[score] || '', color: colors[score] || '', tips };
}

function cleanForSpeech(text: string): string {
  return text.replace(/\*\*/g,'').replace(/\*/g,'').replace(/_/g,'').replace(/#{1,6}\s/g,'').replace(/`{1,3}/g,'').replace(/[^\x00-\x7F]/g,'').replace(/\n{2,}/g,'. ').replace(/\n/g,' ').replace(/\s+/g,' ').trim();
}

function formatText(text: string, color: string, fs = 14) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <p key={i} style={{ margin: '3px 0', lineHeight: 1.8, fontSize: fs, color }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
  });
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 1) return 'just now'; if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`; return `${Math.floor(diff / 1440)}d ago`;
}

// ── STREAK HELPER ──
function getStreak(): number {
  try {
    const raw = localStorage.getItem('eduai_streak');
    if (!raw) return 0;
    const { streak, lastDate } = JSON.parse(raw);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastDate === today) return streak;
    if (lastDate === yesterday) return streak;
    return 0;
  } catch { return 0; }
}

function updateStreak(): number {
  try {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const raw = localStorage.getItem('eduai_streak');
    let streak = 1;
    if (raw) {
      const { streak: s, lastDate } = JSON.parse(raw);
      if (lastDate === today) return s;
      if (lastDate === yesterday) streak = s + 1;
      else streak = 1;
    }
    localStorage.setItem('eduai_streak', JSON.stringify({ streak, lastDate: today }));
    return streak;
  } catch { return 1; }
}

// ── AUTH PAGE ──
function AuthPage({ onLogin }: { onLogin: (u: UserProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'auth' | 'otp' | 'purpose'>('auth');
  const [otp, setOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [purpose, setPurpose] = useState('');
  const pw = pass ? checkPassword(pass) : null;

  const handleAuth = async () => {
    setError(''); setSuccess('');
    if (!email.trim() || !pass.trim()) { setError('Please fill all fields'); return; }
    if (mode === 'signup') {
      if (!name.trim()) { setError('Name is required'); return; }
      if (!email.includes('@') || !email.includes('.')) { setError('Enter a valid email address'); return; }
      if (!pw || pw.score < 3) { setError('Password too weak — needs uppercase, lowercase, number, special char'); return; }
      if (pass !== confirm) { setError('Passwords do not match'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        // Send OTP first
        const otpRes = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name }) });
        const otpData = await otpRes.json();
        if (otpData.error) { setError(otpData.error); setLoading(false); return; }
        setOtp(otpData.otp); // store for verification (in production, don't return OTP — verify server-side)
        setStep('otp');
        setSuccess(`OTP sent to ${email}! Check your inbox.`);
      } else {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
        const data = await res.json();
        if (data.error) { setError(data.error); setLoading(false); return; }
        onLogin({ id: data.id, name: data.name, email: data.email, avatar: data.avatar || '🧑', profilePic: data.profilePic || '', purpose: data.purpose || '' });
      }
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otpInput.trim() !== otp.trim()) { setError('Incorrect OTP. Please try again.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password: pass, avatar: '🧑', purpose: '' }) });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSuccess('Account created! Now choose your purpose:');
      setPendingUser({ id: data.id, name: data.name, email: data.email, avatar: data.avatar, profilePic: '', purpose: '' });
      setStep('purpose');
    } catch { setError('Connection error. Please try again.'); }
    setLoading(false);
  };

  const handlePurpose = (skip = false) => {
    if (!pendingUser) return;
    onLogin({ ...pendingUser, purpose: skip ? '' : purpose });
  };

  if (step === 'otp') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}.ainput{width:100%;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;font-size:14px;color:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color 0.2s}.ainput:focus{border-color:#60a5fa}.ainput::placeholder{color:rgba(255,255,255,0.3)}`}</style>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, animation: 'pop 0.4s ease' }}>📧</div>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '10px 0 6px', fontFamily: "'Outfit',sans-serif" }}>Verify Your Email</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Enter the OTP sent to <strong style={{ color: '#60a5fa' }}>{email}</strong></p>
          </div>
          {success && <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#86efac', marginBottom: 16 }}>{success}</div>}
          {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16, animation: 'pop 0.3s ease' }}>⚠ {error}</div>}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: .5, display: 'block', marginBottom: 6 }}>ENTER OTP</label>
            <input className="ainput" type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} placeholder="6-digit OTP" maxLength={6} style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} />
          </div>
          <button onClick={handleVerifyOtp} disabled={loading || otpInput.length < 4} style={{ width: '100%', padding: '13px', background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>
            {loading ? 'Verifying...' : 'Verify OTP →'}
          </button>
          <button onClick={() => { setStep('auth'); setError(''); setSuccess(''); }} style={{ width: '100%', padding: '10px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        </div>
      </div>
    </div>
  );

  if (step === 'purpose' && pendingUser) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ width: '100%', maxWidth: 500, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 42, animation: 'pop 0.4s ease' }}>🎯</div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '10px 0 6px', fontFamily: "'Outfit',sans-serif" }}>What brings you here?</h2>
          {success && <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#86efac', marginTop: 10 }}>{success}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PURPOSES.map((p, i) => (
            <button key={p.id} onClick={() => setPurpose(p.id)} style={{ padding: '14px 18px', background: purpose === p.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${purpose === p.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s', animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
              <span style={{ fontSize: 26 }}>{p.icon}</span>
              <div><div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.label}</div><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{p.desc}</div></div>
              {purpose === p.id && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: 20 }}>✓</span>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={() => handlePurpose(true)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
          <button onClick={() => handlePurpose(false)} disabled={!purpose} style={{ flex: 2, padding: '12px', background: purpose ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: purpose ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: purpose ? 1 : 0.5 }}>Continue →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes pop{0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}.ainput{width:100%;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;font-size:14px;color:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color 0.2s}.ainput:focus{border-color:#60a5fa}.ainput::placeholder{color:rgba(255,255,255,0.3)}`}</style>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28, animation: 'float 3s ease-in-out infinite' }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Outfit',sans-serif" }}>EduAI Portal</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>Your intelligent learning companion</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent', color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
                {m === 'login' ? 'Login' : 'Create Account'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && <div><label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: .5, display: 'block', marginBottom: 6 }}>FULL NAME</label><input className="ainput" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>}
            <div><label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: .5, display: 'block', marginBottom: 6 }}>EMAIL ADDRESS</label><input className="ainput" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: .5, display: 'block', marginBottom: 6 }}>PASSWORD</label>
              <input className="ainput" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder={mode === 'signup' ? 'Strong password required' : 'Password'} />
              {mode === 'signup' && pass && pw && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>{[1, 2, 3, 4, 5].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pw.score ? pw.color : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />)}</div>
                  <div style={{ fontSize: 11, color: pw.color, fontWeight: 600 }}>{pw.label}</div>
                  {pw.tips.length > 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Missing: {pw.tips.join(' • ')}</div>}
                </div>
              )}
            </div>
            {mode === 'signup' && <div><label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: .5, display: 'block', marginBottom: 6 }}>CONFIRM PASSWORD</label><input className="ainput" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Repeat password" />{confirm && pass !== confirm && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>Passwords do not match</div>}</div>}
            {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', animation: 'pop 0.3s ease' }}>⚠ {error}</div>}
            <button onClick={handleAuth} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
              {loading ? 'Please wait...' : (mode === 'login' ? 'Login →' : 'Send OTP →')}
            </button>
          </div>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 18 }}>
            {mode === 'login' ? "No account? " : "Have account? "}
            <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>{mode === 'login' ? 'Create Account' : 'Login'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE MODAL ──
function ProfileModal({ user, onUpdate, onClose, t }: { user: UserProfile; onUpdate: (u: UserProfile) => void; onClose: () => void; t: typeof themes.light }) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [profilePic, setProfilePic] = useState(user.profilePic || '');
  const [tab, setTab] = useState<'avatar' | 'photo'>('avatar');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamObj, setStreamObj] = useState<MediaStream | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setProfilePic(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStreamObj(s); setStreaming(true);
      setTimeout(() => { if (cameraRef.current) { cameraRef.current.srcObject = s; cameraRef.current.play(); } }, 100);
    } catch { alert('Camera not available'); }
  };

  const takePhoto = () => {
    if (!cameraRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraRef.current.videoWidth; canvas.height = cameraRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(cameraRef.current, 0, 0);
    setProfilePic(canvas.toDataURL('image/jpeg', 0.8));
    streamObj?.getTracks().forEach(t => t.stop()); setStreaming(false);
  };

  const stopCamera = () => { streamObj?.getTracks().forEach(t => t.stop()); setStreaming(false); };
  useEffect(() => () => { streamObj?.getTracks().forEach(t => t.stop()); }, [streamObj]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, name, avatar, profilePic }) });
      const data = await res.json();
      if (!data.error) onUpdate({ ...user, name, avatar: data.avatar, profilePic: data.profilePic });
    } catch { console.error('Failed to save profile'); }
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: t.card, borderRadius: 20, padding: 28, width: 420, border: `1px solid ${t.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto', animation: 'popIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: t.text, fontWeight: 700, fontSize: 17, marginBottom: 20 }}>Edit Profile</h3>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {profilePic ? <img src={profilePic} alt="profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${t.border}` }} /> : <div style={{ fontSize: 60, margin: '0 auto' }}>{avatar}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['avatar', 'photo'] as const).map(tb => <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, padding: '9px', border: `2px solid ${tab === tb ? '#3b82f6' : t.border}`, borderRadius: 10, background: tab === tb ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: tab === tb ? 600 : 400, color: tab === tb ? '#3b82f6' : t.text2, fontFamily: 'inherit' }}>{tb === 'avatar' ? '🎭 Avatar' : '📷 Photo'}</button>)}
        </div>
        {tab === 'avatar' && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>{AVATARS.map(a => <button key={a} onClick={() => { setAvatar(a); setProfilePic(''); }} style={{ width: 40, height: 40, fontSize: 22, border: `2px solid ${avatar === a && !profilePic ? '#3b82f6' : 'transparent'}`, borderRadius: 10, background: avatar === a && !profilePic ? 'rgba(59,130,246,0.15)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>{a}</button>)}</div>)}
        {tab === 'photo' && (
          <div style={{ marginBottom: 16 }}>
            {!streaming ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '10px', border: `1px solid ${t.border}`, borderRadius: 10, background: t.bg3, cursor: 'pointer', fontSize: 13, color: t.text, fontFamily: 'inherit' }}>📁 Upload</button>
                <button onClick={startCamera} style={{ flex: 1, padding: '10px', border: `1px solid ${t.border}`, borderRadius: 10, background: t.bg3, cursor: 'pointer', fontSize: 13, color: t.text, fontFamily: 'inherit' }}>📷 Camera</button>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <video ref={cameraRef} style={{ width: '100%', borderRadius: 12, marginBottom: 8 }} autoPlay muted />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={takePhoto} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>📸 Capture</button>
                  <button onClick={stopCamera} style={{ flex: 1, padding: '10px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 13, color: t.text2, fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
            {profilePic && <div style={{ display: 'flex', justifyContent: 'center' }}><button onClick={() => setProfilePic('')} style={{ padding: '6px 14px', border: `1px solid ${t.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#ef4444', fontFamily: 'inherit' }}>Remove Photo</button></div>}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: t.text2, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DISPLAY NAME</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 14, color: t.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: t.text2, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
          <div style={{ padding: '10px 14px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 14, color: t.text2 }}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', color: t.text2, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ──
function SettingsModal({ theme, setTheme, fontSize, setFontSize, onClose, t }: { theme: Theme; setTheme: (t: Theme) => void; fontSize: FontSize; setFontSize: (f: FontSize) => void; onClose: () => void; t: typeof themes.light }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: t.card, borderRadius: 20, padding: 28, width: 380, border: `1px solid ${t.border}`, animation: 'popIn 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: t.text, fontWeight: 700, fontSize: 17, marginBottom: 20 }}>⚙️ Settings</h3>

        {/* Theme */}
        <label style={{ color: t.text2, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>THEME</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {([['light', '☀️', 'Light'], ['dark', '🌙', 'Dark'], ['ocean', '🌊', 'Ocean'], ['forest', '🌿', 'Forest']] as [Theme, string, string][]).map(([th, icon, label]) => (
            <button key={th} onClick={() => setTheme(th)} style={{ padding: '12px', border: `2px solid ${theme === th ? '#3b82f6' : t.border}`, borderRadius: 12, background: theme === th ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: theme === th ? '#3b82f6' : t.text2 }}>{label}</span>
              {theme === th && <span style={{ marginLeft: 'auto', color: '#3b82f6' }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Font Size */}
        <label style={{ color: t.text2, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>FONT SIZE</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['small', 'medium', 'large'] as FontSize[]).map(fs => (
            <button key={fs} onClick={() => setFontSize(fs)} style={{ flex: 1, padding: '10px', border: `2px solid ${fontSize === fs ? '#3b82f6' : t.border}`, borderRadius: 10, background: fontSize === fs ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: fontSizes[fs], fontWeight: 600, color: fontSize === fs ? '#3b82f6' : t.text2, transition: 'all 0.2s', textTransform: 'capitalize' }}>
              {fs === 'small' ? 'A' : fs === 'medium' ? 'A' : 'A'}
              <div style={{ fontSize: 11, marginTop: 2, fontWeight: 400 }}>{fs}</div>
            </button>
          ))}
        </div>

        {/* Keyboard Shortcuts */}
        <label style={{ color: t.text2, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>KEYBOARD SHORTCUTS</label>
        <div style={{ background: t.bg3, borderRadius: 12, padding: 14, marginBottom: 20, border: `1px solid ${t.border}` }}>
          {[['Enter', 'Send message'], ['Ctrl+K', 'New chat'], ['Ctrl+/', 'Focus input']].map(([key, desc]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 12, color: t.text2 }}>{desc}</span>
              <span style={{ fontSize: 11, background: t.border, padding: '2px 8px', borderRadius: 6, color: t.text, fontWeight: 600 }}>{key}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>Done</button>
      </div>
    </div>
  );
}

// ── SIDEBAR ──
function Sidebar({ active, setActive, user, conversations, onSelectConv, selectedConv, onNewChat, onDeleteConv, streak }: { active: Tab; setActive: (t: Tab) => void; user: UserProfile; conversations: Conversation[]; onSelectConv: (c: Conversation) => void; selectedConv: string | null; onNewChat: () => void; onDeleteConv: (id: string) => void; streak: number }) {
  const tabs = [
    { id: 'Home' as Tab, icon: '🏠', label: 'Home' },
    { id: 'AI Tutor' as Tab, icon: '🤖', label: 'AI Tutor' },
    { id: 'Notes Summarizer' as Tab, icon: '📄', label: 'Summarizer' },
    { id: 'Quiz Generator' as Tab, icon: '📋', label: 'Quiz' },
    { id: 'Progress Tracker' as Tab, icon: '📊', label: 'Progress' },
  ];
  return (
    <aside style={{ width: 240, height: '100vh', flexShrink: 0, background: '#0a1628', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', position: 'sticky', top: 0 }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎓</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 13, fontFamily: "'Outfit',sans-serif" }}>EduAI Portal</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{PURPOSES.find(p => p.id === user.purpose)?.label || 'Learning'}</div>
        </div>
        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, padding: '3px 7px' }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fb923c' }}>{streak}</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 10px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 1.2, padding: '0 8px', marginBottom: 8 }}>MENU</div>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active === tab.id ? 600 : 400, width: '100%', background: active === tab.id ? 'rgba(59,130,246,0.18)' : 'transparent', color: active === tab.id ? '#93c5fd' : 'rgba(255,255,255,0.7)', transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit', borderLeft: `3px solid ${active === tab.id ? '#3b82f6' : 'transparent'}`, marginBottom: 2 }}>
            <span style={{ fontSize: 16 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Chat history — only scrollable part */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: 1.2 }}>CHAT HISTORY</div>
          <button onClick={onNewChat} style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>+ New</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {conversations.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 10px', fontStyle: 'italic' }}>No chats yet</div>}
          {[...conversations].reverse().map(conv => {
            const cid = (conv._id || conv.id || '');
            return (
              <div key={cid} style={{ position: 'relative', marginBottom: 3 }}>
                <button onClick={() => { onSelectConv(conv); setActive('AI Tutor'); }} style={{ width: '100%', padding: '9px 28px 9px 12px', borderRadius: 10, border: `1px solid ${selectedConv === cid ? 'rgba(59,130,246,0.4)' : 'transparent'}`, cursor: 'pointer', background: selectedConv === cid ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{conv.updatedAt ? timeAgo(conv.updatedAt) : ''} · {conv.messages.length} msgs</div>
                </button>
                <button onClick={() => onDeleteConv(cid)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user.profilePic ? <img src={user.profilePic} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ fontSize: 22 }}>{user.avatar}</span>}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── HOME TAB ──
function HomeTab({ user, setActive, onStartQuiz, t, fs }: { user: UserProfile; setActive: (tab: Tab) => void; onStartQuiz: (topic: string) => void; t: typeof themes.light; fs: number }) {
  const streak = getStreak();
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome */}
      <div style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: 20, padding: '24px 28px', color: '#fff' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>👋</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Welcome back, {user.name.split(' ')[0]}!</h2>
        <p style={{ fontSize: fs, opacity: 0.85, margin: 0 }}>Ready to learn something new today?</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>🔥</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{streak}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Day Streak</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>🎯</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{PURPOSES.find(p => p.id === user.purpose)?.label || 'Learner'}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Your Goal</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🤖', label: 'Ask AI Tutor', tab: 'AI Tutor' as Tab, color: '#3b82f6' },
            { icon: '📋', label: 'Take a Quiz', tab: 'Quiz Generator' as Tab, color: '#8b5cf6' },
            { icon: '📄', label: 'Summarize Notes', tab: 'Notes Summarizer' as Tab, color: '#10b981' },
            { icon: '📊', label: 'View Progress', tab: 'Progress Tracker' as Tab, color: '#f59e0b' },
          ].map(a => (
            <button key={a.tab} onClick={() => setActive(a.tab)} style={{ padding: '16px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, background: `${a.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{a.icon}</div>
              <span style={{ fontSize: fs, fontWeight: 600, color: t.text }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Default Courses */}
      <div>
        <h3 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, marginBottom: 12 }}>📚 Explore Courses</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {DEFAULT_COURSES.map((course, i) => (
            <div key={course.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
              <div style={{ width: 44, height: 44, background: `${course.color}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 10 }}>{course.icon}</div>
              <div style={{ fontSize: fs, fontWeight: 700, color: t.text, marginBottom: 4 }}>{course.title}</div>
              <div style={{ fontSize: fs - 2, color: t.text2, marginBottom: 12 }}>{course.desc}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setActive('AI Tutor')} style={{ flex: 1, padding: '7px', background: `${course.color}15`, border: `1px solid ${course.color}40`, borderRadius: 8, cursor: 'pointer', fontSize: fs - 2, color: course.color, fontWeight: 600, fontFamily: 'inherit' }}>Learn</button>
                <button onClick={() => onStartQuiz(course.topic)} style={{ flex: 1, padding: '7px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', fontSize: fs - 2, color: t.text2, fontFamily: 'inherit' }}>Quiz</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI TUTOR ──
function TutorTab({ onTopicUpdate, currentMessages, onMessagesChange, t, fs }: { onTopicUpdate: (q: string, isQuiz: boolean, correct?: number, total?: number) => void; currentMessages: Message[]; onMessagesChange: (msgs: Message[]) => void; t: typeof themes.light; fs: number }) {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQs, setQuizQs] = useState<QuizQ[]>([]);
  const [quizAns, setQuizAns] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [shareModal, setShareModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const messages = currentMessages.length > 0 ? currentMessages : [{ role: 'ai' as Role, text: 'Hello! I am your AI Tutor 🤖\n\nAsk me anything — science, history, coding, current affairs, or any topic. I remember our entire conversation so you can ask follow-up questions!' }];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const startListening = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Use Chrome for voice input'); return; }
    const r = new SR(); recognitionRef.current = r;
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onstart = () => setListening(true); r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false); r.start();
  };

  const handleSpeak = (text: string, idx: number) => {
    if (speaking === idx) { window.speechSynthesis.cancel(); setSpeaking(null); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utt.rate = 0.92; utt.onend = () => setSpeaking(null); utt.onerror = () => setSpeaking(null);
    setSpeaking(idx); window.speechSynthesis.speak(utt);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, '')); setCopied(idx); setTimeout(() => setCopied(null), 2000);
  };

  const isMeaningful = (q: string) => {
    const trivial = ['hello', 'hi', 'hey', 'ok', 'okay', 'yes', 'no', 'thanks', 'thank you', 'sure', 'great', 'good', 'nice', 'wow'];
    const words = q.trim().toLowerCase().split(/\s+/);
    return words.length >= 3 && !trivial.includes(words.join(' ')) && !trivial.includes(words[0]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    const newMsgs = [...messages, { role: 'user' as Role, text: q }];
    onMessagesChange(newMsgs); setInput(''); setLoading(true);
    try {
      const history = newMsgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.text }));
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history, level, mode: 'tutor' }) });
      const data = await res.json();
      onMessagesChange([...newMsgs, { role: 'ai', text: data.reply }]);
      if (isMeaningful(q)) onTopicUpdate(q, false);
    } catch { onMessagesChange([...newMsgs, { role: 'ai', text: 'Connection error. Check your API key.' }]); }
    setLoading(false);
  };

  const generateQuiz = async () => {
    const userMsgs = messages.filter(m => m.role === 'user' && isMeaningful(m.text)).map(m => m.text);
    const aiMsgs = messages.filter(m => m.role === 'ai').slice(1).map(m => m.text.slice(0, 200));
    if (userMsgs.length === 0) { alert('Ask some meaningful questions first!'); return; }
    setQuizLoading(true); setQuizResult(null); setQuizAns({});
    try {
      const context = `User asked about: ${userMsgs.slice(-4).join('; ')}. AI explained: ${aiMsgs.slice(-3).join('; ')}`;
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'quiz', content: context, difficulty: quizDifficulty }) });
      const data = await res.json();
      const parsed = JSON.parse(data.reply.replace(/```json|```/g, '').trim());
      setQuizQs(parsed.questions); setShowQuiz(true);
    } catch { alert('Error generating quiz.'); }
    setQuizLoading(false);
  };

  const submitQuiz = () => {
    const details = quizQs.map((q, i) => ({ q: q.q, chosen: quizAns[i] || 'Not answered', correct: q.answer, ok: (quizAns[i] || '').charAt(0) === q.answer.charAt(0), explanation: q.explanation }));
    const score = details.filter(d => d.ok).length;
    setQuizResult({ score, total: quizQs.length, details });
    if (score >= 3) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }
    const lastTopic = messages.filter(m => m.role === 'user' && isMeaningful(m.text)).slice(-1)[0]?.text || 'Quiz';
    onTopicUpdate(lastTopic, true, score, quizQs.length);
  };

  // Share chat
  const shareChat = () => setShareModal(true);
  const getChatText = () => messages.map(m => `${m.role === 'ai' ? '🤖 AI' : '👤 You'}: ${m.text}`).join('\n\n');

  if (showQuiz) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.card, borderRadius: 20, overflow: 'hidden', border: `1px solid ${t.border}`, position: 'relative' }}>
      {showConfetti && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden', borderRadius: 20 }}>{Array.from({ length: 45 }).map((_, i) => <div key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: i % 3 === 0 ? '50%' : '2px', background: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'][i % 6], left: `${Math.random() * 100}%`, top: '-10px', animation: `confettiFall ${1.5 + Math.random() * 2}s ease ${Math.random() * 0.8}s forwards` }} />)}</div>}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.bg3, flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0 }}>📋 Chat Quiz — <span style={{ color: quizDifficulty === 'easy' ? '#22c55e' : quizDifficulty === 'medium' ? '#f59e0b' : '#ef4444', textTransform: 'capitalize' }}>{quizDifficulty}</span></h2>
          <p style={{ fontSize: 12, color: t.text2, margin: '2px 0 0' }}>Based on your conversation</p>
        </div>
        <button onClick={() => { setShowQuiz(false); setQuizResult(null); setQuizAns({}); }} style={{ padding: '7px 14px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 12, color: t.text2, fontFamily: 'inherit' }}>← Back</button>
      </div>
      {!quizResult ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {quizQs.map((q, i) => (
              <div key={i} style={{ background: t.bg3, borderRadius: 14, padding: 16, border: `1px solid ${t.border}`, animation: `fadeUp 0.3s ease ${i * 0.08}s both` }}>
                <p style={{ fontWeight: 600, fontSize: fs, marginBottom: 12, color: t.text }}>Q{i + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, j) => <button key={j} onClick={() => setQuizAns(a => ({ ...a, [i]: opt }))} style={{ padding: '11px 14px', borderRadius: 10, border: `2px solid ${quizAns[i] === opt ? '#3b82f6' : t.border}`, background: quizAns[i] === opt ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: fs, textAlign: 'left', color: quizAns[i] === opt ? '#3b82f6' : t.text, fontWeight: quizAns[i] === opt ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>{opt}</button>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
            <button onClick={submitQuiz} disabled={Object.keys(quizAns).length < quizQs.length} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: fs, fontWeight: 600, opacity: Object.keys(quizAns).length < quizQs.length ? 0.5 : 1, fontFamily: 'inherit' }}>Submit ({Object.keys(quizAns).length}/{quizQs.length})</button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20, animation: 'pop 0.5s ease' }}>
            <div style={{ fontSize: 56 }}>{quizResult.score >= 4 ? '🏆' : quizResult.score >= 3 ? '👍' : '📚'}</div>
            <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>Score: {quizResult.score}/{quizResult.total}</h2>
            <p style={{ fontSize: fs, color: quizResult.score >= 4 ? '#16a34a' : quizResult.score >= 3 ? '#d97706' : '#dc2626', fontWeight: 600 }}>{quizResult.score >= 4 ? 'Excellent!' : quizResult.score >= 3 ? 'Good job!' : 'Keep practicing!'}</p>
          </div>
          {quizResult.details.map((d, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 12, marginBottom: 10, background: d.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${d.ok ? '#bbf7d0' : '#fecaca'}`, animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
              <p style={{ fontSize: fs, fontWeight: 600, marginBottom: 4, color: '#1a1d2e' }}>{i + 1}. {d.q}</p>
              <p style={{ fontSize: fs - 1, color: d.ok ? '#16a34a' : '#dc2626' }}>{d.chosen} {d.ok ? '✓' : '✗'}</p>
              {!d.ok && <p style={{ fontSize: fs - 1, color: '#16a34a', marginTop: 3 }}>✅ Correct: {d.correct}</p>}
              {!d.ok && d.explanation && <p style={{ fontSize: fs - 1, color: '#6b7280', marginTop: 6, padding: '8px 10px', background: '#f8faff', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>💡 {d.explanation}</p>}
            </div>
          ))}
          <button onClick={() => { setShowQuiz(false); setQuizResult(null); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: fs, fontWeight: 600, fontFamily: 'inherit', marginTop: 8 }}>Back to Chat</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.card, borderRadius: 20, overflow: 'hidden', border: `1px solid ${t.border}` }}>
      {/* Share modal */}
      {shareModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShareModal(false)}>
          <div style={{ background: t.card, borderRadius: 20, padding: 24, width: 440, border: `1px solid ${t.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'popIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: t.text, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📤 Share Chat</h3>
            <textarea readOnly value={getChatText()} style={{ width: '100%', height: 180, padding: 12, background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.text, resize: 'none', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => { navigator.clipboard.writeText(getChatText()); setShareModal(false); }} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>📋 Copy to Clipboard</button>
              <button onClick={() => { const blob = new Blob([getChatText()], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'chat.txt'; a.click(); URL.revokeObjectURL(url); }} style={{ flex: 1, padding: '10px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>⬇️ Download .txt</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.bg3, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Beginner', 'Intermediate', 'Advanced'].map(l => <button key={l} onClick={() => setLevel(l)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${level === l ? '#3b82f6' : t.border}`, background: level === l ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 12, color: level === l ? '#3b82f6' : t.text2, fontWeight: level === l ? 600 : 400, fontFamily: 'inherit' }}>{l}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Quiz difficulty */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {(['easy', 'medium', 'hard'] as const).map(d => <button key={d} onClick={() => setQuizDifficulty(d)} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${quizDifficulty === d ? (d === 'easy' ? '#22c55e' : d === 'medium' ? '#f59e0b' : '#ef4444') : t.border}`, background: quizDifficulty === d ? (d === 'easy' ? 'rgba(34,197,94,0.1)' : d === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent', cursor: 'pointer', fontSize: 11, color: quizDifficulty === d ? (d === 'easy' ? '#22c55e' : d === 'medium' ? '#f59e0b' : '#ef4444') : t.text2, fontFamily: 'inherit', textTransform: 'capitalize' }}>{d}</button>)}
          </div>
          <button onClick={shareChat} style={{ padding: '5px 10px', border: `1px solid ${t.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 12, color: t.text2, fontFamily: 'inherit' }}>📤 Share</button>
          <button onClick={generateQuiz} disabled={quizLoading} style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#3b82f6', fontWeight: 600, fontFamily: 'inherit' }}>{quizLoading ? '⏳' : '📋 Quiz'}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: `fadeUp 0.3s ease` }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: msg.role === 'ai' ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>{msg.role === 'ai' ? '🤖' : '👤'}</div>
            <div style={{ flex: 1, maxWidth: '85%' }}>
              <div style={{ background: msg.role === 'ai' ? t.msgAi : 'linear-gradient(135deg,#3b82f6,#2563eb)', border: msg.role === 'ai' ? `1px solid ${t.msgAiBorder}` : 'none', borderRadius: msg.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '10px 14px' }}>
                {msg.role === 'ai' ? formatText(msg.text, t.msgAiText, fs) : <p style={{ margin: 0, fontSize: fs, color: '#fff', lineHeight: 1.6 }}>{msg.text}</p>}
              </div>
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={() => handleSpeak(msg.text, i)} style={{ padding: '3px 8px', border: `1px solid ${t.border}`, borderRadius: 6, background: speaking === i ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 10, color: speaking === i ? '#3b82f6' : t.text3, fontFamily: 'inherit' }}>{speaking === i ? '⏹' : '🔊'}</button>
                  <button onClick={() => handleCopy(msg.text, i)} style={{ padding: '3px 8px', border: `1px solid ${t.border}`, borderRadius: 6, background: copied === i ? 'rgba(22,163,74,0.1)' : 'transparent', cursor: 'pointer', fontSize: 10, color: copied === i ? '#16a34a' : t.text3, fontFamily: 'inherit' }}>{copied === i ? '✓' : '📋'}</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div><div style={{ background: t.msgAi, border: `1px solid ${t.msgAiBorder}`, borderRadius: '4px 16px 16px 16px', padding: '12px 16px' }}><div style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />)}</div></div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything... (Enter to send, Shift+Enter for new line)" style={{ flex: 1, padding: '10px 14px', border: `1px solid ${t.border}`, borderRadius: 12, fontSize: fs, resize: 'none', outline: 'none', fontFamily: 'inherit', background: t.input, color: t.text, lineHeight: 1.5, maxHeight: 100, minHeight: 42 }} rows={1} />
        <button onClick={startListening} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${t.border}`, background: listening ? 'rgba(239,68,68,0.1)' : t.bg3, cursor: 'pointer', fontSize: 16, flexShrink: 0, color: listening ? '#ef4444' : t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{listening ? '⏹' : '🎤'}</button>
        <button onClick={send} disabled={loading || !input.trim()} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: loading || !input.trim() ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
      </div>
    </div>
  );
}

// ── SUMMARIZER ──
function SummarizerTab({ t, fs }: { t: typeof themes.light; fs: number }) {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long' | 'custom'>('medium');
  const [customPages, setCustomPages] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const getLengthInstruction = () => {
    if (summaryLength === 'short') return 'Create a very concise summary in 1 paragraph (about 100 words).';
    if (summaryLength === 'long') return 'Create a detailed comprehensive summary (about 500 words) covering all major points.';
    if (summaryLength === 'custom' && customPages) return `Create a summary that would fit approximately ${customPages} page(s) (about ${parseInt(customPages) * 300} words).`;
    return 'Create a medium-length summary (about 250 words) with Key Points, Main Concepts, and Important Details.';
  };

  const summarize = async () => {
    if (!text.trim()) return; setLoading(true); setSummary('');
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'summarize', content: text, lengthInstruction: getLengthInstruction() }) });
      const data = await res.json(); setSummary(data.reply);
    } catch { setSummary('Error connecting to AI.'); }
    setLoading(false);
  };

  const handleListen = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    if (!summary) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(cleanForSpeech(summary));
    utt.rate = 0.92; utt.onend = () => setIsSpeaking(false); utt.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true); window.speechSynthesis.speak(utt);
  };

  // ✅ Open in Chrome (new tab) instead of downloading
  const openInBrowser = () => {
    if (!summary) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Summary</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;font-size:15px;color:#1a1a2e}h1{color:#3b82f6;border-bottom:2px solid #3b82f6;padding-bottom:10px}p{margin:8px 0}strong{font-weight:bold}.meta{color:#888;font-size:13px;margin-bottom:20px}@media print{body{max-width:100%}}</style></head><body><h1>📄 AI Summary</h1><p class="meta">Generated on ${new Date().toLocaleString()}</p><hr/>${summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <div style={{ flex: 1, background: t.card, borderRadius: 20, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${t.border}`, background: t.bg3, flexShrink: 0 }}>
        <h2 style={{ fontSize: fs + 2, fontWeight: 700, color: t.text, margin: 0 }}>📄 Notes Summarizer</h2>
        <p style={{ fontSize: fs - 1, color: t.text2, marginTop: 3 }}>Paste text or upload .txt — choose summary length and view in browser</p>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, borderRight: `1px solid ${t.border}`, gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: fs, fontWeight: 600, color: t.text }}>Input</span>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '5px 12px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, color: t.text2, fontFamily: 'inherit' }}>📎 Upload</button>
            <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste notes or lecture content here..." style={{ flex: 1, padding: 14, border: `1px solid ${t.border}`, borderRadius: 12, fontSize: fs, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, minHeight: 200, background: t.input, color: t.text }} />
          <div style={{ background: t.bg3, borderRadius: 12, padding: 12, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text2, marginBottom: 8 }}>Summary Length</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['short', 'medium', 'long', 'custom'] as const).map(l => (
                <button key={l} onClick={() => setSummaryLength(l)} style={{ padding: '5px 12px', border: `2px solid ${summaryLength === l ? '#3b82f6' : t.border}`, borderRadius: 8, background: summaryLength === l ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 12, color: summaryLength === l ? '#3b82f6' : t.text2, fontWeight: summaryLength === l ? 600 : 400, fontFamily: 'inherit', textTransform: 'capitalize' }}>{l === 'short' ? 'Short (~100w)' : l === 'medium' ? 'Medium (~250w)' : l === 'long' ? 'Long (~500w)' : 'Custom'}</button>
              ))}
            </div>
            {summaryLength === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: t.text2 }}>Pages:</span>
                <input type="number" min="1" max="20" value={customPages} onChange={e => setCustomPages(e.target.value)} placeholder="e.g. 2" style={{ width: 80, padding: '6px 10px', border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 13, background: t.input, color: t.text, outline: 'none', fontFamily: 'inherit' }} />
                <span style={{ fontSize: 12, color: t.text3 }}>≈ {customPages ? parseInt(customPages) * 300 : 0} words</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setText('')} style={{ padding: '9px 14px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: fs, color: t.text2, fontFamily: 'inherit' }}>Clear</button>
            <button onClick={summarize} disabled={loading || !text.trim()} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: fs, fontWeight: 600, opacity: loading || !text.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>{loading ? '⏳ Summarizing...' : '✨ Summarize'}</button>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: fs, fontWeight: 600, color: t.text }}>AI Summary</span>
            {summary && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleListen} style={{ padding: '5px 10px', border: `1px solid ${t.border}`, borderRadius: 8, background: isSpeaking ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 11, color: isSpeaking ? '#3b82f6' : t.text2, fontFamily: 'inherit' }}>{isSpeaking ? '⏹ Stop' : '🔊 Listen'}</button>
                <button onClick={() => { navigator.clipboard.writeText(summary.replace(/\*\*/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: '5px 10px', border: `1px solid ${t.border}`, borderRadius: 8, background: copied ? 'rgba(22,163,74,0.1)' : 'transparent', cursor: 'pointer', fontSize: 11, color: copied ? '#16a34a' : t.text2, fontFamily: 'inherit' }}>{copied ? '✓' : '📋'}</button>
                <button onClick={openInBrowser} style={{ padding: '5px 10px', border: '1px solid #3b82f6', borderRadius: 8, background: 'rgba(59,130,246,0.1)', cursor: 'pointer', fontSize: 11, color: '#3b82f6', fontFamily: 'inherit', fontWeight: 600 }}>🌐 Open</button>
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: 14, background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 12, overflowY: 'auto', lineHeight: 1.7 }}>
            {loading ? <div style={{ color: t.text2, textAlign: 'center', paddingTop: 60 }}>⏳ Generating summary...</div>
              : summary ? <div style={{ animation: 'fadeUp 0.4s ease' }}>{formatText(summary, t.text, fs)}</div>
                : <div style={{ color: t.text3, textAlign: 'center', paddingTop: 60, fontSize: fs }}>📝 Your summary appears here<br /><span style={{ fontSize: fs - 1 }}>Choose length, paste text, click Summarize</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QUIZ TAB ──
function QuizTab({ onQuizDone, userEmail, t, fs }: { onQuizDone: (score: number, total: number, topic: string) => void; userEmail: string; t: typeof themes.light; fs: number }) {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'input' | 'quiz' | 'result'>('input');
  const [showConfetti, setShowConfetti] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sendingEmail, setSendingEmail] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return; setLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'quiz', content: topic, difficulty }) });
      const data = await res.json();
      const parsed = JSON.parse(data.reply.replace(/```json|```/g, '').trim());
      setQuestions(parsed.questions); setPhase('quiz');
    } catch { alert('Error. Check API key.'); }
    setLoading(false);
  };

  const submit = () => {
    const details = questions.map((q, i) => ({ q: q.q, chosen: answers[i] || 'Not answered', correct: q.answer, ok: (answers[i] || '').charAt(0) === q.answer.charAt(0), explanation: q.explanation }));
    const score = details.filter(d => d.ok).length;
    setResult({ score, total: questions.length, details }); setPhase('result');
    onQuizDone(score, questions.length, topic);
    if (score >= 3) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); }
  };

  const sendReport = async () => {
    if (!result) return;
    setSendingEmail(true);
    try {
      await fetch('/api/quiz-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, topic, score: result.score, total: result.total, details: result.details, difficulty })
      });
      alert('📧 Report sent to your email!');
    } catch { alert('Failed to send report.'); }
    setSendingEmail(false);
  };

  return (
    <div style={{ flex: 1, background: t.card, borderRadius: 20, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {showConfetti && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden', borderRadius: 20 }}>{Array.from({ length: 50 }).map((_, i) => <div key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: i % 3 === 0 ? '50%' : '2px', background: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'][i % 6], left: `${Math.random() * 100}%`, top: '-10px', animation: `confettiFall ${1.5 + Math.random() * 2}s ease ${Math.random() * 0.8}s forwards` }} />)}</div>}
      {phase === 'input' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 40 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 8px 24px rgba(139,92,246,0.35)', animation: 'float 3s ease-in-out infinite' }}>📋</div>
          <div style={{ textAlign: 'center' }}><h2 style={{ fontSize: fs + 8, fontWeight: 700, color: t.text, margin: '0 0 8px' }}>Quiz Generator</h2><p style={{ fontSize: fs, color: t.text2, maxWidth: 400 }}>Enter any topic — AI generates 5 MCQ questions</p></div>

          {/* Difficulty selector */}
          <div style={{ display: 'flex', gap: 10 }}>
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '10px 20px', border: `2px solid ${difficulty === d ? (d === 'easy' ? '#22c55e' : d === 'medium' ? '#f59e0b' : '#ef4444') : t.border}`, borderRadius: 12, background: difficulty === d ? (d === 'easy' ? 'rgba(34,197,94,0.1)' : d === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent', cursor: 'pointer', fontSize: fs, fontWeight: 600, color: difficulty === d ? (d === 'easy' ? '#22c55e' : d === 'medium' ? '#f59e0b' : '#ef4444') : t.text2, fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
              </button>
            ))}
          </div>

          <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Python basics, World War II, Machine Learning..." style={{ width: '100%', maxWidth: 520, height: 100, padding: 14, border: `1px solid ${t.border}`, borderRadius: 14, fontSize: fs, resize: 'none', outline: 'none', fontFamily: 'inherit', background: t.input, color: t.text }} />
          <button onClick={generate} disabled={loading || !topic.trim()} style={{ padding: '13px 36px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: fs, fontWeight: 600, opacity: loading || !topic.trim() ? 0.6 : 1, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>{loading ? '⏳ Generating...' : '🚀 Generate Quiz'}</button>
        </div>
      )}
      {phase === 'quiz' && (
        <>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.bg3, flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, margin: 0 }}>{topic} — <span style={{ color: difficulty === 'easy' ? '#22c55e' : difficulty === 'medium' ? '#f59e0b' : '#ef4444', textTransform: 'capitalize' }}>{difficulty}</span></h2>
              <p style={{ fontSize: 12, color: t.text2, margin: '2px 0 0' }}>{Object.keys(answers).length}/{questions.length} answered</p>
            </div>
            <button onClick={() => setPhase('input')} style={{ padding: '7px 14px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 12, color: t.text2, fontFamily: 'inherit' }}>New</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: t.bg3, borderRadius: 14, padding: 16, border: `1px solid ${t.border}`, animation: `fadeUp 0.35s ease ${i * 0.08}s both` }}>
                <p style={{ fontWeight: 600, fontSize: fs, marginBottom: 12, color: t.text }}>Q{i + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, j) => <button key={j} onClick={() => setAnswers(a => ({ ...a, [i]: opt }))} style={{ padding: '11px 14px', borderRadius: 10, border: `2px solid ${answers[i] === opt ? '#8b5cf6' : t.border}`, background: answers[i] === opt ? 'rgba(139,92,246,0.08)' : 'transparent', cursor: 'pointer', fontSize: fs, textAlign: 'left', color: answers[i] === opt ? '#8b5cf6' : t.text, fontWeight: answers[i] === opt ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.15s' }}>{opt}</button>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
            <button onClick={submit} disabled={Object.keys(answers).length < questions.length} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: fs, fontWeight: 600, opacity: Object.keys(answers).length < questions.length ? 0.5 : 1, fontFamily: 'inherit' }}>Submit ({Object.keys(answers).length}/{questions.length})</button>
          </div>
        </>
      )}
      {phase === 'result' && result && (
        <>
          <div style={{ padding: '24px', textAlign: 'center', background: t.bg3, flexShrink: 0, borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 56, animation: 'bounce 0.6s ease' }}>{result.score >= 4 ? '🏆' : result.score >= 3 ? '👍' : '📚'}</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: t.text, margin: '8px 0 4px', animation: 'pop 0.5s ease' }}>Score: {result.score}/{result.total}</h2>
            <p style={{ fontSize: fs, color: result.score >= 4 ? '#16a34a' : result.score >= 3 ? '#d97706' : '#dc2626', fontWeight: 600 }}>{result.score >= 4 ? 'Excellent!' : result.score >= 3 ? 'Good job!' : 'Keep practicing!'}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {Array.from({ length: result.total }).map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < result.score ? '#22c55e' : '#e5e7eb', animation: `pop 0.3s ease ${i * 0.1}s both` }} />)}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.details.map((d, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: d.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${d.ok ? '#bbf7d0' : '#fecaca'}`, animation: `fadeUp 0.3s ease ${i * 0.07}s both` }}>
                <p style={{ fontSize: fs, fontWeight: 600, marginBottom: 4, color: '#1a1d2e' }}>{i + 1}. {d.q}</p>
                <p style={{ fontSize: fs - 1, color: d.ok ? '#16a34a' : '#dc2626' }}>{d.chosen} {d.ok ? '✓' : '✗'}</p>
                {!d.ok && <p style={{ fontSize: fs - 1, color: '#16a34a', marginTop: 3 }}>✅ Correct: {d.correct}</p>}
                {!d.ok && d.explanation && <p style={{ fontSize: fs - 1, color: '#4b5563', marginTop: 8, padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>💡 <strong>Why?</strong> {d.explanation}</p>}
              </div>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${t.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => { setPhase('input'); setTopic(''); setQuestions([]); }} style={{ flex: 1, padding: '11px', border: `1px solid ${t.border}`, borderRadius: 12, background: 'transparent', cursor: 'pointer', fontSize: fs, color: t.text, fontFamily: 'inherit' }}>New Topic</button>
            <button onClick={sendReport} disabled={sendingEmail} style={{ flex: 1, padding: '11px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, cursor: 'pointer', fontSize: fs, color: '#10b981', fontWeight: 600, fontFamily: 'inherit' }}>{sendingEmail ? '⏳ Sending...' : '📧 Email Report'}</button>
            <button onClick={() => { setAnswers({}); setResult(null); setPhase('quiz'); }} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: fs, fontWeight: 600, fontFamily: 'inherit' }}>Retry</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── PROGRESS TAB ──
function ProgressTab({ stats, userEmail, t, fs }: { stats: TopicStat[]; userEmail: string; t: typeof themes.light; fs: number }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const meaningful = stats.filter(s => { const words = s.topic.split(' '); if (words.length < 2) return false; const trivial = ['hello', 'hi', 'hey', 'yes', 'no', 'ok', 'okay', 'thanks', 'good', 'nice', 'what', 'who', 'why', 'how', 'when']; return !trivial.includes(words[0].toLowerCase()); });
  const total = meaningful.reduce((a, s) => a + s.asked, 0);
  const correct = meaningful.reduce((a, s) => a + s.correct, 0);
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const weak = meaningful.filter(s => s.asked > 0 && s.correct / s.asked < 0.6);
  const strong = meaningful.filter(s => s.asked > 0 && s.correct / s.asked >= 0.6);
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  const sendProgressReport = async () => {
    setSendingEmail(true);
    try {
      await fetch('/api/progress-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, stats: meaningful, total, correct, pct })
      });
      alert('📧 Progress report sent to your email!');
    } catch { alert('Failed to send report.'); }
    setSendingEmail(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      {meaningful.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px', fontSize: fs, color: '#92400e' }}>
          💡 <strong>No meaningful activity yet!</strong> Ask substantive questions in AI Tutor or take a quiz — your progress tracks automatically.
        </div>
      )}
      {meaningful.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={sendProgressReport} disabled={sendingEmail} style={{ padding: '9px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: fs, color: '#10b981', fontWeight: 600, fontFamily: 'inherit' }}>{sendingEmail ? '⏳ Sending...' : '📧 Email Progress Report'}</button>
        </div>
      )}
      <div style={{ background: t.card, borderRadius: 20, padding: 22, border: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, marginBottom: 18 }}>📊 Overall Performance</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            <svg width="96" height="96"><circle cx="48" cy="48" r="38" fill="none" stroke={t.border} strokeWidth="9" /><circle cx="48" cy="48" r="38" fill="none" stroke={pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="9" strokeDasharray={`${2 * Math.PI * 38 * pct / 100} ${2 * Math.PI * 38}`} strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: 'stroke-dasharray 1s ease' }} /></svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 20, color: t.text }}>{pct}%</span>
              <span style={{ fontSize: 9, color: t.text2 }}>{total === 0 ? 'No data' : pct >= 70 ? 'Strong' : pct >= 40 ? 'Average' : 'Weak'}</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ label: 'Questions', val: total, color: '#3b82f6', icon: '❓' }, { label: 'Correct', val: correct, color: '#10b981', icon: '✅' }, { label: 'Topics', val: meaningful.filter(s => s.asked > 0).length, color: '#8b5cf6', icon: '📚' }, { label: 'Weak Areas', val: weak.length, color: '#ef4444', icon: '⚠️' }].map((s, i) => (
              <div key={s.label} style={{ background: t.bg3, borderRadius: 12, padding: '10px 14px', border: `1px solid ${t.border}`, animation: `fadeUp 0.3s ease ${i * 0.08}s both` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: t.text2, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {meaningful.filter(s => s.asked > 0).length > 0 && (
        <div style={{ background: t.card, borderRadius: 20, padding: 22, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, marginBottom: 18 }}>📚 Topics You Explored</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {meaningful.filter(s => s.asked > 0).map((s, idx) => {
              const p = Math.round((s.correct / s.asked) * 100); const isWeak = s.correct / s.asked < 0.6;
              return (
                <div key={s.topic} style={{ animation: `fadeUp 0.3s ease ${idx * 0.06}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: fs - 1, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: t.text, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.topic}>{s.topic}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: t.text2, fontSize: 12 }}>{s.correct}/{s.asked} correct</span>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: isWeak ? '#fef2f2' : '#f0fdf4', color: isWeak ? '#dc2626' : '#16a34a' }}>{isWeak ? '⚠ Weak' : '✓ Strong'}</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: t.bg3, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p}%`, background: isWeak ? '#f97316' : colors[idx % colors.length], borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, background: weak.length > 0 ? '#fef2f2' : t.bg3, borderRadius: 16, padding: 16, border: `1px solid ${weak.length > 0 ? '#fecaca' : t.border}` }}>
          <h4 style={{ fontSize: fs, fontWeight: 700, color: weak.length > 0 ? '#dc2626' : t.text3, marginBottom: 10 }}>⚠ Needs Work</h4>
          {weak.length === 0 ? <p style={{ fontSize: fs - 1, color: t.text3 }}>{total === 0 ? 'Start with a quiz!' : 'No weak areas 🎉'}</p> : weak.map(s => <div key={s.topic} style={{ fontSize: fs - 1, padding: '6px 0', borderBottom: '1px solid #fecaca', color: '#374151' }} title={s.topic}>📌 {s.topic.slice(0, 35)}{s.topic.length > 35 ? '...' : ''} — {Math.round((s.correct / s.asked) * 100)}%</div>)}
        </div>
        <div style={{ flex: 1, background: strong.length > 0 ? '#f0fdf4' : t.bg3, borderRadius: 16, padding: 16, border: `1px solid ${strong.length > 0 ? '#bbf7d0' : t.border}` }}>
          <h4 style={{ fontSize: fs, fontWeight: 700, color: strong.length > 0 ? '#16a34a' : t.text3, marginBottom: 10 }}>✅ Strong Areas</h4>
          {strong.length === 0 ? <p style={{ fontSize: fs - 1, color: t.text3 }}>{total === 0 ? 'No activity yet' : 'Keep going!'}</p> : strong.map(s => <div key={s.topic} style={{ fontSize: fs - 1, padding: '6px 0', borderBottom: '1px solid #bbf7d0', color: '#374151' }} title={s.topic}>🏆 {s.topic.slice(0, 35)}{s.topic.length > 35 ? '...' : ''} — {Math.round((s.correct / s.asked) * 100)}%</div>)}
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [active, setActive] = useState<Tab>('Home');
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [streak, setStreak] = useState(0);
  const [quizTopicFromHome, setQuizTopicFromHome] = useState('');
  const t = themes[theme];
  const fs = fontSizes[fontSize];

  useEffect(() => { if (user) setStreak(updateStreak()); }, [user]);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [convRes, progRes] = await Promise.all([fetch(`/api/conversations?userId=${userId}`), fetch(`/api/progress?userId=${userId}`)]);
      const convs = await convRes.json(); const prog = await progRes.json();
      if (Array.isArray(convs)) setConversations(convs);
      if (Array.isArray(prog)) setTopicStats(prog);
    } catch (e) { console.error('Load error', e); }
  }, []);

  const generateTitle = async (msgs: Message[]): Promise<string> => {
    try {
      const context = msgs.filter(m => m.role === 'user').slice(0, 3).map(m => m.text).join('; ');
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'title', content: context }) });
      const data = await res.json();
      return data.reply?.slice(0, 50) || msgs[1]?.text?.slice(0, 40) || 'New conversation';
    } catch { return msgs.find(m => m.role === 'user')?.text?.slice(0, 40) || 'New conversation'; }
  };

  const saveConversation = useCallback(async (msgs: Message[], userId: string, convId: string | null) => {
    if (msgs.length < 2) return;
    try {
      let title = 'New conversation';
      if (!convId) { title = await generateTitle(msgs); } else { const existing = conversations.find(c => (c._id || c.id) === convId); title = existing?.title || await generateTitle(msgs); }
      const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, title, messages: msgs, convId }) });
      const saved = await res.json(); const savedId = saved._id || saved.id;
      setConversations(prev => { const exists = prev.find(c => (c._id || c.id) === savedId || (c._id || c.id) === convId); if (exists) return prev.map(c => (c._id || c.id) === savedId || (c._id || c.id) === convId ? { ...saved } : c); return [...prev, saved]; });
      if (!convId) setSelectedConv(savedId);
    } catch (e) { console.error('Save conv error', e); }
  }, [conversations]);

  const saveProgress = useCallback(async (stats: TopicStat[], userId: string) => {
    try { await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, stats }) }); }
    catch (e) { console.error('Save progress error', e); }
  }, []);

  const handleMessagesChange = useCallback((msgs: Message[]) => {
    setChatMessages(msgs);
    if (user && msgs.length >= 2 && msgs[msgs.length - 1].role === 'ai') saveConversation(msgs, user.id, selectedConv);
  }, [user, selectedConv, saveConversation]);

  const handleTopicUpdate = useCallback((questionText: string, isQuiz: boolean, correct?: number, total?: number) => {
    if (isQuiz && correct !== undefined && total !== undefined) {
      const topic = questionText.length > 50 ? questionText.slice(0, 50) + '...' : questionText;
      setTopicStats(prev => { const ex = prev.find(s => s.topic === topic); const updated = ex ? prev.map(s => s.topic === topic ? { ...s, asked: s.asked + total, correct: s.correct + correct } : s) : [...prev, { topic, asked: total, correct }]; if (user) saveProgress(updated, user.id); return updated; });
    } else if (!isQuiz) {
      const topic = questionText.length > 50 ? questionText.slice(0, 50) + '...' : questionText;
      setTopicStats(prev => { const ex = prev.find(s => s.topic === topic); if (ex) return prev; return [...prev, { topic, asked: 0, correct: 0 }]; });
    }
  }, [user, saveProgress]);

  const handleQuizDone = useCallback((score: number, total: number, topic: string) => {
    const t2 = topic.length > 50 ? topic.slice(0, 50) + '...' : topic;
    setTopicStats(prev => { const ex = prev.find(s => s.topic === t2); const updated = ex ? prev.map(s => s.topic === t2 ? { ...s, asked: s.asked + total, correct: s.correct + score } : s) : [...prev, { topic: t2, asked: total, correct: score }]; if (user) saveProgress(updated, user.id); return updated; });
  }, [user, saveProgress]);

  const handleSelectConv = useCallback((conv: Conversation) => { setChatMessages(conv.messages); setSelectedConv(conv._id || conv.id || null); }, []);
  const handleNewChat = useCallback(() => { setChatMessages([]); setSelectedConv(null); }, []);
  const handleDeleteConv = useCallback(async (id: string) => {
    try {
      await fetch('/api/conversations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setConversations(prev => prev.filter(c => (c._id || c.id) !== id));
      if (selectedConv === id) { setChatMessages([]); setSelectedConv(null); }
    } catch (e) { console.error('Delete error', e); }
  }, [selectedConv]);

  const handleStartQuizFromHome = (topic: string) => { setQuizTopicFromHome(topic); setActive('Quiz Generator'); };

  if (!user) return <AuthPage onLogin={u => { setUser(u); loadUserData(u.id); }} />;
  const weakTopics = topicStats.filter(s => s.asked > 0 && s.correct / s.asked < 0.6);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pop{0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes popIn{0%{transform:scale(0.92) translateY(10px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans','Segoe UI',sans-serif; background: ${t.main}; color: ${t.text}; transition: background 0.3s,color 0.3s; font-size: ${fs}px; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c5c9e0;border-radius:4px}
      `}</style>
      {showProfile && <ProfileModal user={user} onUpdate={u => setUser(u)} onClose={() => setShowProfile(false)} t={t} />}
      {showSettings && <SettingsModal theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize} onClose={() => setShowSettings(false)} t={t} />}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: t.main }}>
        <Sidebar active={active} setActive={setActive} user={user} conversations={conversations} onSelectConv={handleSelectConv} selectedConv={selectedConv} onNewChat={handleNewChat} onDeleteConv={handleDeleteConv} streak={streak} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh', background: t.main }}>
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.topbar, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: fs + 4, fontWeight: 700, color: t.text, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{active}</h1>
              {weakTopics.length > 0 && <div style={{ fontSize: 11, color: '#d97706', marginTop: 2, cursor: 'pointer' }} onClick={() => setActive('Progress Tracker')}>⚠ Focus: {weakTopics.slice(0, 2).map(s => s.topic.slice(0, 20)).join(', ')}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 10, padding: '5px 10px' }}>
                <span style={{ fontSize: 16 }}>🔥</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fb923c' }}>{streak} day{streak !== 1 ? 's' : ''}</span>
              </div>
              <div onClick={() => setShowProfile(true)} style={{ fontSize: fs - 1, color: t.text2, background: t.bg3, padding: '6px 12px', borderRadius: 20, border: `1px solid ${t.border}`, cursor: 'pointer', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              <button onClick={() => setShowSettings(true)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg3, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(30deg)')} onMouseLeave={e => (e.currentTarget.style.transform = 'rotate(0deg)')}>⚙️</button>
              <button onClick={() => setShowProfile(true)} style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #3b82f6', background: 'transparent', cursor: 'pointer', fontSize: user.profilePic ? 0 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, overflow: 'hidden' }}>
                {user.profilePic ? <img src={user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{user.avatar}</span>}
              </button>
              <button onClick={() => { setUser(null); setChatMessages([]); setSelectedConv(null); setConversations([]); setTopicStats([]); }} style={{ padding: '7px 12px', border: `1px solid ${t.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: fs - 1, color: '#ef4444', fontFamily: 'inherit' }}>Sign out</button>
            </div>
          </div>
          <div style={{ flex: 1, padding: 20, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            {active === 'Home' && <HomeTab user={user} setActive={setActive} onStartQuiz={handleStartQuizFromHome} t={t} fs={fs} />}
            {active === 'AI Tutor' && <TutorTab onTopicUpdate={handleTopicUpdate} currentMessages={chatMessages} onMessagesChange={handleMessagesChange} t={t} fs={fs} />}
            {active === 'Notes Summarizer' && <SummarizerTab t={t} fs={fs} />}
            {active === 'Quiz Generator' && <QuizTab onQuizDone={handleQuizDone} userEmail={user.email} t={t} fs={fs} />}
            {active === 'Progress Tracker' && <ProgressTab stats={topicStats} userEmail={user.email} t={t} fs={fs} />}
          </div>
        </main>
      </div>
    </>
  );
}
