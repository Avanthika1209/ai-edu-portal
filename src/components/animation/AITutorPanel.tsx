'use client';
import { useEffect, useRef, useState } from 'react';
import { ChatMsg } from './types';

function cleanForSpeech(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').replace(/#{1,6}\s/g, '').replace(/`{1,3}/g, '').replace(/[^\x00-\x7F]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface TutorContext {
  subject: string;
  topic: string;
  inputSummary: string;
  stepLabel: string;
  stepExplanation: string;
}

export function AITutorPanel({ ctx, onQuestionAsked, t, fs, onClose }: {
  ctx: TutorContext; onQuestionAsked: (q: string) => void; t: Record<string, string>; fs: number; onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: `Hi! I'm here to help with **${ctx.topic}**. Ask me anything about what you're seeing in the animation — I can see your current input and the current step.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [micError, setMicError] = useState('');
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Reset the conversation whenever the underlying topic changes so the tutor
  // never answers about a topic that's no longer on screen.
  useEffect(() => {
    setMessages([{ role: 'ai', text: `Hi! I'm here to help with **${ctx.topic}**. Ask me anything about what you're seeing in the animation.` }]);
  }, [ctx.topic]);

  const startListening = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    setMicError('');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError('Voice input needs Chrome or Edge.'); return; }
    try {
      const r = new SR(); recognitionRef.current = r;
      r.continuous = false; r.interimResults = false; r.lang = 'en-US';
      r.onstart = () => setListening(true);
      r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
      r.onerror = (e: any) => { setListening(false); setMicError(e?.error === 'not-allowed' ? 'Microphone permission denied.' : 'Could not hear you — try again.'); };
      r.onend = () => setListening(false);
      r.start();
    } catch { setMicError('Microphone is unavailable right now.'); }
  };

  const speak = (text: string, idx: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speaking === idx) { window.speechSynthesis.cancel(); setSpeaking(null); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utt.rate = 0.95; utt.onend = () => setSpeaking(null); utt.onerror = () => setSpeaking(null);
    setSpeaking(idx); window.speechSynthesis.speak(utt);
  };

  const send = async (overrideText?: string) => {
    const q = (overrideText ?? input).trim();
    if (!q || loading) return;
    const userMsg: ChatMsg = { role: 'user', text: q };
    const history = [...messages, userMsg];
    setMessages(history); setInput(''); setLoading(true);
    onQuestionAsked(`${ctx.subject} — ${ctx.topic}: ${q}`);
    try {
      const primer = [
        { role: 'user', content: `Context: I'm using an interactive ${ctx.subject} animation titled "${ctx.topic}". My current input: ${ctx.inputSummary}. Current step: "${ctx.stepLabel}" — ${ctx.stepExplanation}. Please act as a focused tutor for this specific animation, referring back to this context, and answer follow-up questions about it.` },
        { role: 'assistant', content: `Understood — I can see you're on "${ctx.stepLabel}" in the ${ctx.topic} animation. Ask away.` },
        ...history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      ];
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'tutor', messages: primer, level: 'Beginner' }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages([...history, { role: 'ai', text: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection error.';
      setMessages([...history, { role: 'ai', text: `Sorry, I couldn't reach the tutor service (${msg}). Please try again.` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bg3, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: fs, color: t.text }}>AI Tutor</span>
          <span style={{ fontSize: 11, color: t.text3 }}>· {ctx.topic}</span>
        </div>
        <button onClick={onClose} aria-label="Close AI Tutor" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.text2, fontSize: 14 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.role === 'ai' ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, marginTop: 2 }}>{m.role === 'ai' ? '🤖' : '🧑'}</div>
            <div style={{ flex: 1, maxWidth: '88%' }}>
              <div style={{ background: m.role === 'ai' ? t.msgAi : 'linear-gradient(135deg,#3b82f6,#2563eb)', border: m.role === 'ai' ? `1px solid ${t.msgAiBorder}` : 'none', borderRadius: m.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', padding: '8px 11px' }}>
                <p style={{ margin: 0, fontSize: fs - 1, lineHeight: 1.6, color: m.role === 'ai' ? (t.msgAiText || t.text) : '#fff', whiteSpace: 'pre-wrap' }}>{m.text}</p>
              </div>
              {m.role === 'ai' && (
                <button onClick={() => speak(m.text, i)} style={{ marginTop: 3, padding: '2px 7px', border: `1px solid ${t.border}`, borderRadius: 6, background: speaking === i ? 'rgba(59,130,246,0.1)' : 'transparent', cursor: 'pointer', fontSize: 10, color: speaking === i ? '#3b82f6' : t.text3 }}>{speaking === i ? '⏹ Stop' : '🔊 Listen'}</button>
              )}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontSize: fs - 1, color: t.text3, paddingLeft: 32 }}>Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      {micError && <div style={{ padding: '6px 14px', fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>⚠ {micError}</div>}

      <div style={{ padding: '10px 12px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about this animation, or use the mic…" aria-label="Ask the AI Tutor"
          style={{ flex: 1, padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: 10, fontSize: fs - 1, outline: 'none', fontFamily: 'inherit', background: t.input, color: t.text }} />
        <button onClick={startListening} aria-label="Ask by voice" title="Ask by voice"
          style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${t.border}`, background: listening ? 'rgba(239,68,68,0.12)' : t.bg3, cursor: 'pointer', fontSize: 15, color: listening ? '#ef4444' : t.text2, flexShrink: 0 }}>{listening ? '⏹' : '🎤'}</button>
        <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send"
          style={{ width: 36, height: 36, borderRadius: 9, border: 'none', background: loading || !input.trim() ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#2563eb)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', color: '#fff', flexShrink: 0 }}>➤</button>
      </div>
    </div>
  );
}
