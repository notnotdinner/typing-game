// Word banks for Type Rush
window.WORD_BANKS = {
  en: [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
    "keyboard", "practice", "speed", "accuracy", "challenge", "focus", "rhythm",
    "finger", "muscle", "memory", "browser", "project", "github", "tablet", "laptop",
    "orange", "banana", "window", "garden", "river", "mountain", "planet", "coffee",
    "sunset", "morning", "quiet", "bright", "shadow", "forest", "ocean", "castle",
    "signal", "network", "system", "design", "simple", "modern", "classic", "random",
    "perfect", "almost", "always", "never", "maybe", "should", "could", "would",
    "typing", "letter", "space", "enter", "shift", "control", "option", "command",
  ],
  code: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "class",
    "import", "export", "from", "async", "await", "promise", "null", "true", "false",
    "typeof", "interface", "type", "extends", "implements", "public", "private",
    "string", "number", "boolean", "array", "object", "map", "filter", "reduce",
    "console", "log", "error", "try", "catch", "throw", "new", "this", "super",
    "default", "switch", "case", "break", "continue", "yield", "static", "void",
    "git", "commit", "push", "pull", "branch", "merge", "clone", "status", "diff",
    "npm", "node", "react", "html", "css", "json", "http", "fetch", "api", "route",
    "server", "client", "module", "package", "config", "build", "test", "debug",
    "index", "main", "app", "src", "lib", "util", "hook", "state", "props", "render",
    "document", "window", "query", "selector", "event", "listener", "keydown", "input",
    "localStorage", "session", "cookie", "token", "auth", "user", "admin", "role",
  ],
  mix: null, // filled at runtime from en + code
};

window.QUOTES = [
  "Practice makes progress, not perfection.",
  "The quick brown fox jumps over the lazy dog.",
  "Code is like humor. When you have to explain it, it is bad.",
  "Stay hungry, stay foolish.",
  "Simplicity is the ultimate sophistication.",
  "First, solve the problem. Then, write the code.",
  "Talk is cheap. Show me the code.",
  "Programs must be written for people to read.",
  "Make it work, make it right, make it fast.",
  "The best way to predict the future is to invent it.",
  "Typing is a skill you can feel improve every day.",
  "A journey of a thousand miles begins with a single step.",
  "Focus on the keys, not on the clock.",
  "Good design is as little design as possible.",
  "Move fast and keep your accuracy high.",
];

window.WORD_BANKS.mix = window.WORD_BANKS.en.concat(window.WORD_BANKS.code);
