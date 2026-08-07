(() => {
  const STORAGE = {
    best: "balloon-pop.best",
    diff: "balloon-pop.diff",
    numbers: "balloon-pop.numbers",
    music: "balloon-pop.music",
    sfx: "balloon-pop.sfx",
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
  const inputEl = document.getElementById("input");
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

  // State
  let difficulty = localStorage.getItem(STORAGE.diff) || "normal";
  let includeNumbers = localStorage.getItem(STORAGE.numbers) === "1";
  let musicOn = localStorage.getItem(STORAGE.music) !== "0";
  let sfxOn = localStorage.getItem(STORAGE.sfx) !== "0";
  let best = Number(localStorage.getItem(STORAGE.best) || 0);

  let state = "menu"; // menu | playing | over
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 3;
  let popped = 0;
  let lastKey = "";
  let balloons = []; // { id, letter, x, y, speed, color, el }
  let nextId = 1;
  let spawnAcc = 0;
  let lastTs = 0;
  let rafId = null;

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

  function updateHud() {
    scoreEl.textContent = String(score);
    comboEl.textContent = String(combo);
    livesEl.textContent = hearts(lives);
    bestEl.textContent = String(best);
    typedEl.textContent = lastKey ? lastKey.toUpperCase() : "";
  }

  function syncSettingsUI() {
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.diff === difficulty);
    });
    numbersOpt.checked = includeNumbers;
    numbersLabel.textContent = includeNumbers
      ? "开启（字母 + 数字 0–9）"
      : "关闭（仅字母 a–z）";
  }

  // --- Balloons: one letter each ---
  function spawnBalloon() {
    const cfg = DIFFICULTY[difficulty];
    if (balloons.length >= cfg.maxBalloons) return;

    const used = balloons.map((b) => b.letter);
    const letter = window.pickLetter(difficulty, includeNumbers, used);

    let x = 8 + Math.random() * 84;
    for (let attempt = 0; attempt < 10; attempt++) {
      const clash = balloons.some((b) => Math.abs(b.x - x) < 9 && b.y < 30);
      if (!clash) break;
      x = 8 + Math.random() * 84;
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);

    const el = document.createElement("div");
    el.className = "balloon";
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

    balloons.push({
      id: nextId++,
      letter, // always lowercase a-z or digit
      x,
      y: -10,
      speed,
      color,
      el,
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

  function popBalloon(b) {
    const cfg = DIFFICULTY[difficulty];
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const mult = 1 + Math.min(combo - 1, 12) * 0.12;
    const pts = Math.round(cfg.scoreBase * mult);
    score += pts;
    popped += 1;

    floatScore(b.x, b.y, pts);
    playPop();

    b.el.classList.add("popping");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 350);
    updateHud();
  }

  function loseLife(b) {
    lives -= 1;
    combo = 0;
    playMiss();
    b.el.classList.add("escape");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 400);
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

    spawnAcc += dt * 1000;
    // Easy barely speeds up; hard ramps more
    const floor = difficulty === "easy" ? 0.82 : difficulty === "hard" ? 0.48 : 0.58;
    const rampScale = difficulty === "easy" ? 8000 : 4000;
    const ramp = Math.max(floor, 1 - score / rampScale);
    if (spawnAcc >= cfg.spawnMs * ramp) {
      spawnAcc = 0;
      spawnBalloon();
    }

    for (const b of [...balloons]) {
      b.y += (b.speed * dt * 100) / stageH;
      b.el.style.bottom = `${b.y}%`;
      const sway = Math.sin(ts / 480 + b.id * 1.7) * 5;
      b.el.style.transform = `translateX(calc(-50% + ${sway}px))`;
      if (b.y > 100) loseLife(b);
    }

    rafId = requestAnimationFrame(loop);
  }

  // --- Control ---
  function clearBalloons() {
    balloons.forEach((b) => b.el.remove());
    balloons = [];
  }

  function showMenu(title, msg, btnText, stats) {
    state = stats ? "over" : "menu";
    overlay.classList.remove("hidden");
    overlayTitle.textContent = title;
    overlayMsg.innerHTML = msg;
    startBtn.textContent = btnText;
    settingsEl.style.display = stats ? "none" : "";
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

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function focusInput() {
    // Keep a real focused input so keyboards (esp. iPad / soft keyboard) work
    try {
      inputEl.focus({ preventScroll: true });
    } catch (_) {
      inputEl.focus();
    }
  }

  function startGame() {
    ensureAudio();
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
    clearBalloons();
    updateHud();
    hideOverlay();
    state = "playing";
    playStart();
    if (musicOn) startMusic();
    focusInput();
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
    if (state !== "playing") return;
    state = "menu";
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    clearBalloons();
    lastKey = "";
    updateHud();
    showMenu(
      "已暂停",
      "可调整难度与数字选项，然后重新开始。",
      "继续 / 开始",
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
    if (state !== "playing") return;
    if (!ch) return;

    lastKey = ch;
    updateHud();

    // Match: prefer the highest balloon (most urgent) with this letter
    const matches = balloons.filter((b) => b.letter === ch);
    if (matches.length === 0) {
      combo = 0;
      playMiss();
      updateHud();
      // brief flash on typed bar
      typedEl.classList.add("miss");
      setTimeout(() => typedEl.classList.remove("miss"), 180);
      return;
    }

    matches.sort((a, b) => b.y - a.y);
    popBalloon(matches[0]);
  }

  // --- Bindings ---
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

  // Click stage to refocus input during play
  stage.addEventListener("pointerdown", (e) => {
    if (state === "playing") {
      // don't steal clicks from overlay (hidden) or buttons
      if (e.target.closest("#overlay") && !overlay.classList.contains("hidden")) return;
      focusInput();
    }
  });

  window.addEventListener(
    "keydown",
    (e) => {
      // Always handle meta keys first
      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "playing") pauseToMenu();
        return;
      }

      if (e.key === "Enter" && (state === "menu" || state === "over")) {
        // Don't steal Enter from buttons if focused — still start is fine
        e.preventDefault();
        startGame();
        return;
      }

      if (state !== "playing") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Prefer e.key, fall back to e.code (works even with some IME quirks)
      let ch = normalizeKey(e.key);
      if (!ch) ch = normalizeFromCode(e.code);
      if (!ch) return;

      e.preventDefault();
      onLetter(ch);
    },
    true // capture: beat anything that might stop propagation
  );

  // Soft keyboard / mobile: input event
  inputEl.addEventListener("input", () => {
    const v = inputEl.value;
    if (!v) return;
    // take last char typed
    const raw = v[v.length - 1];
    inputEl.value = "";
    const ch = normalizeKey(raw);
    if (ch) onLetter(ch);
  });

  // Re-focus if blur while playing (user clicked outside)
  inputEl.addEventListener("blur", () => {
    if (state === "playing") {
      setTimeout(() => {
        if (state === "playing") focusInput();
      }, 10);
    }
  });

  // init
  bestEl.textContent = String(best);
  syncSettingsUI();
  syncAudioButtons();
  spawnClouds();
  updateHud();
  showMenu(
    "🎈 气球打字",
    "每个气球上有一个字母。按下对应键即可炸掉它。别让气球飞出顶部！",
    "开始游戏",
    null
  );
})();
