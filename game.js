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
      spawnMs: 1800,
      speedMin: 22,
      speedMax: 38,
      maxBalloons: 5,
      lives: 5,
      scoreBase: 10,
    },
    normal: {
      label: "普通",
      spawnMs: 1200,
      speedMin: 32,
      speedMax: 55,
      maxBalloons: 7,
      lives: 3,
      scoreBase: 15,
    },
    hard: {
      label: "困难",
      spawnMs: 850,
      speedMin: 48,
      speedMax: 78,
      maxBalloons: 9,
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

  let state = "menu"; // menu | playing | paused | over
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let lives = 3;
  let popped = 0;
  let typed = "";
  let balloons = []; // { id, word, x, y, speed, color, el }
  let nextId = 1;
  let spawnAcc = 0;
  let lastTs = 0;
  let rafId = null;
  let activeWord = null; // currently targeted balloon word (prefix match)

  // --- Audio (Web Audio API, no external files) ---
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
    // short noise-ish chirp burst
    tone(520, 0.08, "triangle", 0.1);
    tone(780, 0.1, "sine", 0.07, 0.03);
    tone(220, 0.12, "square", 0.04, 0.02);
  }

  function playType() {
    tone(880 + Math.random() * 120, 0.04, "sine", 0.035);
  }

  function playMiss() {
    tone(180, 0.18, "sawtooth", 0.07);
    tone(120, 0.22, "triangle", 0.05, 0.05);
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
      if (musicNodes.arpId) clearInterval(musicNodes.arpId);
      try {
        musicNodes.gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
        const nodes = musicNodes;
        setTimeout(() => {
          try {
            nodes.osc1.stop();
            nodes.osc2.stop();
            nodes.lfo.stop();
          } catch (_) {}
        }, 250);
      } catch (_) {}
      musicNodes = null;
    }
    musicPlaying = false;
  }

  function startMusic() {
    if (!musicOn) return;
    const ctx = ensureAudio();
    if (!ctx || musicPlaying) return;

    const master = ctx.createGain();
    master.gain.value = 0.045;
    master.connect(ctx.destination);

    // Soft dual-osc pad with slow LFO
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.value = 196; // G3
    osc2.frequency.value = 246.94; // B3
    filter.type = "lowpass";
    filter.frequency.value = 900;
    lfo.type = "sine";
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(master);

    // Simple arpeggio pattern via scheduled freqs
    const notes = [196, 246.94, 293.66, 329.63, 293.66, 246.94];
    let step = 0;
    const arpId = setInterval(() => {
      if (!musicPlaying || !audioCtx) {
        clearInterval(arpId);
        return;
      }
      try {
        const n = notes[step % notes.length];
        osc1.frequency.setTargetAtTime(n, audioCtx.currentTime, 0.08);
        osc2.frequency.setTargetAtTime(n * 1.5, audioCtx.currentTime, 0.08);
        step += 1;
      } catch (_) {
        clearInterval(arpId);
      }
    }, 900);

    osc1.start();
    osc2.start();
    lfo.start();

    musicNodes = { osc1, osc2, lfo, gain: master, arpId };
    musicPlaying = true;
  }

  function syncAudioButtons() {
    btnMusic.classList.toggle("active", musicOn);
    btnSfx.classList.toggle("active", sfxOn);
  }

  // --- Clouds decoration ---
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
    typedEl.textContent = typed;
  }

  function syncSettingsUI() {
    document.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.diff === difficulty);
    });
    numbersOpt.checked = includeNumbers;
    numbersLabel.textContent = includeNumbers
      ? "开启（含数字 / 字母数字混合）"
      : "关闭（仅字母单词）";
  }

  // --- Balloon lifecycle ---
  function uniqueWord() {
    const used = new Set(balloons.map((b) => b.word));
    let word;
    let tries = 0;
    do {
      word = window.pickToken(difficulty, includeNumbers);
      tries += 1;
    } while (used.has(word) && tries < 40);
    return word;
  }

  function spawnBalloon() {
    const cfg = DIFFICULTY[difficulty];
    if (balloons.length >= cfg.maxBalloons) return;

    const word = uniqueWord();
    // avoid overlapping x too tightly
    let x = 10 + Math.random() * 80;
    for (let attempt = 0; attempt < 8; attempt++) {
      const clash = balloons.some((b) => Math.abs(b.x - x) < 10 && b.y < 25);
      if (!clash) break;
      x = 10 + Math.random() * 80;
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const speed =
      cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    // longer words a bit slower for fairness
    const lenFactor = Math.max(0.7, 1 - (word.length - 3) * 0.04);
    const finalSpeed = speed * lenFactor;

    const el = document.createElement("div");
    el.className = "balloon";
    el.style.left = `${x}%`;
    el.style.bottom = `-80px`;
    el.innerHTML = `
      <div class="body" style="background:${color.body};color:#fff">
        <span class="word-rest">${escapeHtml(word)}</span>
      </div>
      <div class="knot" style="border-top-color:${color.knot}"></div>
      <div class="string"></div>
    `;
    balloonsEl.appendChild(el);

    balloons.push({
      id: nextId++,
      word,
      x,
      y: -8, // percent of stage height (negative = below)
      speed: finalSpeed,
      color,
      el,
    });
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightBalloon(b) {
    const body = b.el.querySelector(".body");
    if (!body) return;
    const w = b.word;
    if (typed && w.startsWith(typed)) {
      body.innerHTML =
        `<span class="word-match">${escapeHtml(typed)}</span>` +
        `<span class="word-rest">${escapeHtml(w.slice(typed.length))}</span>`;
      b.el.style.zIndex = "4";
      b.el.style.filter = "brightness(1.08)";
    } else {
      body.innerHTML = `<span class="word-rest">${escapeHtml(w)}</span>`;
      b.el.style.zIndex = "";
      b.el.style.filter = "";
    }
  }

  function refreshHighlights() {
    for (const b of balloons) highlightBalloon(b);
  }

  function floatScore(xPct, yPct, pts) {
    const stageRect = stage.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "float-score";
    el.textContent = `+${pts}`;
    el.style.left = `${(xPct / 100) * stageRect.width}px`;
    // y is bottom-based percent → convert
    el.style.bottom = `${(yPct / 100) * stageRect.height + 40}px`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  function popBalloon(b) {
    const cfg = DIFFICULTY[difficulty];
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const mult = 1 + Math.min(combo - 1, 10) * 0.15;
    const pts = Math.round(cfg.scoreBase * mult * (1 + b.word.length * 0.08));
    score += pts;
    popped += 1;

    floatScore(b.x, b.y, pts);
    playPop();

    b.el.classList.add("popping");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 350);

    if (typed === b.word || b.word.startsWith(typed)) {
      // clear typed only if it was matching this balloon
      if (activeWord === b.word || typed === b.word) {
        typed = "";
        activeWord = null;
      }
    }
    // if remaining balloons don't match current typed, clear
    if (typed && !balloons.some((x) => x.word.startsWith(typed))) {
      typed = "";
      activeWord = null;
    }

    updateHud();
    refreshHighlights();
  }

  function loseLife(b) {
    lives -= 1;
    combo = 0;
    playMiss();
    b.el.classList.add("escape");
    balloons = balloons.filter((x) => x.id !== b.id);
    setTimeout(() => b.el.remove(), 400);

    if (typed && (activeWord === b.word || b.word.startsWith(typed))) {
      if (!balloons.some((x) => x.word.startsWith(typed))) {
        typed = "";
        activeWord = null;
      }
    }

    updateHud();
    if (lives <= 0) {
      endGame();
    }
  }

  // --- Game loop ---
  function loop(ts) {
    if (state !== "playing") return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const cfg = DIFFICULTY[difficulty];
    const stageH = stage.clientHeight || 400;

    // spawn
    spawnAcc += dt * 1000;
    // slight speed-up over time
    const ramp = Math.max(0.55, 1 - score / 5000);
    const spawnEvery = cfg.spawnMs * ramp;
    if (spawnAcc >= spawnEvery) {
      spawnAcc = 0;
      spawnBalloon();
    }

    // move balloons
    for (const b of [...balloons]) {
      b.y += (b.speed * dt * 100) / stageH; // percent per second approx
      b.el.style.bottom = `${b.y}%`;
      // slight sway
      const sway = Math.sin(ts / 500 + b.id) * 4;
      b.el.style.transform = `translateX(calc(-50% + ${sway}px))`;

      // escaped top (body center roughly past top)
      if (b.y > 100) {
        loseLife(b);
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  // --- Game control ---
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

  function startGame() {
    ensureAudio();
    const cfg = DIFFICULTY[difficulty];
    score = 0;
    combo = 0;
    maxCombo = 0;
    lives = cfg.lives;
    popped = 0;
    typed = "";
    activeWord = null;
    spawnAcc = cfg.spawnMs * 0.6;
    lastTs = 0;
    nextId = 1;
    clearBalloons();
    updateHud();
    hideOverlay();
    state = "playing";
    playStart();
    if (musicOn) startMusic();
    inputEl.focus();
    // seed a couple balloons
    spawnBalloon();
    setTimeout(() => {
      if (state === "playing") spawnBalloon();
    }, 400);
    rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    if (state !== "playing" && state !== "paused") return;
    state = "over";
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    playGameOver();
    // soft stop music volume or leave ambient
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE.best, String(best));
      bestEl.textContent = String(best);
    }
    updateHud();
    const diffLabel = DIFFICULTY[difficulty].label;
    const numLabel = includeNumbers ? "含数字" : "无数字";
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
    typed = "";
    activeWord = null;
    updateHud();
    showMenu(
      "已暂停",
      "可调整难度与数字选项，然后重新开始。",
      "继续 / 开始",
      null
    );
  }

  // --- Input ---
  function onType(ch) {
    if (state !== "playing") return;
    // only allow printable single chars we care about
    if (!/^[\w.]$/i.test(ch) && !/^[0-9]$/.test(ch)) {
      // also allow any single printable for flexibility
      if (ch.length !== 1 || ch === " ") return;
    }

    const next = typed + ch;
    const matches = balloons.filter((b) => b.word.startsWith(next));

    if (matches.length === 0) {
      // wrong key — if we had a target, reset combo lightly
      if (typed.length > 0) {
        // keep typed if still partial? no — clear on total miss
        typed = "";
        activeWord = null;
        combo = 0;
        playMiss();
        updateHud();
        refreshHighlights();
      } else {
        // try start fresh with this char
        const startMatches = balloons.filter((b) => b.word.startsWith(ch));
        if (startMatches.length === 0) {
          combo = 0;
          playMiss();
          updateHud();
          return;
        }
        typed = ch;
        activeWord = startMatches[0].word;
        playType();
      }
    } else {
      typed = next;
      // prefer lowest balloon (most urgent) among matches
      matches.sort((a, b) => b.y - a.y);
      activeWord = matches[0].word;
      playType();

      // complete?
      const exact = matches.find((b) => b.word === typed);
      if (exact) {
        popBalloon(exact);
        return;
      }
    }

    updateHud();
    refreshHighlights();
  }

  function onBackspace() {
    if (state !== "playing") return;
    if (!typed) return;
    typed = typed.slice(0, -1);
    if (!typed) activeWord = null;
    else {
      const m = balloons.filter((b) => b.word.startsWith(typed));
      activeWord = m.length ? m[0].word : null;
    }
    updateHud();
    refreshHighlights();
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
      playType();
    }
  });

  startBtn.addEventListener("click", () => {
    startGame();
  });

  stage.addEventListener("click", () => {
    if (state === "playing") inputEl.focus();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (state === "playing") {
        pauseToMenu();
      } else if (state === "menu" || state === "over") {
        // already in menu
      }
      return;
    }

    if (e.key === "Enter" && (state === "menu" || state === "over")) {
      e.preventDefault();
      startGame();
      return;
    }

    if (e.key === "Backspace") {
      if (state === "playing") {
        e.preventDefault();
        onBackspace();
      }
      return;
    }

    if (state !== "playing") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;

    e.preventDefault();
    onType(e.key);
  });

  inputEl.addEventListener("input", () => {
    const v = inputEl.value;
    if (!v) return;
    const ch = v[v.length - 1];
    inputEl.value = "";
    onType(ch);
  });

  // init
  bestEl.textContent = String(best);
  syncSettingsUI();
  syncAudioButtons();
  spawnClouds();
  updateHud();
  showMenu(
    "🎈 气球打字",
    "气球从下方升起，打出上面的文字即可炸掉它们。别让气球飞出顶部！",
    "开始游戏",
    null
  );
})();
