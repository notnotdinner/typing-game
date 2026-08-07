// Letter / digit banks for Balloon Pop — one character per balloon.

window.LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
window.DIGITS = "0123456789".split("");

// Frequency weighting: easier letters more common on easy; hard mixes more evenly.
window.LETTER_WEIGHTS = {
  easy: {
    // home-row heavy
    a: 3, s: 3, d: 3, f: 3, j: 3, k: 3, l: 3,
    e: 2, r: 2, t: 2, u: 2, i: 2, o: 2, n: 2, m: 2,
    g: 1, h: 1, c: 1, v: 1, b: 1, y: 1, w: 1, q: 1, x: 1, z: 1, p: 1,
  },
  normal: null, // uniform
  hard: null,   // uniform (spawn is faster instead)
};

/**
 * Pick a single character for a balloon.
 * @param {"easy"|"normal"|"hard"} difficulty
 * @param {boolean} includeNumbers
 * @param {string[]} [avoid] chars currently on screen (prefer unused)
 */
window.pickLetter = function pickLetter(difficulty, includeNumbers, avoid) {
  const diff = ["easy", "normal", "hard"].includes(difficulty) ? difficulty : "normal";
  const avoidSet = new Set(avoid || []);

  const pool = [];
  const weights = window.LETTER_WEIGHTS[diff];

  if (weights) {
    for (const [ch, w] of Object.entries(weights)) {
      for (let i = 0; i < w; i++) pool.push(ch);
    }
  } else {
    pool.push(...window.LETTERS);
  }

  if (includeNumbers) {
    // mix in digits ~25% weight
    const digitCopies = Math.max(2, Math.floor(pool.length / 12));
    for (const d of window.DIGITS) {
      for (let i = 0; i < digitCopies; i++) pool.push(d);
    }
  }

  // Prefer letters not already on screen
  const free = pool.filter((c) => !avoidSet.has(c));
  const use = free.length ? free : pool;
  return use[Math.floor(Math.random() * use.length)];
};

// Back-compat alias if anything still calls pickToken
window.pickToken = function pickToken(difficulty, includeNumbers) {
  return window.pickLetter(difficulty, includeNumbers, []);
};
