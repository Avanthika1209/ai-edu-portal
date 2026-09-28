export interface ArrItem { id: number; value: number; }
export interface AlgoStep {
  arr: ArrItem[];
  compare?: number[];   // indices being compared
  swap?: [number, number];
  sortedIdx: number[];  // indices that are in final sorted position
  lo?: number; hi?: number; mid?: number; // binary search window
  foundIdx?: number;
  notFound?: boolean;
  desc: string;
  kind: 'init' | 'compare' | 'swap' | 'sorted' | 'done' | 'mid' | 'eliminate' | 'found' | 'notfound' | 'insert' | 'presort';
}

let idCounter = 0;
export function toItems(values: number[]): ArrItem[] {
  idCounter = 0;
  return values.map(value => ({ id: idCounter++, value }));
}
function clone(arr: ArrItem[]): ArrItem[] { return arr.map(x => ({ ...x })); }

export function bubbleSortSteps(values: number[]): AlgoStep[] {
  const a = toItems(values);
  const steps: AlgoStep[] = [{ arr: clone(a), sortedIdx: [], desc: `Starting array: [${values.join(', ')}]. Bubble Sort repeatedly compares adjacent elements and swaps them if out of order.`, kind: 'init' }];
  const n = a.length; const sorted: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({ arr: clone(a), compare: [j, j + 1], sortedIdx: [...sorted], desc: `Compare index ${j} (${a[j].value}) with index ${j + 1} (${a[j + 1].value}).`, kind: 'compare' });
      if (a[j].value > a[j + 1].value) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        steps.push({ arr: clone(a), swap: [j, j + 1], sortedIdx: [...sorted], desc: `${a[j + 1].value} > ${a[j].value}, so swap them.`, kind: 'swap' });
      }
    }
    sorted.unshift(n - 1 - i);
    steps.push({ arr: clone(a), sortedIdx: [...sorted], desc: `Index ${n - 1 - i} now holds its final sorted value: ${a[n - 1 - i].value}.`, kind: 'sorted' });
    if (!swapped) break;
  }
  const allIdx = Array.from({ length: n }, (_, i) => i);
  steps.push({ arr: clone(a), sortedIdx: allIdx, desc: `Sorted! Final array: [${a.map(x => x.value).join(', ')}]`, kind: 'done' });
  return steps;
}

export function selectionSortSteps(values: number[]): AlgoStep[] {
  const a = toItems(values);
  const steps: AlgoStep[] = [{ arr: clone(a), sortedIdx: [], desc: `Starting array: [${values.join(', ')}]. Selection Sort finds the minimum remaining element and moves it to the front.`, kind: 'init' }];
  const n = a.length; const sorted: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      steps.push({ arr: clone(a), compare: [minIdx, j], sortedIdx: [...sorted], desc: `Compare current minimum (index ${minIdx}, value ${a[minIdx].value}) with index ${j} (value ${a[j].value}).`, kind: 'compare' });
      if (a[j].value < a[minIdx].value) minIdx = j;
    }
    if (minIdx !== i) {
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      steps.push({ arr: clone(a), swap: [i, minIdx], sortedIdx: [...sorted], desc: `Smallest remaining value ${a[i].value} found at index ${minIdx} — swap it into position ${i}.`, kind: 'swap' });
    }
    sorted.push(i);
    steps.push({ arr: clone(a), sortedIdx: [...sorted], desc: `Index ${i} is now finalized with value ${a[i].value}.`, kind: 'sorted' });
  }
  const allIdx = Array.from({ length: n }, (_, i) => i);
  steps.push({ arr: clone(a), sortedIdx: allIdx, desc: `Sorted! Final array: [${a.map(x => x.value).join(', ')}]`, kind: 'done' });
  return steps;
}

export function insertionSortSteps(values: number[]): AlgoStep[] {
  const a = toItems(values);
  const steps: AlgoStep[] = [{ arr: clone(a), sortedIdx: values.length ? [0] : [], desc: `Starting array: [${values.join(', ')}]. Insertion Sort builds a sorted section on the left, one element at a time.`, kind: 'init' }];
  const n = a.length;
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    steps.push({ arr: clone(a), compare: [i], sortedIdx: Array.from({ length: i }, (_, k) => k), desc: `Take element at index ${i} (value ${key.value}) and find its place among the sorted elements to its left.`, kind: 'compare' });
    while (j >= 0 && a[j].value > key.value) {
      a[j + 1] = a[j];
      steps.push({ arr: clone(a), compare: [j, j + 1], sortedIdx: Array.from({ length: i }, (_, k) => k), desc: `${a[j].value} > ${key.value}, so shift ${a[j].value} one place right.`, kind: 'swap' });
      j--;
    }
    a[j + 1] = key;
    steps.push({ arr: clone(a), sortedIdx: Array.from({ length: i + 1 }, (_, k) => k), desc: `Insert ${key.value} at index ${j + 1}. The first ${i + 1} elements are now sorted.`, kind: 'sorted' });
  }
  const allIdx = Array.from({ length: n }, (_, i) => i);
  steps.push({ arr: clone(a), sortedIdx: allIdx, desc: `Sorted! Final array: [${a.map(x => x.value).join(', ')}]`, kind: 'done' });
  return steps;
}

export function linearSearchSteps(values: number[], target: number): AlgoStep[] {
  const a = toItems(values);
  const steps: AlgoStep[] = [{ arr: clone(a), sortedIdx: [], desc: `Searching for ${target} in [${values.join(', ')}] by checking every element from left to right.`, kind: 'init' }];
  for (let i = 0; i < a.length; i++) {
    steps.push({ arr: clone(a), compare: [i], sortedIdx: [], desc: `Check index ${i}: is ${a[i].value} equal to ${target}?`, kind: 'compare' });
    if (a[i].value === target) {
      steps.push({ arr: clone(a), foundIdx: i, sortedIdx: [], desc: `Found! ${target} is at index ${i}.`, kind: 'found' });
      return steps;
    }
  }
  steps.push({ arr: clone(a), notFound: true, sortedIdx: [], desc: `${target} was not found in the array after checking every element.`, kind: 'notfound' });
  return steps;
}

export function binarySearchSteps(values: number[], target: number): AlgoStep[] {
  const sortedValues = [...values].sort((x, y) => x - y);
  const a = toItems(sortedValues);
  const steps: AlgoStep[] = [];
  if (JSON.stringify(sortedValues) !== JSON.stringify(values)) {
    steps.push({ arr: clone(a), sortedIdx: a.map((_, i) => i), desc: `Binary Search requires a sorted array, so the input was sorted first: [${sortedValues.join(', ')}].`, kind: 'presort' });
  } else {
    steps.push({ arr: clone(a), sortedIdx: a.map((_, i) => i), desc: `Array is already sorted: [${sortedValues.join(', ')}]. Searching for ${target}.`, kind: 'init' });
  }
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    steps.push({ arr: clone(a), mid, lo, hi, sortedIdx: a.map((_, i) => i), desc: `Window [${lo}, ${hi}]. Check middle index ${mid}: value ${a[mid].value}.`, kind: 'mid' });
    if (a[mid].value === target) {
      steps.push({ arr: clone(a), foundIdx: mid, lo, hi, sortedIdx: a.map((_, i) => i), desc: `Found! ${target} is at index ${mid}.`, kind: 'found' });
      return steps;
    } else if (a[mid].value < target) {
      steps.push({ arr: clone(a), lo: mid + 1, hi, sortedIdx: a.map((_, i) => i), desc: `${a[mid].value} < ${target}, so the answer (if any) must be to the right — eliminate the left half including index ${mid}.`, kind: 'eliminate' });
      lo = mid + 1;
    } else {
      steps.push({ arr: clone(a), lo, hi: mid - 1, sortedIdx: a.map((_, i) => i), desc: `${a[mid].value} > ${target}, so the answer (if any) must be to the left — eliminate the right half including index ${mid}.`, kind: 'eliminate' });
      hi = mid - 1;
    }
  }
  steps.push({ arr: clone(a), notFound: true, sortedIdx: a.map((_, i) => i), desc: `Search window is empty (lo > hi) — ${target} is not in the array.`, kind: 'notfound' });
  return steps;
}

export type AlgoId = 'bubble' | 'selection' | 'insertion' | 'linear' | 'binary';
export const ALGO_LABELS: Record<AlgoId, string> = {
  bubble: 'Bubble Sort', selection: 'Selection Sort', insertion: 'Insertion Sort', linear: 'Linear Search', binary: 'Binary Search',
};
export const ALGO_COMPLEXITY: Record<AlgoId, string> = {
  bubble: 'O(n²) time, O(1) space', selection: 'O(n²) time, O(1) space', insertion: 'O(n²) worst, O(n) best',
  linear: 'O(n) time, O(1) space', binary: 'O(log n) time, requires sorted input',
};
export function needsTarget(algo: AlgoId) { return algo === 'linear' || algo === 'binary'; }
export function isSearch(algo: AlgoId) { return algo === 'linear' || algo === 'binary'; }

export function runAlgorithm(algo: AlgoId, values: number[], target: number): AlgoStep[] {
  switch (algo) {
    case 'bubble': return bubbleSortSteps(values);
    case 'selection': return selectionSortSteps(values);
    case 'insertion': return insertionSortSteps(values);
    case 'linear': return linearSearchSteps(values, target);
    case 'binary': return binarySearchSteps(values, target);
  }
}
