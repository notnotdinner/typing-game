// A–Z phonics for kids: "A for apple"
window.PHONICS = {
  a: { letter: "A", word: "apple", emoji: "🍎", phrase: "A for apple" },
  b: { letter: "B", word: "ball", emoji: "⚽", phrase: "B for ball" },
  c: { letter: "C", word: "cat", emoji: "🐱", phrase: "C for cat" },
  d: { letter: "D", word: "dog", emoji: "🐶", phrase: "D for dog" },
  e: { letter: "E", word: "elephant", emoji: "🐘", phrase: "E for elephant" },
  f: { letter: "F", word: "fish", emoji: "🐟", phrase: "F for fish" },
  g: { letter: "G", word: "goat", emoji: "🐐", phrase: "G for goat" },
  h: { letter: "H", word: "hat", emoji: "🎩", phrase: "H for hat" },
  i: { letter: "I", word: "ice cream", emoji: "🍦", phrase: "I for ice cream" },
  j: { letter: "J", word: "juice", emoji: "🧃", phrase: "J for juice" },
  k: { letter: "K", word: "kite", emoji: "🪁", phrase: "K for kite" },
  l: { letter: "L", word: "lion", emoji: "🦁", phrase: "L for lion" },
  m: { letter: "M", word: "monkey", emoji: "🐵", phrase: "M for monkey" },
  n: { letter: "N", word: "nest", emoji: "🪺", phrase: "N for nest" },
  o: { letter: "O", word: "orange", emoji: "🍊", phrase: "O for orange" },
  p: { letter: "P", word: "pig", emoji: "🐷", phrase: "P for pig" },
  q: { letter: "Q", word: "queen", emoji: "👑", phrase: "Q for queen" },
  r: { letter: "R", word: "rabbit", emoji: "🐰", phrase: "R for rabbit" },
  s: { letter: "S", word: "sun", emoji: "☀️", phrase: "S for sun" },
  t: { letter: "T", word: "tree", emoji: "🌳", phrase: "T for tree" },
  u: { letter: "U", word: "umbrella", emoji: "☂️", phrase: "U for umbrella" },
  v: { letter: "V", word: "violin", emoji: "🎻", phrase: "V for violin" },
  w: { letter: "W", word: "watermelon", emoji: "🍉", phrase: "W for watermelon" },
  x: { letter: "X", word: "x-ray", emoji: "🦴", phrase: "X for x-ray" },
  y: { letter: "Y", word: "yacht", emoji: "⛵", phrase: "Y for yacht" },
  z: { letter: "Z", word: "zebra", emoji: "🦓", phrase: "Z for zebra" },
};

window.getPhonics = function getPhonics(ch) {
  if (!ch) return null;
  return window.PHONICS[String(ch).toLowerCase()] || null;
};
