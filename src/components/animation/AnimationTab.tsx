'use client';
import { useCallback, useEffect, useMemo, useRef, useState, ForwardRefExoticComponent, RefAttributes } from 'react';
import { AnimationHandle, AnimationPhase, Subject, VizCommonProps } from './types';
import { SUBJECTS, topicsFor } from './topics';
import { ControlBar, ExplanationPanel } from './shared';
import { useSoundEffects } from './useSoundEffects';
import { AITutorPanel } from './AITutorPanel';
import { AnimationQuiz } from './AnimationQuiz';

import { MathGrapher } from './viz/MathGrapher';
import { QuadraticRoots } from './viz/QuadraticRoots';
import { ProjectileMotion } from './viz/ProjectileMotion';
import { Pendulum } from './viz/Pendulum';
import { AtomModel } from './viz/AtomModel';
import { MolecularBonding } from './viz/MolecularBonding';
import { HeartAnimation } from './viz/HeartAnimation';
import { DnaHelix } from './viz/DnaHelix';
import { ArrayAlgorithms } from './viz/ArrayAlgorithms';
import { StackQueueVisualizer } from './viz/StackQueueVisualizer';
import { WaterCycle } from './viz/WaterCycle';
import { Seasons } from './viz/Seasons';

const VIZ_MAP: Record<string, ForwardRefExoticComponent<VizCommonProps & RefAttributes<AnimationHandle>>> = {
  'math-grapher': MathGrapher,
  'math-quadratic': QuadraticRoots,
  'phy-projectile': ProjectileMotion,
  'phy-pendulum': Pendulum,
  'chem-atom': AtomModel,
  'chem-bond': MolecularBonding,
  'bio-heart': HeartAnimation,
  'bio-dna': DnaHelix,
  'cs-array': ArrayAlgorithms,
  'cs-stack': StackQueueVisualizer,
  'geo-water': WaterCycle,
  'geo-seasons': Seasons,
};

export function AnimationTab({
  onTopicUpdate, onQuizDone, userEmail, t, fs, isMobile = false,
}: {
  onTopicUpdate: (q: string, isQuiz: boolean, correct?: number, total?: number) => void;
  onQuizDone: (score: number, total: number, topic: string) => void;
  userEmail: string; t: Record<string, string>; fs: number; isMobile?: boolean;
}) {
  const [subject, setSubject] = useState<Subject>('Computer Science');
  const topics = useMemo(() => topicsFor(subject), [subject]);
  const [topicId, setTopicId] = useState(topics[0]?.id);
  const topic = topics.find(tp => tp.id === topicId) || topics[0];

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [phases, setPhases] = useState<AnimationPhase[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [rightPanel, setRightPanel] = useState<'explain' | 'tutor' | 'quiz'>('explain');
  const [reducedMotion, setReducedMotion] = useState(false);

  const vizRef = useRef<AnimationHandle>(null);
  const sound = useSoundEffects();

  // Refs mirror the latest values needed inside stable callbacks below, so
  // those callbacks' identities never change on every render — passing a
  // fresh function to the viz components each render would re-trigger their
  // internal effects (which depend on these callbacks) in an infinite loop.
  const progressRef = useRef({ phaseIndex: 0, totalSteps: 0 });
  useEffect(() => { progressRef.current = { phaseIndex, totalSteps }; }, [phaseIndex, totalSteps]);
  const topicRef = useRef(topic);
  const subjectRef = useRef(subject);
  useEffect(() => { topicRef.current = topic; subjectRef.current = subject; }, [topic, subject]);

  const handlePhases = useCallback((p: AnimationPhase[], idx: number, tot: number) => {
    setPhases(p); setPhaseIndex(idx); setTotalSteps(tot);
  }, []);

  const handlePlayingChange = useCallback((p: boolean) => {
    setPlaying(p);
    const { phaseIndex: pi, totalSteps: ts } = progressRef.current;
    if (!p && ts > 0 && pi >= ts - 1 && topicRef.current) {
      onTopicUpdate(`Animation: ${subjectRef.current} — ${topicRef.current.title}`, false);
    }
  }, [onTopicUpdate]);

  const handleSound = useCallback((kind: string) => sound.play(kind as any), [sound.play]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // switching subject resets to that subject's first topic
  useEffect(() => { setTopicId(topics[0]?.id); setPlaying(false); setRightPanel('explain'); }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPlaying(false); setPhases([]); setPhaseIndex(0); setTotalSteps(0); setRightPanel('explain'); }, [topicId]);

  const currentPhase = phases[phaseIndex] || null;
  const inputSummary = currentPhase?.values?.map(v => `${v.label}: ${v.value}`).join(', ') || 'no input yet';

  const VizComponent = topic ? VIZ_MAP[topic.id] : null;

  if (!topic || !VizComponent) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0, overflowY: 'auto' }}>
      {/* Subject selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }} role="tablist" aria-label="Subject">
        {SUBJECTS.map(s => (
          <button key={s.subject} role="tab" aria-selected={subject === s.subject} onClick={() => setSubject(s.subject)}
            style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 11, border: `1px solid ${subject === s.subject ? s.color : t.border}`, background: subject === s.subject ? `${s.color}18` : t.bg3, color: subject === s.subject ? s.color : t.text2, fontWeight: 700, fontSize: fs - 1, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true">{s.icon}</span>{s.subject}
          </button>
        ))}
      </div>

      {/* Topic selector */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }} role="tablist" aria-label="Topic">
        {topics.map(tp => (
          <button key={tp.id} role="tab" aria-selected={topicId === tp.id} onClick={() => setTopicId(tp.id)}
            style={{ flexShrink: 0, minWidth: 200, textAlign: 'left', padding: '12px 14px', borderRadius: 14, border: `1px solid ${topicId === tp.id ? '#3b82f6' : t.border}`, background: topicId === tp.id ? 'rgba(59,130,246,0.08)' : t.card, cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true">{tp.icon}</span>{tp.title}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 3, lineHeight: 1.4 }}>{tp.short}</div>
          </button>
        ))}
      </div>

      {/* Main two-column area */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, flex: 1, minHeight: 0 }}>
        {/* LEFT: animation (visually dominant) */}
        <div style={{ flex: isMobile ? 'none' : 2.1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 14, minHeight: isMobile ? 380 : 440, display: 'flex', flexDirection: 'column' }}>
            <VizComponent
              key={topic.id}
              ref={vizRef}
              playing={playing}
              speed={speed}
              muted={sound.muted}
              reducedMotion={reducedMotion}
              t={t}
              fs={fs}
              onPhases={handlePhases}
              onPlayingChange={handlePlayingChange}
              onSound={handleSound}
            />
          </div>

          <ControlBar
            playing={playing}
            onPlay={() => vizRef.current?.play()}
            onPause={() => vizRef.current?.pause()}
            onPrev={() => vizRef.current?.prev()}
            onNext={() => vizRef.current?.next()}
            onReset={() => vizRef.current?.reset()}
            speed={speed}
            onSpeed={setSpeed}
            t={t} fs={fs}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setRightPanel(rp => rp === 'tutor' ? 'explain' : 'tutor')}
              style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${rightPanel === 'tutor' ? '#3b82f6' : t.border}`, background: rightPanel === 'tutor' ? 'rgba(59,130,246,0.1)' : t.bg3, color: rightPanel === 'tutor' ? '#3b82f6' : t.text, fontWeight: 700, fontSize: fs - 1, cursor: 'pointer', fontFamily: 'inherit' }}>
              🤖 Ask AI Tutor
            </button>
            <button onClick={() => setRightPanel(rp => rp === 'quiz' ? 'explain' : 'quiz')}
              style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${rightPanel === 'quiz' ? '#8b5cf6' : t.border}`, background: rightPanel === 'quiz' ? 'rgba(139,92,246,0.1)' : t.bg3, color: rightPanel === 'quiz' ? '#8b5cf6' : t.text, fontWeight: 700, fontSize: fs - 1, cursor: 'pointer', fontFamily: 'inherit' }}>
              📝 Take Quiz
            </button>
            <button onClick={sound.toggleMuted} aria-pressed={sound.muted} title={sound.muted ? 'Unmute sound effects' : 'Mute sound effects'}
              style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.bg3, color: t.text2, fontWeight: 600, fontSize: fs - 1, cursor: 'pointer', fontFamily: 'inherit' }}>
              {sound.muted ? '🔇 Muted' : '🔊 Sound on'}
            </button>
          </div>
        </div>

        {/* RIGHT: explanation / AI tutor / quiz */}
        <div style={{ flex: isMobile ? 'none' : 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 420 : undefined }}>
          {rightPanel === 'explain' && (
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 18, height: '100%' }}>
              <ExplanationPanel title={topic.title} icon={topic.icon} subject={subject} phase={currentPhase} stepIndex={phaseIndex} totalSteps={totalSteps} t={t} fs={fs} />
            </div>
          )}
          {rightPanel === 'tutor' && (
            <AITutorPanel
              ctx={{ subject, topic: topic.title, inputSummary, stepLabel: currentPhase?.label || '', stepExplanation: currentPhase?.explanation || '' }}
              onQuestionAsked={(q) => onTopicUpdate(q, false)}
              onClose={() => setRightPanel('explain')}
              t={t} fs={fs}
            />
          )}
          {rightPanel === 'quiz' && (
            <AnimationQuiz
              subject={subject} topic={topic.title} inputSummary={inputSummary}
              stepLabel={currentPhase?.label || ''} stepExplanation={currentPhase?.explanation || ''}
              userEmail={userEmail} onQuizDone={onQuizDone} onClose={() => setRightPanel('explain')}
              t={t} fs={fs}
            />
          )}
        </div>
      </div>
    </div>
  );
}
