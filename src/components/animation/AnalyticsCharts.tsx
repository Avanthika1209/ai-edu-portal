'use client';
import { SUBJECTS } from './topics';

interface TopicStat { topic: string; asked: number; correct: number; }

export function AnalyticsCharts({ stats, t, fs, isMobile = false }: { stats: TopicStat[]; t: Record<string, string>; fs: number; isMobile?: boolean }) {
  const meaningful = stats.filter(s => s.asked > 0);
  const totalAsked = meaningful.reduce((a, s) => a + s.asked, 0);
  const totalCorrect = meaningful.reduce((a, s) => a + s.correct, 0);
  const accuracy = totalAsked ? Math.round((totalCorrect / totalAsked) * 100) : 0;
  const animationTopics = stats.filter(s => s.topic.startsWith('Animation:')).length;

  // Subject-wise aggregation: a topic is attributed to a subject if its name
  // appears in the recorded topic string (works for both the Animation
  // module's "Animation: <Subject> — <Topic>" strings and quiz topics
  // written as "<Subject>: <Topic>"). Topics that don't match any known
  // subject are simply excluded from this specific chart — nothing is
  // guessed or fabricated.
  const bySubject = SUBJECTS.map(s => {
    const matching = meaningful.filter(m => m.topic.includes(s.subject));
    const asked = matching.reduce((a, m) => a + m.asked, 0);
    const correct = matching.reduce((a, m) => a + m.correct, 0);
    return { subject: s.subject, color: s.color, asked, correct, pct: asked ? Math.round((correct / asked) * 100) : 0 };
  }).filter(s => s.asked > 0);

  if (meaningful.length === 0) return null;

  const R = 42, C = 2 * Math.PI * R;

  return (
    <div style={{ background: t.card, borderRadius: 20, padding: 22, border: `1px solid ${t.border}` }}>
      <h3 style={{ fontSize: fs + 1, fontWeight: 700, color: t.text, marginBottom: 4 }}>📈 Analytics</h3>
      <p style={{ fontSize: fs - 2, color: t.text3, marginBottom: 18 }}>Computed from your recorded quiz and tutor activity, including the Animation lab.</p>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24 }}>
        {/* Accuracy doughnut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg width={112} height={112} viewBox="0 0 112 112">
            <circle cx={56} cy={56} r={R} fill="none" stroke={t.border} strokeWidth={12} />
            <circle cx={56} cy={56} r={R} fill="none" stroke={accuracy >= 70 ? '#10b981' : accuracy >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth={12}
              strokeDasharray={`${(accuracy / 100) * C} ${C}`} strokeLinecap="round" transform="rotate(-90 56 56)" style={{ transition: 'stroke-dasharray 1s ease' }} />
            <text x={56} y={52} textAnchor="middle" fontSize={20} fontWeight={800} fill={t.text}>{accuracy}%</text>
            <text x={56} y={68} textAnchor="middle" fontSize={9} fill={t.text3}>accuracy</text>
          </svg>
          <div style={{ fontSize: 11, color: t.text2, textAlign: 'center' }}>{totalCorrect} / {totalAsked} correct answers</div>
          <div style={{ fontSize: 11, color: t.text3, textAlign: 'center' }}>🎬 {animationTopics} animation topic{animationTopics === 1 ? '' : 's'} explored</div>
        </div>

        {/* Subject-wise bar chart */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>Subject-wise Performance</div>
          {bySubject.length === 0 ? (
            <p style={{ fontSize: fs - 1, color: t.text3 }}>Activity isn&apos;t tagged to a specific subject yet — try the Animation section, where each topic records its subject automatically.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 130, paddingBottom: 4 }}>
              {bySubject.map(s => (
                <div key={s.subject} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.pct}%</div>
                  <div style={{ width: '100%', maxWidth: 34, height: 90, background: t.bg3, borderRadius: 6, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: `${Math.max(4, s.pct)}%`, background: s.color, borderRadius: '6px 6px 0 0', transition: 'height 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: t.text3, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={s.subject}>{s.subject.replace('Computer Science', 'CS')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
