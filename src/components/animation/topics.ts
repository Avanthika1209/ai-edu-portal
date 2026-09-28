import { AnimationTopicMeta, Subject } from './types';

// Modular topic catalog. To add a new animation later: add a metadata entry
// here, build a visualization component implementing AnimationHandle, and
// register it in the switch inside AnimationTab.tsx.
export const ANIMATION_TOPICS: AnimationTopicMeta[] = [
  { id: 'math-grapher', subject: 'Mathematics', icon: '📈', title: 'Function Grapher', short: 'Plot any function of x and watch it get traced point-by-point.', formula: 'y = f(x)' },
  { id: 'math-quadratic', subject: 'Mathematics', icon: '🧮', title: 'Quadratic Roots', short: 'See how a, b, c shape a parabola and where it crosses zero.', formula: 'ax² + bx + c = 0' },

  { id: 'phy-projectile', subject: 'Physics', icon: '🚀', title: 'Projectile Motion', short: 'Fire a projectile and control velocity, angle and gravity.', formula: 'y = x·tanθ − g x² / (2v₀²cos²θ)' },
  { id: 'phy-pendulum', subject: 'Physics', icon: '🕰️', title: 'Simple Pendulum', short: 'A swinging bob under gravity — change length and amplitude.', formula: 'T = 2π√(L/g)' },

  { id: 'chem-atom', subject: 'Chemistry', icon: '⚛️', title: 'Bohr Atomic Model', short: 'Pick an element and watch electrons orbit shell by shell.', formula: '2n² electrons per shell' },
  { id: 'chem-bond', subject: 'Chemistry', icon: '🧪', title: 'Molecular Bonding', short: 'Watch atoms come together and share electrons to form a molecule.', formula: 'Octet Rule' },

  { id: 'bio-heart', subject: 'Biology', icon: '🫀', title: 'The Human Heart', short: 'A beating four-chambered heart with real blood-flow direction.', formula: '60–100 bpm (resting)' },
  { id: 'bio-dna', subject: 'Biology', icon: '🧬', title: 'DNA Double Helix', short: 'A rotating strand of base-paired nucleotides.', formula: 'A–T, G–C base pairing' },

  { id: 'cs-array', subject: 'Computer Science', icon: '📊', title: 'Array Algorithms', short: 'Run sorting & searching algorithms on your own array, step by step.', formula: 'O(n²) / O(log n)' },
  { id: 'cs-stack', subject: 'Computer Science', icon: '🥞', title: 'Stack & Queue', short: 'Push, pop, enqueue and dequeue your own values.', formula: 'LIFO / FIFO' },

  { id: 'geo-water', subject: 'Geography', icon: '🌧️', title: 'The Water Cycle', short: 'Evaporation, condensation, precipitation and collection in one scene.', formula: 'Solar energy drives the cycle' },
  { id: 'geo-seasons', subject: 'Geography', icon: '🌍', title: 'Earth\'s Seasons', short: 'Why axial tilt — not distance — causes the seasons.', formula: 'Axial tilt ≈ 23.5°' },
];

export const SUBJECTS: { subject: Subject; icon: string; color: string }[] = [
  { subject: 'Mathematics', icon: '📐', color: '#8b5cf6' },
  { subject: 'Physics', icon: '🔭', color: '#3b82f6' },
  { subject: 'Chemistry', icon: '🧪', color: '#10b981' },
  { subject: 'Biology', icon: '🧬', color: '#ef4444' },
  { subject: 'Computer Science', icon: '💻', color: '#f59e0b' },
  { subject: 'Geography', icon: '🌍', color: '#06b6d4' },
];

export function topicsFor(subject: Subject) {
  return ANIMATION_TOPICS.filter(t => t.subject === subject);
}
