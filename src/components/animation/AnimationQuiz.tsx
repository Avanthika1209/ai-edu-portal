'use client';
import { useState } from 'react';
import { QuizQ, QuizResult } from './types';

export function AnimationQuiz({ subject, topic, inputSummary, stepLabel, stepExplanation, userEmail, onQuizDone, t, fs, onClose }: {
  subject: string; topic: string; inputSummary: string; stepLabel: string; stepExplanation: string;
  userEmail: string; onQuizDone: (score: number, total: number, topic: string) => void; t: Record<string, string>; fs: number; onClose: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQ[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true); setError(''); setResult(null); setAnswers({});
    const content = `Subject: ${subject}. Animation topic: ${topic}. The learner's current input/data: ${inputSummary}. They are currently at this step: "${stepLabel}" — ${stepExplanation}. Base the questions specifically on this exact animation, this input data, what happened during the visualization, why steps occurred, and what the expected next step would be — not on generic ${topic} trivia.`;
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'quiz', content, difficulty: 'medium', questionCount: 5 }) });
      const data = await res.json();
      const parsed = JSON.parse((data.reply || '').replace(/```json|```/g, '').trim());
      if (!parsed.questions?.length) throw new Error('No questions returned');
      setQuestions(parsed.questions);
    } catch {
      setError('Could not generate a quiz right now. Please try again.');
    }
    setLoading(false);
  };

  const submit = async () => {
    if (!questions) return;
    const details = questions.map((q, i) => ({ q: q.q, chosen: answers[i] || 'Not answered', correct: q.answer, ok: (answers[i] || '').charAt(0) === q.answer.charAt(0), explanation: q.explanation }));
    const score = details.filter(d => d.ok).length;
    setResult({ score, total: questions.length, details });
    onQuizDone(score, questions.length, `${subject}: ${topic}`);
    try {
      await fetch('/api/quiz-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, topic: `${subject}: ${topic}`, score, total: questions.length, details, difficulty: 'medium' }) });
    } catch { /* non-fatal */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bg3, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span style={{ fontWeight: 700, fontSize: fs, color: t.text }}>Quiz — {topic}</span>
        </div>
        <button onClick={onClose} aria-label="Close quiz" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', color: t.text2, fontSize: 14 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {!questions && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>📝</div>
            <p style={{ fontSize: fs, color: t.text2, maxWidth: 320 }}>Generate 5 questions based on exactly what you've just seen in this animation — your input, the current step, and why it happened.</p>
            {error && <p style={{ color: '#ef4444', fontSize: fs - 1 }}>{error}</p>}
            <button onClick={generate} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: fs - 1, cursor: 'pointer' }}>Generate Quiz</button>
          </div>
        )}

        {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.text2, fontSize: fs }}>Generating quiz from your animation…</div>}

        {questions && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: fs - 1, fontWeight: 600, color: t.text, margin: '0 0 8px' }}>{i + 1}. {q.q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: `1px solid ${answers[i] === opt ? '#8b5cf6' : t.border}`, background: answers[i] === opt ? 'rgba(139,92,246,0.08)' : 'transparent', cursor: 'pointer', fontSize: fs - 2, color: t.text }}>
                      <input type="radio" name={`q${i}`} checked={answers[i] === opt} onChange={() => setAnswers(a => ({ ...a, [i]: opt }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={submit} disabled={Object.keys(answers).length < questions.length} style={{ padding: '10px', background: Object.keys(answers).length < questions.length ? t.bg3 : 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: Object.keys(answers).length < questions.length ? t.text2 : '#fff', border: `1px solid ${t.border}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: fs - 1 }}>Submit Answers</button>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '18px 0' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.text }}>{result.score} / {result.total}</div>
              <div style={{ fontSize: fs - 1, color: t.text2 }}>{Math.round((result.score / result.total) * 100)}% correct</div>
            </div>
            {result.details.map((d, i) => (
              <div key={i} style={{ padding: 10, borderRadius: 10, background: d.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${d.ok ? '#bbf7d0' : '#fecaca'}` }}>
                <p style={{ margin: '0 0 4px', fontSize: fs - 2, fontWeight: 600, color: t.text }}>{d.ok ? '✅' : '❌'} {d.q}</p>
                <p style={{ margin: 0, fontSize: fs - 3, color: t.text2 }}>Your answer: {d.chosen} · Correct: {d.correct}{d.explanation ? ` — ${d.explanation}` : ''}</p>
              </div>
            ))}
            <button onClick={generate} style={{ padding: '10px', background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, cursor: 'pointer', fontSize: fs - 1, color: t.text, fontWeight: 600 }}>🔄 New Quiz</button>
          </div>
        )}
      </div>
    </div>
  );
}
