// Schelling's checkerboard model, kept free of drawing code so it can be tested on its own.
// Cells: 0 empty, 1 and 2 are the two kinds of agent. Neighbourhood: the eight surrounding
// squares (Moore), bounded board, so edge cells have five neighbours and corners three,
// as in Schelling (1971, p. 154).

export const EMPTY = 0;

// Small seeded generator (mulberry32) so a reset can be replayed exactly.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createModel({ cols = 40, rows = 40, vacancy = 0.25, seed = 1 } = {}) {
  const n = cols * rows;
  const random = rng(seed);
  const grid = new Uint8Array(n);
  const moved = new Float32Array(n); // time of last arrival, for the drawing layer

  // Equal numbers of each kind, the rest empty, shuffled (Fisher-Yates).
  const agents = Math.round(n * (1 - vacancy));
  for (let i = 0; i < agents; i++) grid[i] = i < agents / 2 ? 1 : 2;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  const vacant = [];
  for (let i = 0; i < n; i++) if (grid[i] === EMPTY) vacant.push(i);

  // Like and total neighbours of cell i, as if it held `kind`, ignoring cell `skip`.
  function count(i, kind, skip = -1) {
    const x = i % cols, y = (i - x) / cols;
    let like = 0, total = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= rows) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if ((dx === 0 && dy === 0) || xx < 0 || xx >= cols) continue;
        const j = yy * cols + xx;
        if (j === skip || grid[j] === EMPTY) continue;
        total++;
        if (grid[j] === kind) like++;
      }
    }
    return [like, total];
  }

  // An agent with no neighbours at all has nobody to object to: it counts as content.
  const content = (i, kind, threshold, skip) => {
    const [like, total] = count(i, kind, skip);
    return total === 0 || like / total >= threshold;
  };

  const unhappy = (threshold) => {
    const out = [];
    for (let i = 0; i < n; i++) if (grid[i] !== EMPTY && !content(i, grid[i], threshold)) out.push(i);
    return out;
  };

  // Two movement rules. 'random': any empty cell, as in Parable of the Polygons.
  // 'nearest': the nearest empty cell (counting squares across and down) where the agent would be
  // content, as in Schelling (1971, p. 155); if there is none, it stays put.
  function destination(i, threshold, rule) {
    if (rule === 'random') return Math.floor(random() * vacant.length);
    const kind = grid[i], x = i % cols, y = (i - x) / cols;
    let best = -1, bestD = Infinity, ties = 0;
    for (let k = 0; k < vacant.length; k++) {
      const v = vacant[k], vx = v % cols, vy = (v - vx) / cols;
      const d = Math.abs(vx - x) + Math.abs(vy - y);
      if (d > bestD || !content(v, kind, threshold, i)) continue;
      if (d < bestD) { bestD = d; best = k; ties = 1; }
      else if (random() < 1 / ++ties) best = k; // reservoir pick among equally near cells
    }
    return best;
  }

  // One pass: every agent unhappy at the start of the pass gets a turn, in random order, and
  // moves only if it is still unhappy when its turn comes. Stops after `budget` moves.
  // Returns how many moved and how many were unhappy at the start.
  function step(threshold, rule, budget = Infinity, now = 0) {
    const queue = unhappy(threshold);
    for (let k = queue.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [queue[k], queue[j]] = [queue[j], queue[k]];
    }
    let moves = 0;
    for (const i of queue) {
      if (moves >= budget) break;
      if (grid[i] === EMPTY || content(i, grid[i], threshold)) continue;
      const k = destination(i, threshold, rule);
      if (k < 0) continue;
      const v = vacant[k];
      grid[v] = grid[i];
      grid[i] = EMPTY;
      vacant[k] = i;
      moved[v] = now;
      moves++;
    }
    return { moves, unhappy: queue.length };
  }

  // Schelling's own measure (1971, p. 156): the average share of an agent's neighbours that are
  // of its own kind, over agents that have at least one neighbour.
  function segregation() {
    let sum = 0, m = 0;
    for (let i = 0; i < n; i++) {
      if (grid[i] === EMPTY) continue;
      const [like, total] = count(i, grid[i]);
      if (total) { sum += like / total; m++; }
    }
    return m ? sum / m : 0;
  }

  return { cols, rows, grid, moved, step, unhappy, segregation, content };
}
