// A–Z phonics for kids: multiple words per letter, pick at random.
// Each entry: { word, emoji }

window.PHONICS_BANK = {
  a: [
    { word: "apple", emoji: "🍎" },
    { word: "ant", emoji: "🐜" },
    { word: "airplane", emoji: "✈️" },
    { word: "alligator", emoji: "🐊" },
  ],
  b: [
    { word: "ball", emoji: "⚽" },
    { word: "banana", emoji: "🍌" },
    { word: "bear", emoji: "🐻" },
    { word: "bird", emoji: "🐦" },
  ],
  c: [
    { word: "cat", emoji: "🐱" },
    { word: "car", emoji: "🚗" },
    { word: "cake", emoji: "🎂" },
    { word: "cow", emoji: "🐄" },
  ],
  d: [
    { word: "dog", emoji: "🐶" },
    { word: "duck", emoji: "🦆" },
    { word: "door", emoji: "🚪" },
    { word: "drum", emoji: "🥁" },
  ],
  e: [
    { word: "elephant", emoji: "🐘" },
    { word: "egg", emoji: "🥚" },
    { word: "ear", emoji: "👂" },
    { word: "eagle", emoji: "🦅" },
  ],
  f: [
    { word: "fish", emoji: "🐟" },
    { word: "frog", emoji: "🐸" },
    { word: "flower", emoji: "🌸" },
    { word: "fox", emoji: "🦊" },
  ],
  g: [
    { word: "goat", emoji: "🐐" },
    { word: "grape", emoji: "🍇" },
    { word: "guitar", emoji: "🎸" },
    { word: "giraffe", emoji: "🦒" },
  ],
  h: [
    { word: "hat", emoji: "🎩" },
    { word: "house", emoji: "🏠" },
    { word: "horse", emoji: "🐴" },
    { word: "heart", emoji: "❤️" },
  ],
  i: [
    { word: "ice cream", emoji: "🍦" },
    { word: "igloo", emoji: "🧊" },
    { word: "insect", emoji: "🐛" },
    { word: "island", emoji: "🏝️" },
  ],
  j: [
    { word: "juice", emoji: "🧃" },
    { word: "jelly", emoji: "🍮" },
    { word: "jacket", emoji: "🧥" },
    { word: "jam", emoji: "🍓" },
  ],
  k: [
    { word: "kite", emoji: "🪁" },
    { word: "key", emoji: "🔑" },
    { word: "king", emoji: "🤴" },
    { word: "koala", emoji: "🐨" },
  ],
  l: [
    { word: "lion", emoji: "🦁" },
    { word: "leaf", emoji: "🍃" },
    { word: "lamp", emoji: "💡" },
    { word: "lemon", emoji: "🍋" },
  ],
  m: [
    { word: "monkey", emoji: "🐵" },
    { word: "moon", emoji: "🌙" },
    { word: "mouse", emoji: "🐭" },
    { word: "milk", emoji: "🥛" },
  ],
  n: [
    { word: "nest", emoji: "🪺" },
    { word: "nose", emoji: "👃" },
    { word: "night", emoji: "🌃" },
    { word: "noodles", emoji: "🍜" },
  ],
  o: [
    { word: "orange", emoji: "🍊" },
    { word: "octopus", emoji: "🐙" },
    { word: "owl", emoji: "🦉" },
    { word: "ocean", emoji: "🌊" },
  ],
  p: [
    { word: "pig", emoji: "🐷" },
    { word: "pizza", emoji: "🍕" },
    { word: "penguin", emoji: "🐧" },
    { word: "pencil", emoji: "✏️" },
  ],
  q: [
    { word: "queen", emoji: "👑" },
    { word: "quilt", emoji: "🛏️" },
    { word: "question", emoji: "❓" },
    { word: "quiet", emoji: "🤫" },
  ],
  r: [
    { word: "rabbit", emoji: "🐰" },
    { word: "rainbow", emoji: "🌈" },
    { word: "robot", emoji: "🤖" },
    { word: "rose", emoji: "🌹" },
  ],
  s: [
    { word: "sun", emoji: "☀️" },
    { word: "star", emoji: "⭐" },
    { word: "snake", emoji: "🐍" },
    { word: "ship", emoji: "🚢" },
  ],
  t: [
    { word: "tree", emoji: "🌳" },
    { word: "tiger", emoji: "🐯" },
    { word: "train", emoji: "🚂" },
    { word: "turtle", emoji: "🐢" },
  ],
  u: [
    { word: "umbrella", emoji: "☂️" },
    { word: "unicorn", emoji: "🦄" },
    { word: "up", emoji: "⬆️" },
    { word: "uniform", emoji: "👕" },
  ],
  v: [
    { word: "violin", emoji: "🎻" },
    { word: "van", emoji: "🚐" },
    { word: "volcano", emoji: "🌋" },
    { word: "vase", emoji: "🏺" },
  ],
  w: [
    { word: "watermelon", emoji: "🍉" },
    { word: "water", emoji: "💧" },
    { word: "wolf", emoji: "🐺" },
    { word: "window", emoji: "🪟" },
  ],
  x: [
    { word: "x-ray", emoji: "🦴" },
    { word: "xylophone", emoji: "🎶" },
    { word: "box", emoji: "📦" },
    { word: "fox", emoji: "🦊" },
  ],
  y: [
    { word: "yacht", emoji: "⛵" },
    { word: "yellow", emoji: "💛" },
    { word: "yo-yo", emoji: "🪀" },
    { word: "yogurt", emoji: "🥣" },
  ],
  z: [
    { word: "zebra", emoji: "🦓" },
    { word: "zoo", emoji: "🦁" },
    { word: "zipper", emoji: "🤐" },
    { word: "zero", emoji: "0️⃣" },
  ],
};

/**
 * How to SPEAK each letter NAME for kids (A B C…, not short phonemes).
 * A must be English "ay/ei" (/eɪ/), NOT short "a" / Chinese「啊」.
 *
 * Spelling tricks force en-US TTS to say the letter name clearly & slowly:
 * - A → "ay" (ei), never bare "a" which some engines shorten
 * - Others: "bee", "see", "dee"… classic letter-name spellings
 */
// Spoken letter-name shown on screen + used for audio file content
// B = "bee" (not D). D = "dee". A = "ay" (ei).
window.LETTER_NAMES = {
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "jee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "ell",
  m: "em",
  n: "en",
  o: "oh",
  p: "pee",
  q: "cue",
  r: "ar",
  s: "ess",
  t: "tee",
  u: "you",
  v: "vee",
  w: "double-u",
  x: "ex",
  y: "why",
  z: "zee",
};

// Legacy alias
window.PHONICS_SOUNDS = Object.fromEntries(
  Object.entries(window.LETTER_NAMES).map(([k, text]) => [
    k,
    { lang: "en-US", text, repeat: 2 },
  ])
);

// Avoid showing the exact same word twice in a row for a letter
const _lastWord = Object.create(null);

/**
 * Pick a random phonics card for a letter.
 * @returns {{ letter, word, emoji, phrase, sound } | null}
 */
window.getPhonics = function getPhonics(ch) {
  if (!ch) return null;
  const key = String(ch).toLowerCase();
  if (key < "a" || key > "z") return null;
  const bank = window.PHONICS_BANK[key];
  if (!bank || !bank.length) return null;

  let pick;
  if (bank.length === 1) {
    pick = bank[0];
  } else {
    // Prefer a different word than last time for this letter
    const last = _lastWord[key];
    const pool = last ? bank.filter((w) => w.word !== last) : bank;
    const use = pool.length ? pool : bank;
    pick = use[Math.floor(Math.random() * use.length)];
  }
  _lastWord[key] = pick.word;

  const letter = key.toUpperCase();
  const sound =
    window.PHONICS_SOUNDS[key] || { lang: "en-US", text: "ay", repeat: 2 };
  return {
    letter,
    word: pick.word,
    emoji: pick.emoji,
    phrase: `${letter} for ${pick.word}`,
    sound,
  };
};

// Back-compat: first word of each letter as static map
window.PHONICS = {};
for (const [k, list] of Object.entries(window.PHONICS_BANK)) {
  const first = list[0];
  window.PHONICS[k] = {
    letter: k.toUpperCase(),
    word: first.word,
    emoji: first.emoji,
    phrase: `${k.toUpperCase()} for ${first.word}`,
  };
}
