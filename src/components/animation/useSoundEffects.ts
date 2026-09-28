import { useCallback, useRef, useState } from 'react';

type SoundKind = 'compare' | 'swap' | 'success' | 'click' | 'tick' | 'heartbeat';

// All sound effects are synthesized on the fly with the Web Audio API
// (short sine/triangle blips). This avoids shipping or licensing any audio
// files, keeps the bundle tiny, and makes every sound trivially "subtle" and
// consistent. Nothing plays until the user interacts (play/click), which
// satisfies browser autoplay restrictions.
export function useSoundEffects() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  const play = useCallback((kind: SoundKind) => {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const blip = (freq: number, start: number, dur: number, type: OscillatorType, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(gain, now + start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };

    switch (kind) {
      case 'compare': blip(520, 0, 0.07, 'sine', 0.05); break;
      case 'swap': blip(340, 0, 0.06, 'triangle', 0.06); blip(460, 0.05, 0.08, 'triangle', 0.06); break;
      case 'success': blip(523, 0, 0.1, 'sine', 0.06); blip(659, 0.09, 0.1, 'sine', 0.06); blip(784, 0.18, 0.16, 'sine', 0.07); break;
      case 'click': blip(600, 0, 0.04, 'sine', 0.04); break;
      case 'tick': blip(880, 0, 0.03, 'sine', 0.025); break;
      case 'heartbeat': blip(90, 0, 0.09, 'sine', 0.09); blip(70, 0.13, 0.11, 'sine', 0.07); break;
    }
  }, [getCtx, muted]);

  return { play, muted, setMuted, toggleMuted: () => setMuted(m => !m) };
}
