// Word / token banks for Balloon Pop typing game
// Difficulty controls length; numbers are optional tokens.

window.WORD_BANKS = {
  easy: [
    "cat", "dog", "sun", "run", "jump", "ball", "sky", "red", "blue", "go",
    "hi", "yes", "no", "up", "down", "hot", "cold", "big", "small", "fast",
    "slow", "happy", "fun", "play", "game", "type", "key", "pop", "fly", "air",
    "bird", "tree", "leaf", "rain", "snow", "wind", "star", "moon", "book", "pen",
    "cup", "hat", "box", "car", "bus", "map", "net", "web", "code", "app",
    "love", "hope", "kind", "soft", "hard", "open", "close", "start", "stop", "win",
  ],
  normal: [
    "apple", "banana", "orange", "window", "garden", "river", "mountain", "planet",
    "coffee", "sunset", "morning", "quiet", "bright", "shadow", "forest", "ocean",
    "castle", "signal", "network", "system", "design", "simple", "modern", "classic",
    "random", "perfect", "almost", "always", "never", "maybe", "should", "could",
    "typing", "letter", "space", "enter", "shift", "control", "option", "command",
    "keyboard", "practice", "speed", "accuracy", "challenge", "focus", "rhythm",
    "finger", "muscle", "memory", "browser", "project", "github", "tablet", "laptop",
    "balloon", "float", "escape", "target", "score", "combo", "level", "power",
    "yellow", "purple", "silver", "golden", "circle", "square", "triangle", "pixel",
    "button", "screen", "mouse", "click", "press", "hold", "release", "match",
  ],
  hard: [
    "keyboard", "accuracy", "challenge", "algorithm", "javascript", "function",
    "variable", "constant", "interface", "component", "database", "protocol",
    "framework", "structure", "performance", "optimization", "asynchronous",
    "repository", "deployment", "container", "kubernetes", "typescript",
    "responsive", "animation", "transition", "accessibility", "documentation",
    "configuration", "environment", "authentication", "authorization",
    "middleware", "serialization", "deserialization", "concurrency",
    "synchronization", "encapsulation", "polymorphism", "inheritance",
    "abstraction", "architecture", "microservice", "orchestration",
    "balloon", "floating", "pressure", "elevation", "trajectory", "velocity",
    "explosion", "destruction", "precision", "mastery", "dedication",
    "persistence", "consistency", "improvement", "breakthrough", "milestone",
  ],
};

// Digit strings used when "numbers" option is on
window.NUMBER_TOKENS = {
  easy: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "10", "12", "20", "50", "100"],
  normal: [
    "12", "24", "36", "48", "64", "99", "100", "128", "256", "512",
    "2024", "2025", "2026", "404", "8080", "3000", "42", "7", "13", "77",
  ],
  hard: [
    "1024", "2048", "4096", "8192", "65536", "31415", "27182", "12345",
    "98765", "11111", "22222", "99999", "123456", "654321", "8675309",
    "3.14", "2.71", "1.618", "42.0", "100.5",
  ],
};

// Mixed alphanumeric tokens (only when numbers enabled)
window.MIXED_TOKENS = {
  easy: ["a1", "b2", "c3", "x9", "z0", "go2", "hi5", "ok1"],
  normal: ["ab12", "xy99", "key2", "type3", "pop7", "win4", "lvl5", "hp10"],
  hard: ["code42", "port8080", "http200", "err404", "git2", "v1.0", "sha256", "utf8"],
};

/**
 * Pick a random token for a balloon.
 * @param {"easy"|"normal"|"hard"} difficulty
 * @param {boolean} includeNumbers
 */
window.pickToken = function pickToken(difficulty, includeNumbers) {
  const diff = window.WORD_BANKS[difficulty] ? difficulty : "normal";
  const words = window.WORD_BANKS[diff];

  if (!includeNumbers) {
    return words[Math.floor(Math.random() * words.length)];
  }

  // Weighted mix: mostly words, some pure numbers, some mixed
  const r = Math.random();
  if (r < 0.55) {
    return words[Math.floor(Math.random() * words.length)];
  }
  if (r < 0.85) {
    const nums = window.NUMBER_TOKENS[diff];
    return nums[Math.floor(Math.random() * nums.length)];
  }
  const mixed = window.MIXED_TOKENS[diff];
  return mixed[Math.floor(Math.random() * mixed.length)];
};
