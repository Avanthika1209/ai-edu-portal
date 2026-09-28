import type { CSSProperties, ReactNode } from 'react';
import { AnimationPhase } from './types';

// ── Shared input controls (the "InputPanel" building block) ──
// Every visualization has different domain-specific inputs (an equation, an
// array, an angle...) but they all share this consistent look, so the whole
// section feels like one product rather than six different UIs stitched
// together.
export function InputBar({ children, t }: { children: ReactNode; t: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', padding: '12px 14px', background: t.bg3, borderRadius: 12, border: `1px solid ${t.border}` }}>
      {children}
    </div>
  );
}

export function TextField({ label, value, onChange, t, fs, width = 160, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; t: Record<string, string>; fs: number; width?: number; placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: fs, fontFamily: 'ui-monospace,monospace', outline: 'none' }} />
    </label>
  );
}

export function SliderField({ label, value, min, max, step = 1, onChange, t, fs, unit = '', width = 170 }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; t: Record<string, string>; fs: number; unit?: string; width?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}: <span style={{ color: '#3b82f6' }}>{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width, accentColor: '#3b82f6' }} aria-label={label} />
    </label>
  );
}

export function SelectField({ label, value, options, onChange, t, fs, width = 170 }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; t: Record<string, string>; fs: number; width?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: fs, outline: 'none', fontFamily: 'inherit' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function SmallButton({ children, onClick, t, fs, active, color = '#3b82f6' }: {
  children: ReactNode; onClick: () => void; t: Record<string, string>; fs: number; active?: boolean; color?: string;
}) {
  return (
    <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${active ? color : t.border}`, background: active ? `${color}1a` : t.bg2 || t.bg3, color: active ? color : t.text, fontSize: fs - 1, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

export function ControlBar({
  playing, onPlay, onPause, onPrev, onNext, onReset, speed, onSpeed, t, fs, disabled,
}: {
  playing: boolean; onPlay: () => void; onPause: () => void; onPrev: () => void; onNext: () => void; onReset: () => void;
  speed: number; onSpeed: (s: number) => void; t: Record<string, string>; fs: number; disabled?: boolean;
}) {
  const btn: CSSProperties = {
    width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg3,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 15, color: t.text, display: 'flex',
    alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1, flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: t.bg3, borderRadius: 12, border: `1px solid ${t.border}` }}>
      <button aria-label="Previous step" title="Previous step" disabled={disabled} onClick={onPrev} style={btn}>⏮</button>
      {playing ? (
        <button aria-label="Pause" title="Pause" disabled={disabled} onClick={onPause} style={{ ...btn, background: '#3b82f6', color: '#fff', border: 'none' }}>⏸</button>
      ) : (
        <button aria-label="Play" title="Play" disabled={disabled} onClick={onPlay} style={{ ...btn, background: '#3b82f6', color: '#fff', border: 'none' }}>▶</button>
      )}
      <button aria-label="Next step" title="Next step" disabled={disabled} onClick={onNext} style={btn}>⏭</button>
      <button aria-label="Reset" title="Reset" disabled={disabled} onClick={onReset} style={btn}>↻</button>
      <div style={{ width: 1, height: 24, background: t.border, margin: '0 4px' }} />
      <span style={{ fontSize: 11, color: t.text2, fontWeight: 600 }}>Speed</span>
      <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="Playback speed">
        {[0.5, 1, 1.5, 2].map(s => (
          <button key={s} onClick={() => onSpeed(s)} aria-pressed={speed === s}
            style={{ padding: '5px 9px', borderRadius: 8, border: `1px solid ${speed === s ? '#3b82f6' : t.border}`, background: speed === s ? 'rgba(59,130,246,0.12)' : 'transparent', color: speed === s ? '#3b82f6' : t.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExplanationPanel({
  title, icon, subject, phase, stepIndex, totalSteps, t, fs, keyTakeaway,
}: {
  title: string; icon: string; subject: string; phase: AnimationPhase | null; stepIndex: number; totalSteps: number;
  t: Record<string, string>; fs: number; keyTakeaway?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto', paddingRight: 2 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: t.text3, textTransform: 'uppercase' }}>{subject}</div>
        <h2 style={{ fontSize: fs + 6, fontWeight: 800, color: t.text, margin: '2px 0 0', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">{icon}</span> {title}
        </h2>
      </div>

      {totalSteps > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.text2, marginBottom: 5, fontWeight: 600 }}>
            <span>Step {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}</span>
            <span>{Math.round((Math.min(stepIndex + 1, totalSteps) / totalSteps) * 100)}%</span>
          </div>
          <div style={{ height: 6, background: t.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Math.min(stepIndex + 1, totalSteps) / totalSteps) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 4, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {phase && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: 0.5, marginBottom: 6 }}>WHAT IS HAPPENING?</div>
            <div style={{ fontSize: fs, fontWeight: 700, color: t.text, marginBottom: 6 }}>{phase.label}</div>
            <p style={{ fontSize: fs, color: t.text2, lineHeight: 1.7, margin: 0 }}>{phase.explanation}</p>
          </div>

          {phase.values && phase.values.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {phase.values.map((v, i) => (
                <div key={i} style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: t.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{v.label}</div>
                  <div style={{ fontSize: fs + 1, color: t.text, fontWeight: 700, marginTop: 2, fontFamily: 'ui-monospace,monospace' }}>{v.value}</div>
                </div>
              ))}
            </div>
          )}

          {phase.formula && (
            <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', letterSpacing: 0.5, marginBottom: 3 }}>FORMULA</div>
              <div style={{ fontSize: fs + 1, color: t.text, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>{phase.formula}</div>
            </div>
          )}

          {phase.why && (
            <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', letterSpacing: 0.5, marginBottom: 3 }}>WHY THIS STEP HAPPENS</div>
              <p style={{ fontSize: fs - 1, color: t.text2, lineHeight: 1.6, margin: 0 }}>{phase.why}</p>
            </div>
          )}
        </div>
      )}

      {(phase?.takeaway || keyTakeaway) && (
        <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 14px', marginTop: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', letterSpacing: 0.5, marginBottom: 3 }}>✅ KEY TAKEAWAY</div>
          <p style={{ fontSize: fs - 1, color: t.text, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{phase?.takeaway || keyTakeaway}</p>
        </div>
      )}
    </div>
  );
}
