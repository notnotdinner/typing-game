(() => {
  const STORAGE = {
    best: "balloon-pop.best",
    diff: "balloon-pop.diff",
    numbers: "balloon-pop.numbers",
    music: "balloon-pop.music",
    sfx: "balloon-pop.sfx",
    playMode: "balloon-pop.playMode", // game | phonics
  };

  const DIFFICULTY = {
    easy: {
      label: "简单",
      spawnMs: 2400, // slow spawn — plenty of time to react
      speedMin: 10,
      speedMax: 18,
      maxBalloons: 4,
      lives: 5,
      scoreBase: 10,
    },
    normal: {
      label: "普通",
      spawnMs: 1100,
      speedMin: 24,
      speedMax: 42,
      maxBalloons: 7,
      lives: 3,
      scoreBase: 15,
    },
    hard: {
      label: "困难",
      spawnMs: 700,
      speedMin: 40,
      speedMax: 68,
      maxBalloons: 10,
      lives: 3,
      scoreBase: 25,
    },
  };

  const COLORS = [
    { body: "#ff6b6b", knot: "#e05555" },
    { body: "#ff9f43", knot: "#e08a30" },
    { body: "#feca57", knot: "#e0b040" },
    { body: "#1dd1a1", knot: "#10b888" },
    { body: "#54a0ff", knot: "#3d8ae0" },
    { body: "#5f27cd", knot: "#4a1fa8" },
    { body: "#ff9ff3", knot: "#e07fd5" },
    { body: "#48dbfb", knot: "#30c0e0" },
  ];

  // DOM
  const stage = document.getElementById("stage");
  const balloonsEl = document.getElementById("balloons");
  const skyEl = document.getElementById("sky");
  const typedEl = document.getElementById("typed");
  const typedBar = document.getElementById("typed-bar");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const settingsEl = document.getElementById("settings");
  const resultStats = document.getElementById("result-stats");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const livesEl = document.getElementById("lives");
  const bestEl = document.getElementById("best");
  const numbersOpt = document.getElementById("opt-numbers");
  const numbersLabel = document.getElementById("numbers-label");
  const btnMusic = document.getElementById("btn-music");
  const btnSfx = document.getElementById("btn-sfx");
  const hudGame = document.getElementById("hud-game");
  const hudPhonics = document.getElementById("hud-phonics");
  const gameSettings = document.getElementById("game-settings");
  const phonicsHint = document.getElementById("phonics-hint");
  const phonicsPanel = document.getElementById("phonics-panel");
  const phEmojiWrap = document.getElementById("ph-emoji-wrap");
  const phEmoji = document.getElementById("ph-emoji");
  const phLetter = document.getElementById("ph-letter");
  const phPhrase = document.getElementById("ph-phrase");
  const phWord = document.getElementById("ph-word");
  const phKeys = document.getElementById("ph-keys");
  const phCount = document.getElementById("ph-count");
  const phLast = document.getElementById("ph-last");
  const footerHint = document.getElementById("footer-hint");
  let phAnimTimer = null;
  // Cycle cute motion styles while speaking
  const PH_ANIMS = ["bounce", "wiggle", "spin", "float", "heartbeat"];

  // State
  let playMode = localStorage.getItem(STORAGE.playMode) || "game"; // game | phonics
  let difficulty = localStorage.getItem(STORAGE.diff) || "normal";
  let includeNumbers = localStorage.getItem(STORAGE.numbers) === "1";
  let musicOn = localStorage.getItem(STORAGE.music) !== "0";
  let sfxOn = localStorage.getItem(STORAGE.sfx) !== "0";
  let best = Number(localStorage.getItem(STORAGE.best) || 0);

  let state = "menu"; // menu | playing | over | phonics
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 3;
  let popped = 0;
  let lastKey = "";
  let balloons = []; // { id, letter, x, y, speed, color, el, egg? }
  let nextId = 1;
  let spawnAcc = 0;
  let lastTs = 0;
  let rafId = null;

  // Easter egg: 10 identical letters, clear all for fanfare
  let egg = null; // { letter, remaining, total, startedAt }
  let eggCooldown = 0; // ms until next egg can trigger
  let eggPlayTime = 0; // ms played this run
  const EGG_COUNT = 10;
  const EGG_COOLDOWN_MS = 28000;
  const EGG_MIN_PLAY_MS = 12000; // don't fire in the first few seconds

  // Anti-mash: stop keyboard spam from clearing balloons by luck
  const MASH = {
    streakLock: 4, // consecutive misses → lock
    windowMs: 1400, // sliding window
    windowMax: 6, // misses in window → lock
    lockMs: 1200, // base lock duration
    lockStepMs: 400, // extra lock if they keep mashing while locked
    lockCapMs: 2800,
    penalty: 8, // score penalty on lock
  };
  let missStreak = 0;
  let missTimes = []; // recent miss timestamps
  let inputLockedUntil = 0;
  let lockCount = 0; // how many times locked this run (escalates slightly)

  // Phonics session
  let phSeen = new Set(); // unique letters heard this session
  let preferredVoice = null;

  // --- Audio ---
  let audioCtx = null;
  let musicNodes = null;
  let musicPlaying = false;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function tone(freq, dur, type = "sine", gain = 0.12, when = 0) {
    const ctx = ensureAudio();
    if (!ctx || !sfxOn) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playPop() {
    tone(520, 0.08, "triangle", 0.1);
    tone(780, 0.1, "sine", 0.07, 0.03);
    tone(220, 0.12, "square", 0.04, 0.02);
  }

  function playMiss() {
    tone(180, 0.15, "sawtooth", 0.06);
    tone(120, 0.18, "triangle", 0.04, 0.04);
  }

  function playLock() {
    tone(140, 0.12, "square", 0.05);
    tone(110, 0.2, "sawtooth", 0.06, 0.08);
    tone(90, 0.25, "triangle", 0.05, 0.18);
  }

  function playLockedTap() {
    // soft reject while locked
    tone(90, 0.05, "square", 0.03);
  }

  function playGameOver() {
    tone(330, 0.2, "triangle", 0.1);
    tone(260, 0.25, "triangle", 0.09, 0.15);
    tone(196, 0.4, "sine", 0.1, 0.35);
  }

  function playStart() {
    tone(392, 0.1, "sine", 0.08);
    tone(523, 0.1, "sine", 0.08, 0.1);
    tone(659, 0.18, "sine", 0.09, 0.2);
  }

  function playEggAppear() {
    // Magical chime when egg wave starts
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, 0.14, "triangle", 0.09, i * 0.07));
    tone(1318.5, 0.22, "sine", 0.06, 0.28);
  }

  function playEggClear() {
    // Big fanfare arpeggio + sparkle
    const ctx = ensureAudio();
    if (!ctx || !sfxOn) return;
    const fanfare = [
      [523.25, 0],
      [659.25, 0.08],
      [783.99, 0.16],
      [1046.5, 0.24],
      [1318.5, 0.34],
      [1568.0, 0.44],
      [2093.0, 0.56],
    ];
    fanfare.forEach(([f, t]) => {
      tone(f, 0.28, "triangle", 0.11, t);
      tone(f * 2, 0.18, "sine", 0.04, t + 0.02);
    });
    // shimmer cascade
    for (let i = 0; i < 10; i++) {
      tone(1200 + i * 90, 0.06, "sine", 0.035, 0.7 + i * 0.04);
    }
    // deep boom
    tone(98, 0.45, "sine", 0.08, 0.5);
    tone(196, 0.35, "triangle", 0.07, 0.52);
  }

  function stopMusic() {
    if (musicNodes) {
      if (musicNodes.timers) {
        musicNodes.timers.forEach((id) => clearInterval(id));
      }
      if (musicNodes.arpId) clearInterval(musicNodes.arpId);
      try {
        const nodes = musicNodes;
        if (nodes.gain && audioCtx) {
          nodes.gain.gain.cancelScheduledValues(audioCtx.currentTime);
          nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, audioCtx.currentTime);
          nodes.gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
        }
        setTimeout(() => {
          try {
            (nodes.oscillators || []).forEach((o) => {
              try {
                o.stop();
              } catch (_) {}
            });
          } catch (_) {}
        }, 200);
      } catch (_) {}
      musicNodes = null;
    }
    musicPlaying = false;
  }

  // Cheerful major-key loop: plucky melody + light bass + soft pulse
  function startMusic() {
    if (!musicOn) return;
    const ctx = ensureAudio();
    if (!ctx || musicPlaying) return;

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
    // fade in gently
    master.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 0.4);

    // Soft high shelf / bright filter so it feels airy, not dark
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    filter.Q.value = 0.6;
    filter.connect(master);

    // --- Bass: bouncing root notes (C major-ish) ---
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = "triangle";
    bassOsc.frequency.value = 130.81; // C3
    bassGain.gain.value = 0.0;
    bassOsc.connect(bassGain);
    bassGain.connect(filter);
    bassOsc.start();

    // --- Melody: bright square (softened) ---
    const melOsc = ctx.createOscillator();
    const melGain = ctx.createGain();
    melOsc.type = "triangle";
    melOsc.frequency.value = 523.25; // C5
    melGain.gain.value = 0.0;
    melOsc.connect(melGain);
    melGain.connect(filter);
    melOsc.start();

    // --- Harmony third (gentle) ---
    const harmOsc = ctx.createOscillator();
    const harmGain = ctx.createGain();
    harmOsc.type = "sine";
    harmOsc.frequency.value = 659.25; // E5
    harmGain.gain.value = 0.0;
    harmOsc.connect(harmGain);
    harmGain.connect(filter);
    harmOsc.start();

    // Major, bouncy motif (Hz). Pattern feels like a simple kids' game jingle.
    // C major: C D E G A, with rests as 0
    const melody = [
      523.25, 587.33, 659.25, 783.99, // C D E G
      659.25, 587.33, 523.25, 0, // E D C rest
      587.33, 659.25, 783.99, 880.0, // D E G A
      783.99, 659.25, 587.33, 523.25, // G E D C
      659.25, 783.99, 880.0, 1046.5, // E G A C'
      880.0, 783.99, 659.25, 0, // A G E rest
      523.25, 659.25, 783.99, 659.25, // C E G E
      587.33, 523.25, 392.0, 523.25, // D C G C
    ];
    // Bass roots under 4-note chunks
    const bassLine = [
      130.81, 130.81, 146.83, 146.83, // C C D D
      164.81, 164.81, 130.81, 130.81, // E E C C
      146.83, 146.83, 174.61, 174.61, // D D F F
      196.0, 164.81, 146.83, 130.81, // G E D C
    ];

    const beatMs = 220; // upbeat ~136 BPM eighths
    let step = 0;
    musicPlaying = true;

    function pluck(gainNode, peak, durSec) {
      const t = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(t);
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.exponentialRampToValueAtTime(peak, t + 0.018);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
    }

    const tickId = setInterval(() => {
      if (!musicPlaying || !audioCtx) {
        clearInterval(tickId);
        return;
      }
      try {
        const t = audioCtx.currentTime;
        const m = melody[step % melody.length];
        const b = bassLine[Math.floor(step / 2) % bassLine.length];

        // bass every other step (quarter feel)
        if (step % 2 === 0) {
          bassOsc.frequency.setValueAtTime(b, t);
          pluck(bassGain, 0.085, 0.28);
        }

        if (m > 0) {
          melOsc.frequency.setValueAtTime(m, t);
          // light third above melody
          harmOsc.frequency.setValueAtTime(m * 1.25, t);
          pluck(melGain, 0.07, 0.16);
          pluck(harmGain, 0.028, 0.14);
        }

        step += 1;
      } catch (_) {
        clearInterval(tickId);
      }
    }, beatMs);

    musicNodes = {
      oscillators: [bassOsc, melOsc, harmOsc],
      gain: master,
      timers: [tickId],
    };
  }

  function syncAudioButtons() {
    btnMusic.classList.toggle("active", musicOn);
    btnSfx.classList.toggle("active", sfxOn);
  }

  // --- Clouds ---
  function spawnClouds() {
    skyEl.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const c = document.createElement("div");
      c.className = "cloud";
      const w = 60 + Math.random() * 100;
      c.style.width = `${w}px`;
      c.style.height = `${w * 0.35}px`;
      c.style.top = `${8 + Math.random() * 45}%`;
      c.style.left = `${-20 - Math.random() * 40}%`;
      c.style.opacity = String(0.35 + Math.random() * 0.35);
      c.style.animationDuration = `${40 + Math.random() * 40}s`;
      c.style.animationDelay = `${-Math.random() * 40}s`;
      skyEl.appendChild(c);
    }
  }

  // --- HUD ---
  function hearts(n) {
    if (n <= 0) return "💔";
    return "❤️".repeat(n);
  }

  function isInputLocked() {
    return performance.now() < inputLockedUntil;
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    comboEl.textContent = String(combo);
    livesEl.textContent = hearts(lives);
    bestEl.textContent = String(best);
    if (isInputLocked()) {
      const left = Math.ceil((inputLockedUntil - performance.now()) / 100) / 10;
      typedEl.textContent = `🔒 ${left.toFixed(1)}s`;
      typedEl.classList.add("locked");
    } else {
      typedEl.classList.remove("locked");
      typedEl.textContent = lastKey ? lastKey.toUpperCase() : "";
    }
  }

  function clearMashState() {
    missStreak = 0;
    missTimes = [];
    inputLockedUntil = 0;
    lockCount = 0;
    stage.classList.remove("input-locked");
    typedEl.classList.remove("locked");
  }

  function registerMiss() {
    const now = performance.now();
    missStreak += 1;
    missTimes.push(now);
    // prune window
    missTimes = missTimes.filter((t) => now - t <= MASH.windowMs);

    const windowSpam = missTimes.length >= MASH.windowMax;
    const streakSpam = missStreak >= MASH.streakLock;

    if (windowSpam || streakSpam) {
      engageInputLock();
    }
  }

  function engageInputLock() {
    const now = performance.now();
    lockCount += 1;
    const extra = Math.min(lockCount - 1, 3) * MASH.lockStepMs;
    const dur = Math.min(MASH.lockCapMs, MASH.lockMs + extra);
    // If already locked, extend
    inputLockedUntil = Math.max(inputLockedUntil, now) + (isInputLocked() ? MASH.lockStepMs : dur);
    if (inputLockedUntil - now > MASH.lockCapMs) {
      inputLockedUntil = now + MASH.lockCapMs;
    }

    missStreak = 0;
    missTimes = [];
    combo = 0;
    score = Math.max(0, score - MASH.penalty);

    stage.classList.add("input-locked");
    playLock();
    showToast(`⛔ 乱按锁定 ${((inputLockedUntil - now) / 1000).toFixed(1)}s  −${MASH.penalty}`, "mash-lock");
    updateHud();

    // auto clear visual when unlock time passes
    const wait = inputLockedUntil - now + 30;
    setTimeout(() => {
      if (!isInputLocked()) {
        stage.classList.remove("input-locked");
        updateHud();
      }
    }, wait);
  }

  function syncSettingsUI() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.playmode === playMode);
    });
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.diff === difficulty);
    });
    numbersOpt.checked = includeNumbers;
    numbersLabel.textContent = includeNumbers
      ? "开启（字母 + 数字 0–9）"
      : "关闭（仅字母 a–z）";

    const isPh = playMode === "phonics";
    if (gameSettings) gameSettings.classList.toggle("hidden", isPh);
    if (phonicsHint) phonicsHint.classList.toggle("hidden", !isPh);
    if (startBtn) {
      startBtn.textContent = isPh ? "开始读音" : "开始游戏";
    }
  }

  let lastPhTapAt = 0;
  let lastPhTapCh = "";

  function buildPhonicsKeyStrip() {
    if (!phKeys) return;
    phKeys.innerHTML = "";
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(97 + i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ph-key";
      btn.dataset.ch = ch;
      btn.textContent = ch.toUpperCase();
      btn.setAttribute("aria-label", `Letter ${ch.toUpperCase()}`);
      // pointerup is more reliable on iPad; guard against click double-fire
      const fire = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state !== "phonics") return;
        const now = performance.now();
        if (lastPhTapCh === ch && now - lastPhTapAt < 320) return;
        lastPhTapAt = now;
        lastPhTapCh = ch;
        onPhonicsLetter(ch);
      };
      btn.addEventListener("pointerup", fire);
      btn.addEventListener("click", fire);
      phKeys.appendChild(btn);
    }
  }

  function markPhonicsKey(ch) {
    const el = phKeys && phKeys.querySelector(`.ph-key[data-ch="${ch}"]`);
    if (el) el.classList.add("heard");
  }

  function updatePhonicsHud() {
    if (phCount) phCount.textContent = `${phSeen.size} / 26`;
    if (phLast) {
      const last = [...phSeen].pop();
      // show most recent from typed
      phLast.textContent = lastKey ? lastKey.toUpperCase() : "—";
    }
  }

  function pickEnglishVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    // Prefer child-friendly / clear English voices
    const prefer = [
      /samantha/i,
      /karen/i,
      /moira/i,
      /daniel/i,
      /google us english/i,
      /google uk english female/i,
      /microsoft aria/i,
      /microsoft jenny/i,
      /en-us/i,
      /en-gb/i,
      /^en/i,
    ];
    for (const re of prefer) {
      const v = voices.find((x) => re.test(x.name) || re.test(x.lang));
      if (v) return v;
    }
    return voices.find((v) => (v.lang || "").toLowerCase().startsWith("en")) || voices[0];
  }

  function ensureVoice() {
    if (preferredVoice) return preferredVoice;
    preferredVoice = pickEnglishVoice();
    return preferredVoice;
  }

  // Voices may load async (Safari / Chrome)
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      preferredVoice = pickEnglishVoice();
    };
    // warm-up
    try {
      preferredVoice = pickEnglishVoice();
    } catch (_) {}
  }

  function stopEmojiSpeakAnim() {
    if (phAnimTimer) {
      clearTimeout(phAnimTimer);
      phAnimTimer = null;
    }
    if (phEmojiWrap) {
      phEmojiWrap.classList.remove("speaking");
      PH_ANIMS.forEach((a) => phEmojiWrap.classList.remove(`anim-${a}`));
    }
    if (phEmoji) phEmoji.classList.remove("speaking");
    if (phonicsPanel) phonicsPanel.classList.remove("speaking-active");
  }

  function startEmojiSpeakAnim(letter) {
    if (!phEmojiWrap || !phEmoji) return;
    stopEmojiSpeakAnim();
    // pick animation style from letter for variety
    const idx = (letter.charCodeAt(0) - 97) % PH_ANIMS.length;
    const style = PH_ANIMS[idx];
    phEmojiWrap.classList.add("speaking", `anim-${style}`);
    phEmoji.classList.add("speaking");
    if (phonicsPanel) phonicsPanel.classList.add("speaking-active");
    // reflow so CSS animation restarts cleanly
    void phEmojiWrap.offsetWidth;
  }

  /**
   * Kid-friendly speech: slow rate, clear pauses.
   * Speaks as: "A" → pause → "for apple" (letter first, then word).
   */
  function speakPhonics(entry) {
    if (!entry) return;

    const startAnim = () => startEmojiSpeakAnim(entry.letter.toLowerCase());
    const stopAnim = () => stopEmojiSpeakAnim();

    // Slow speech runs longer — keep emoji anim for full duration
    const approxMs = Math.max(4200, 1800 + entry.word.length * 220);

    if (!sfxOn) {
      startAnim();
      phAnimTimer = setTimeout(stopAnim, 900);
      return;
    }

    if (!window.speechSynthesis) {
      tone(523.25, 0.12, "sine", 0.08);
      tone(659.25, 0.14, "sine", 0.07, 0.14);
      startAnim();
      phAnimTimer = setTimeout(stopAnim, approxMs);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      stopEmojiSpeakAnim();

      const voice = ensureVoice();
      // Rate ~0.55–0.65 is slow enough for kids; pitch near 1 for clarity
      const kidRate = 0.58;
      const kidPitch = 1.0;

      function makeUtterance(text) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = kidRate;
        u.pitch = kidPitch;
        u.volume = 1;
        if (voice) u.voice = voice;
        return u;
      }

      // Part 1: letter name alone (clear bite)
      // Use spelled form so engines say "A" / "B" not "ay" weirdly on some voices
      const letterPart = makeUtterance(entry.letter);
      // Part 2: "for apple" — periods force small pauses for clearer syllables
      const wordPart = makeUtterance(`for. ${entry.word}.`);

      letterPart.onstart = () => startAnim();
      letterPart.onerror = () => stopAnim();
      wordPart.onend = () => stopAnim();
      wordPart.onerror = () => stopAnim();

      // Chain: letter → short gap → "for word"
      letterPart.onend = () => {
        // Extra silence between letter and word (~0.45s) for kids to process
        setTimeout(() => {
          if (state !== "phonics") {
            stopAnim();
            return;
          }
          try {
            window.speechSynthesis.speak(wordPart);
          } catch (_) {
            stopAnim();
          }
        }, 450);
      };

      startAnim();
      phAnimTimer = setTimeout(stopAnim, approxMs + 1200);
      window.speechSynthesis.speak(letterPart);
    } catch (_) {
      tone(523.25, 0.12, "sine", 0.08);
      startAnim();
      phAnimTimer = setTimeout(stopAnim, approxMs);
    }
  }

  function showPhonicsCard(entry) {
    if (!entry) return;
    phEmoji.textContent = entry.emoji;
    phLetter.textContent = entry.letter;
    phPhrase.textContent = entry.phrase;
    phWord.textContent = entry.word;
    phonicsPanel.classList.remove("pop");
    // reflow for animation
    void phonicsPanel.offsetWidth;
    phonicsPanel.classList.add("pop");
  }

  function onPhonicsLetter(ch) {
    // Only A–Z; ignore everything else (digits, symbols)
    if (!ch || ch < "a" || ch > "z") return;
    const entry = window.getPhonics ? window.getPhonics(ch) : null;
    if (!entry) return;

    lastKey = ch;
    phSeen.add(ch);
    markPhonicsKey(ch);
    showPhonicsCard(entry);
    speakPhonics(entry);
    // tiny click so feedback is instant even before TTS starts
    if (sfxOn) tone(660 + (ch.charCodeAt(0) - 97) * 12, 0.05, "sine", 0.04);
    updatePhonicsHud();
    typedEl.textContent = ch.toUpperCase();
  }

  function startPhonics() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    stopMusic();
    clearBalloons();
    clearMashState();
    phSeen = new Set();
    lastKey = "";
    state = "phonics";

    hudGame.classList.add("hidden");
    hudPhonics.classList.remove("hidden");
    phonicsPanel.classList.remove("hidden");
    balloonsEl.classList.add("hidden");
    if (typedBar) typedBar.classList.add("hidden");
    stage.classList.add("phonics-mode");
    stage.setAttribute("aria-label", "读音模式");

    buildPhonicsKeyStrip();
    phKeys.classList.remove("hidden");
    // reset heard styles
    phKeys.querySelectorAll(".ph-key").forEach((el) => el.classList.remove("heard"));
    phEmoji.textContent = "🔤";
    phLetter.textContent = "?";
    phPhrase.textContent = "Press a letter A–Z";
    phWord.textContent = "点下面字母，或按键盘 A–Z";
    updatePhonicsHud();
    typedEl.textContent = "";

    hideOverlay();
    // Don't steal focus away from buttons on iPad; stage focus is for BT keyboard
    try {
      stage.focus({ preventScroll: true });
    } catch (_) {}
    // Unlock voices on user gesture (iPad)
    ensureVoice();
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (footerHint) {
      footerHint.innerHTML =
        "读音模式 · 只响应 <kbd>A</kbd>–<kbd>Z</kbd> · 其它键忽略 · <kbd>Esc</kbd> 返回菜单";
    }
  }

  function stopPhonics() {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    stopEmojiSpeakAnim();
    phonicsPanel.classList.add("hidden");
    if (phKeys) phKeys.classList.add("hidden");
    balloonsEl.classList.remove("hidden");
    hudPhonics.classList.add("hidden");
    hudGame.classList.remove("hidden");
    if (typedBar) typedBar.classList.remove("hidden");
    stage.classList.remove("phonics-mode");
    stage.setAttribute("aria-label", "气球打字游戏区");
    if (footerHint) {
      footerHint.innerHTML =
        '专为 <strong>蓝牙 / 外接键盘</strong> 设计 · 一气球一字母 · 乱按会锁定输入 · <kbd>Esc</kbd> 暂停';
    }
  }

  // --- Balloons: one letter each ---
  function createBalloonEl(letter, x, color, isEgg) {
    const el = document.createElement("div");
    el.className = "balloon" + (isEgg ? " egg" : "");
    el.style.left = `${x}%`;
    el.style.bottom = `-90px`;
    el.dataset.letter = letter;
    el.innerHTML = `
      <div class="body" style="background:${color.body}">
        <span class="letter">${escapeHtml(letter.toUpperCase())}</span>
      </div>
      <div class="knot" style="border-top-color:${color.knot}"></div>
      <div class="string"></div>
    `;
    balloonsEl.appendChild(el);
    return el;
  }

  function spawnBalloon(opts = {}) {
    const cfg = DIFFICULTY[difficulty];
    const isEgg = !!opts.egg;
    if (!isEgg && balloons.length >= cfg.maxBalloons) return;
    if (!isEgg && egg) return; // pause normal spawn during egg wave

    const used = balloons.map((b) => b.letter);
    const letter =
      opts.letter ||
      window.pickLetter(difficulty, includeNumbers, used);

    let x =
      opts.x != null
        ? opts.x
        : 8 + Math.random() * 84;
    if (opts.x == null) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const clash = balloons.some((b) => Math.abs(b.x - x) < 9 && b.y < 30);
        if (!clash) break;
        x = 8 + Math.random() * 84;
      }
    }

    const color =
      opts.color ||
      (isEgg
        ? { body: "linear-gradient(145deg,#ffd700,#ff6b9d,#7c5cff)", knot: "#e0a000" }
        : COLORS[Math.floor(Math.random() * COLORS.length)]);

    // Egg balloons use solid gold-ish palette for CSS gradient workaround
    const bodyColor = isEgg
      ? ["#ffd54f", "#ff8a65", "#ce93d8", "#80deea", "#a5d6a7", "#f48fb1", "#90caf9", "#fff59d", "#ffab91", "#b39ddb"][
          balloons.filter((b) => b.egg).length % 10
        ]
      : color.body;

    const speedBase =
      opts.speed != null
        ? opts.speed
        : cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    // Egg balloons rise a bit slower so you can clear 10
    const speed = isEgg ? speedBase * 0.72 : speedBase;
    const y = opts.y != null ? opts.y : -10 - (opts.stagger || 0);

    const el = createBalloonEl(letter, x, { body: bodyColor, knot: color.knot || "#e0a000" }, isEgg);

    balloons.push({
      id: nextId++,
      letter,
      x,
      y,
      speed,
      color: { body: bodyColor, knot: color.knot || "#ccc" },
      el,
      egg: isEgg,
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function floatScore(xPct, yPct, pts) {
    const stageRect = stage.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "float-score";
    el.textContent = `+${pts}`;
    el.style.left = `${(xPct / 100) * stageRect.width}px`;
    el.style.bottom = `${(yPct / 100) * stageRect.height + 40}px`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  function showToast(text, className = "") {
    const el = document.createElement("div");
    el.className = "game-toast" + (className ? ` ${className}` : "");
    el.textContent = text;
    stage.appendChild(el);
    // reflow for animation
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hide");
      setTimeout(() => el.remove(), 400);
    }, className.includes("egg-clear") ? 2200 : 1600);
  }

  function spawnConfetti() {
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    stage.appendChild(layer);
    const colors = ["#ff6b9d", "#ffd166", "#5b9dff", "#3ddc97", "#c77dff", "#ff8e53", "#fff", "#48dbfb"];
    for (let i = 0; i < 48; i++) {
      const p = document.createElement("span");
      p.className = "confetti-piece";
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = `${Math.random() * 0.35}s`;
      p.style.animationDuration = `${1.1 + Math.random() * 0.9}s`;
      p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
      p.style.setProperty("--dx", `${Math.random() * 80 - 40}px`);
      layer.appendChild(p);
    }
    setTimeout(() => layer.remove(), 2200);
  }

  function triggerEggClearFx(letter) {
    stage.classList.add("egg-celebrate");
    showToast(`✨ 彩蛋清场！ ${letter.toUpperCase()} × ${EGG_COUNT}`, "egg-clear");
    spawnConfetti();

    // Radial flash
    const flash = document.createElement("div");
    flash.className = "egg-flash";
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 900);

    // Giant letter burst
    const burst = document.createElement("div");
    burst.className = "egg-letter-burst";
    burst.textContent = letter.toUpperCase();
    stage.appendChild(burst);
    setTimeout(() => burst.remove(), 1200);

    playEggClear();

    setTimeout(() => stage.classList.remove("egg-celebrate"), 2000);
  }

  function startEggWave() {
    if (state !== "playing" || egg) return;

    // Clear field a bit: keep existing non-egg balloons rising, but stop new normal ones
    const letter = window.pickLetter(difficulty, includeNumbers, []);
    egg = {
      letter,
      remaining: EGG_COUNT,
      total: EGG_COUNT,
      startedAt: performance.now(),
    };
    eggCooldown = EGG_COOLDOWN_MS;

    playEggAppear();
    showToast(`🎈 彩蛋！狂按  ${letter.toUpperCase()}  × ${EGG_COUNT}`, "egg-start");
    stage.classList.add("egg-active");

    // Fan 10 balloons across the width, staggered depth
    for (let i = 0; i < EGG_COUNT; i++) {
      const x = 6 + (i / (EGG_COUNT - 1)) * 88 + (Math.random() * 4 - 2);
      const stagger = (i % 5) * 4 + Math.random() * 3;
      spawnBalloon({
        letter,
        egg: true,
        x: Math.max(5, Math.min(95, x)),
        y: -12 - stagger,
        speed:
          DIFFICULTY[difficulty].speedMin * 0.85 +
          Math.random() * (DIFFICULTY[difficulty].speedMax - DIFFICULTY[difficulty].speedMin) * 0.4,
      });
    }
  }

  function maybeTriggerEgg(dtMs) {
    if (egg || state !== "playing") return;
    eggPlayTime += dtMs;
    eggCooldown = Math.max(0, eggCooldown - dtMs);
    if (eggPlayTime < EGG_MIN_PLAY_MS) return;
    if (eggCooldown > 0) return;
    // ~2% chance per second once eligible → roughly every 30–50s plus cooldown
    const chancePerSec =
      difficulty === "easy" ? 0.035 : difficulty === "hard" ? 0.05 : 0.04;
    if (Math.random() < chancePerSec * (dtMs / 1000)) {
      startEggWave();
    }
  }

  function endEgg(success) {
    if (!egg) return;
    const letter = egg.letter;
    stage.classList.remove("egg-active");
    if (success) {
      const cfg = DIFFICULTY[difficulty];
      const bonus = cfg.scoreBase * EGG_COUNT * 3;
      score += bonus;
      combo += 5;
      maxCombo = Math.max(maxCombo, combo);
      updateHud();
      // floating bonus in center
      floatScore(50, 45, bonus);
      triggerEggClearFx(letter);
    } else {
      // mark leftover egg balloons as normal so they don't block forever
      balloons.forEach((b) => {
        if (b.egg) {
          b.egg = false;
          b.el.classList.remove("egg");
        }
      });
      showToast("彩蛋中断…", "egg-fail");
    }
    egg = null;
    eggCooldown = EGG_COOLDOWN_MS;
  }

  function popBalloon(b) {
    const cfg = DIFFICULTY[difficulty];
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const mult = 1 + Math.min(combo - 1, 12) * 0.12;
    let pts = Math.round(cfg.scoreBase * mult);
    if (b.egg) pts = Math.round(pts * 1.5);
    score += pts;
    popped += 1;

    floatScore(b.x, b.y, pts);
    playPop();

    b.el.classList.add("popping");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 350);

    if (b.egg && egg) {
      egg.remaining -= 1;
      if (egg.remaining <= 0) {
        endEgg(true);
      }
    }

    updateHud();
  }

  function loseLife(b) {
    lives -= 1;
    combo = 0;
    playMiss();
    b.el.classList.add("escape");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 400);

    if (b.egg && egg) {
      endEgg(false);
    }

    updateHud();
    if (lives <= 0) endGame();
  }

  // --- Loop ---
  function loop(ts) {
    if (state !== "playing") return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const cfg = DIFFICULTY[difficulty];
    const stageH = stage.clientHeight || 400;

    maybeTriggerEgg(dt * 1000);

    spawnAcc += dt * 1000;
    // Easy barely speeds up; hard ramps more
    const floor = difficulty === "easy" ? 0.82 : difficulty === "hard" ? 0.48 : 0.58;
    const rampScale = difficulty === "easy" ? 8000 : 4000;
    const ramp = Math.max(floor, 1 - score / rampScale);
    // Pause normal spawns while egg wave is active
    if (!egg && spawnAcc >= cfg.spawnMs * ramp) {
      spawnAcc = 0;
      spawnBalloon();
    }

    for (const b of [...balloons]) {
      b.y += (b.speed * dt * 100) / stageH;
      b.el.style.bottom = `${b.y}%`;
      const sway = Math.sin(ts / 480 + b.id * 1.7) * (b.egg ? 8 : 5);
      b.el.style.transform = `translateX(calc(-50% + ${sway}px))`;
      if (b.y > 100) loseLife(b);
    }

    // Refresh lock countdown UI (~10fps is enough)
    if (inputLockedUntil > 0) {
      if (isInputLocked()) {
        if ((ts / 100) | 0 !== ((ts - dt * 1000) / 100) | 0) updateHud();
      } else {
        inputLockedUntil = 0;
        stage.classList.remove("input-locked");
        updateHud();
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  // --- Control ---
  function clearBalloons() {
    balloons.forEach((b) => b.el.remove());
    balloons = [];
    egg = null;
    stage.classList.remove("egg-active", "egg-celebrate");
  }

  function showMenu(title, msg, btnText, stats) {
    state = stats ? "over" : "menu";
    stopPhonicsUiOnly();
    overlay.classList.remove("hidden");
    overlayTitle.textContent = title;
    overlayMsg.innerHTML = msg;
    startBtn.textContent =
      btnText || (playMode === "phonics" ? "开始读音" : "开始游戏");
    settingsEl.style.display = stats ? "none" : "";
    syncSettingsUI();
    if (stats) {
      resultStats.classList.remove("hidden");
      resultStats.innerHTML = `
        <div class="box"><span class="k">得分</span><span class="v">${stats.score}</span></div>
        <div class="box"><span class="k">消灭</span><span class="v">${stats.popped}</span></div>
        <div class="box"><span class="k">最高连击</span><span class="v">${stats.maxCombo}</span></div>
      `;
    } else {
      resultStats.classList.add("hidden");
      resultStats.innerHTML = "";
    }
  }

  /** Reset phonics DOM without changing menu state text */
  function stopPhonicsUiOnly() {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    stopEmojiSpeakAnim();
    if (phonicsPanel) phonicsPanel.classList.add("hidden");
    if (phKeys) phKeys.classList.add("hidden");
    if (balloonsEl) balloonsEl.classList.remove("hidden");
    if (hudPhonics) hudPhonics.classList.add("hidden");
    if (hudGame) hudGame.classList.remove("hidden");
    if (typedBar) typedBar.classList.remove("hidden");
    stage.classList.remove("phonics-mode");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  /**
   * Focus the game stage (a div, not an input) so Bluetooth keyboards
   * send keys to the page without opening the iPad soft keyboard.
   */
  function focusStage() {
    try {
      stage.focus({ preventScroll: true });
    } catch (_) {
      stage.focus();
    }
  }

  function startGame() {
    ensureAudio();

    if (playMode === "phonics") {
      startPhonics();
      return;
    }

    stopPhonics();
    const cfg = DIFFICULTY[difficulty];
    score = 0;
    combo = 0;
    maxCombo = 0;
    lives = cfg.lives;
    popped = 0;
    lastKey = "";
    spawnAcc = difficulty === "easy" ? cfg.spawnMs * 0.85 : cfg.spawnMs * 0.45;
    lastTs = 0;
    nextId = 1;
    egg = null;
    eggCooldown = 8000;
    eggPlayTime = 0;
    clearMashState();
    clearBalloons();
    updateHud();
    hideOverlay();
    state = "playing";
    playStart();
    if (musicOn) startMusic();
    // No <input>: Bluetooth / hardware keyboard via window keydown only
    focusStage();
    // Easy starts with 1 balloon so players can settle in
    spawnBalloon();
    if (difficulty !== "easy") {
      setTimeout(() => {
        if (state === "playing") spawnBalloon();
      }, 400);
      setTimeout(() => {
        if (state === "playing") spawnBalloon();
      }, 800);
    }
    rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    if (state !== "playing") return;
    state = "over";
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    playGameOver();
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE.best, String(best));
      bestEl.textContent = String(best);
    }
    updateHud();
    const diffLabel = DIFFICULTY[difficulty].label;
    const numLabel = includeNumbers ? "含数字" : "仅字母";
    showMenu(
      "游戏结束",
      `难度 <strong>${diffLabel}</strong> · ${numLabel}<br/>按按钮或 <kbd>Enter</kbd> 再来一局`,
      "再来一局",
      { score, popped, maxCombo }
    );
  }

  function pauseToMenu() {
    if (state !== "playing" && state !== "phonics") return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopMusic();
    clearBalloons();
    lastKey = "";
    if (state === "phonics") stopPhonics();
    state = "menu";
    updateHud();
    showMenu(
      "已暂停",
      playMode === "phonics"
        ? "读音模式：按 A–Z 听 “A for apple”。其它键不响应。"
        : "可调整模式、难度与数字选项，然后重新开始。",
      playMode === "phonics" ? "继续读音" : "继续 / 开始",
      null
    );
  }

  /**
   * Normalize a key to a single game character (lowercase letter or digit).
   * Returns null if not a valid game key.
   */
  function normalizeKey(raw) {
    if (raw == null || raw === "") return null;
    // e.key for letters is often "a"/"A"; for digits "0"-"9"
    if (raw.length === 1) {
      const ch = raw.toLowerCase();
      if (ch >= "a" && ch <= "z") return ch;
      if (ch >= "0" && ch <= "9") return includeNumbers ? ch : null;
      return null;
    }
    // Some devices report Digit0 / KeyA via code
    return null;
  }

  function normalizeFromCode(code) {
    if (!code) return null;
    if (code.startsWith("Key") && code.length === 4) {
      return code.slice(3).toLowerCase();
    }
    if (code.startsWith("Digit") && code.length === 6) {
      const d = code.slice(5);
      return includeNumbers ? d : null;
    }
    if (code.startsWith("Numpad") && code.length === 7) {
      const d = code.slice(6);
      if (d >= "0" && d <= "9") return includeNumbers ? d : null;
    }
    return null;
  }

  function onLetter(ch) {
    if (state === "phonics") {
      onPhonicsLetter(ch);
      return;
    }
    if (state !== "playing") return;
    if (!ch) return;

    // Locked out after mashing — ignore all letters, extend if they keep spamming
    if (isInputLocked()) {
      playLockedTap();
      // mashing during lock slightly extends (capped)
      const now = performance.now();
      if (inputLockedUntil - now < MASH.lockCapMs) {
        inputLockedUntil = Math.min(now + MASH.lockCapMs, inputLockedUntil + 80);
      }
      updateHud();
      return;
    }

    lastKey = ch;
    updateHud();

    // Match: prefer the highest balloon (most urgent) with this letter
    const matches = balloons.filter((b) => b.letter === ch);
    if (matches.length === 0) {
      combo = 0;
      playMiss();
      registerMiss();
      updateHud();
      // brief flash on typed bar
      typedEl.classList.add("miss");
      setTimeout(() => typedEl.classList.remove("miss"), 180);
      return;
    }

    // Correct hit resets mash counters
    missStreak = 0;
    missTimes = [];
    matches.sort((a, b) => b.y - a.y);
    popBalloon(matches[0]);
  }

  // --- Bindings ---
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playMode = btn.dataset.playmode || "game";
      localStorage.setItem(STORAGE.playMode, playMode);
      syncSettingsUI();
      // Update menu copy live
      if (state === "menu") {
        if (playMode === "phonics") {
          overlayTitle.textContent = "🔊 读音模式";
          overlayMsg.innerHTML =
            "儿童学字母：按下键盘 <strong>A–Z</strong> 会播放 <em>A for apple</em> 这样的读音。数字和其它键一律忽略。";
          startBtn.textContent = "开始读音";
        } else {
          overlayTitle.textContent = "🎈 气球打字";
          overlayMsg.innerHTML =
            "接上蓝牙键盘即可玩。每个气球一个字母；偶尔会触发<strong>彩蛋</strong>——同屏 10 个相同字母，全部打掉有惊喜！";
          startBtn.textContent = "开始游戏";
        }
      }
    });
  });

  document.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      difficulty = btn.dataset.diff;
      localStorage.setItem(STORAGE.diff, difficulty);
      syncSettingsUI();
    });
  });

  numbersOpt.addEventListener("change", () => {
    includeNumbers = numbersOpt.checked;
    localStorage.setItem(STORAGE.numbers, includeNumbers ? "1" : "0");
    syncSettingsUI();
  });

  btnMusic.addEventListener("click", () => {
    musicOn = !musicOn;
    localStorage.setItem(STORAGE.music, musicOn ? "1" : "0");
    syncAudioButtons();
    if (musicOn && state === "playing") {
      ensureAudio();
      startMusic();
    } else {
      stopMusic();
    }
  });

  btnSfx.addEventListener("click", () => {
    sfxOn = !sfxOn;
    localStorage.setItem(STORAGE.sfx, sfxOn ? "1" : "0");
    syncAudioButtons();
    if (sfxOn) {
      ensureAudio();
      tone(880, 0.05, "sine", 0.04);
    }
  });

  startBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  });

  // Tap stage while playing: re-focus stage (still no soft keyboard)
  stage.addEventListener("pointerdown", (e) => {
    if (state !== "playing") return;
    if (e.target.closest("#overlay") && !overlay.classList.contains("hidden")) return;
    focusStage();
  });

  // Hardware / Bluetooth keyboard only — no text field needed on iPad
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "playing" || state === "phonics") pauseToMenu();
        return;
      }

      if (e.key === "Enter" && (state === "menu" || state === "over")) {
        // Avoid double-firing when Start button is focused
        if (document.activeElement === startBtn) return;
        e.preventDefault();
        startGame();
        return;
      }

      if (state !== "playing" && state !== "phonics") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore OS key-repeat (holding a key) — only discrete presses count
      if (e.repeat) {
        e.preventDefault();
        return;
      }

      // Prefer e.key; fall back to e.code (layout-stable on BT keyboards)
      let ch = normalizeKey(e.key);
      if (!ch) ch = normalizeFromCode(e.code);

      // Phonics: only A–Z; ignore digits and everything else
      if (state === "phonics") {
        if (!ch || ch < "a" || ch > "z") return;
        e.preventDefault();
        onLetter(ch);
        return;
      }

      if (!ch) return;

      e.preventDefault();
      onLetter(ch);
    },
    true
  );

  // init
  bestEl.textContent = String(best);
  syncSettingsUI();
  syncAudioButtons();
  spawnClouds();
  updateHud();
  if (playMode === "phonics") {
    showMenu(
      "🔊 读音模式",
      "儿童学字母：按下键盘 <strong>A–Z</strong> 会播放 <em>A for apple</em> 这样的读音。数字和其它键一律忽略。",
      "开始读音",
      null
    );
  } else {
    showMenu(
      "🎈 气球打字",
      "每个气球上有一个字母。按下对应键即可炸掉它。别让气球飞出顶部！可切换到<strong>读音模式</strong>学字母。",
      "开始游戏",
      null
    );
  }
})();
