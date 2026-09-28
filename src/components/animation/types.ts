// ── ANIMATION MODULE: SHARED TYPES ──
// Kept separate from page.tsx so the Animation feature stays modular and
// additional subjects/topics/visualizations can be added without touching
// the main page file.

export type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology' | 'Computer Science' | 'Geography';

export interface AnimationTopicMeta {
  id: string;
  subject: Subject;
  title: string;
  icon: string;
  short: string;      // one-line description shown in the topic selector
  formula?: string;   // headline formula shown in the topic card, if any
}

// A single named point-in-time in an animation (a "phase" or "step").
// Every visualization — whether it's a continuous physics sim or a discrete
// sorting algorithm — reports a list of these so the right-hand
// ExplanationPanel can render "what is happening" generically.
export interface AnimationPhase {
  label: string;                          // e.g. "Step 2 / 6 — Comparing indices 1 and 2"
  explanation: string;                    // plain-language explanation of this phase
  values?: { label: string; value: string }[]; // key numbers to show (velocity, array state, etc.)
  formula?: string;                       // formula relevant to this phase, if different from topic default
  why?: string;                           // "why this step happens"
  takeaway?: string;                      // key takeaway, usually only set on the final phase
}

// Imperative controls every visualization exposes to the shared ControlBar.
export interface AnimationHandle {
  play: () => void;
  pause: () => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
}

// Props every visualization component receives in common.
export interface VizCommonProps {
  playing: boolean;
  speed: number;   // 0.5 | 1 | 1.5 | 2
  muted: boolean;
  reducedMotion: boolean;
  t: Record<string, string>;
  fs: number;
  onPhases: (phases: AnimationPhase[], currentIndex: number, totalSteps: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSound: (kind: 'compare' | 'swap' | 'success' | 'click' | 'tick') => void;
}

export interface QuizQ { q: string; options: string[]; answer: string; explanation?: string; }
export interface QuizResult { score: number; total: number; details: { q: string; chosen: string; correct: string; ok: boolean; explanation?: string }[]; }
export interface ChatMsg { role: 'user' | 'ai'; text: string; }
