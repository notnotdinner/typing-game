(() => {
  const BEST_KEY = "typing-game.bestWpm";
  const MODE_KEY = "typing-game.mode";
  const LANG_KEY = "typing-game.lang";

  const promptEl = document.getElementById("prompt");
  const inputEl = document.getElementById("input");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const resultStats = document.getElementById("result-stats");
  const startBtn = document.getElementById("start-btn");
  const typedHint = document.getElementById("typed-hint");
  const wpmEl = document.getElementById("wpm");
  const accuracyEl = document.getElementById("accuracy");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const progressEl = document.getElementById("progress");
  const stage = document.querySelector(".stage");

  let mode = localStorage.getItem(MODE_KEY) || "60"; // 60 | 30 | 15 | quote
  let lang = localStorage.getItem(LANG_KEY) || "en";
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = String(best);

  let target = "";
  let index = 0;
  let correctCount = 0;
  let errorCount = 0;
  let startedAt = 0;
  let endsAt = 0;
  let timerId = null;
  let liveId = null;
  let state = "ready"; // ready | playing | done
  let charStates = []; // correct | incorrect | pending

  // --- helpers ---
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildText() {
    if (mode === "quote") {
      const q = window.QUOTES[Math.floor(Math.random() * window.QUOTES.length)];
      return q;
    }
    const bank = window.WORD_BANKS[lang] || window.WORD_BANKS.en;
    const words = shuffle(bank);
    // enough words for timed modes
    const need = mode === "15" ? 40 : mode === "30" ? 70 : 120;
    const picked = [];
    while (picked.length < need) {
      picked.push(...shuffle(words));
    }
    return picked.slice(0, need).join(" ");
  }

  function durationSec() {
    if (mode === "quote") return null;
    return Number(mode);
  }

  function elapsedSec() {
    if (!startedAt) return 0;
    return Math.max(0, (Date.now() - startedAt) / 1000);
  }

  function calcWpm() {
    const mins = elapsedSec() / 60;
    if (mins <= 0) return 0;
    // standard: correct chars / 5 / minutes
    return Math.round((correctCount / 5) / mins);
  }

  function calcAccuracy() {
    const total = correctCount + errorCount;
    if (total === 0) return 100;
    return Math.max(0, Math.round((correctCount / total) * 100));
  }

  function updateHud() {
    wpmEl.textContent = String(calcWpm());
    accuracyEl.textContent = `${calcAccuracy()}%`;

    const dur = durationSec();
    if (dur == null) {
      // quote: show remaining chars or elapsed
      const left = Math.max(0, target.length - index);
      timerEl.textContent = state === "playing" ? String(left) : String(target.length || "—");
      const pct = target.length ? (index / target.length) * 100 : 0;
      progressEl.style.width = `${pct}%`;
    } else {
      let left = dur;
      if (state === "playing") {
        left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      }
      timerEl.textContent = String(left);
      const pct = state === "playing" ? ((dur - left) / dur) * 100 : 0;
      progressEl.style.width = `${Math.min(100, pct)}%`;
    }
  }

  function renderPrompt() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < target.length; i++) {
      const span = document.createElement("span");
      span.className = "char";
      const ch = target[i];
      span.textContent = ch === " " ? "\u00a0" : ch;
      if (i === index && state === "playing") {
        span.classList.add("current");
      } else if (charStates[i] === "correct") {
        span.classList.add("correct");
      } else if (charStates[i] === "incorrect") {
        span.classList.add("incorrect");
      } else {
        span.classList.add("pending");
      }
      frag.appendChild(span);
    }
    promptEl.replaceChildren(frag);
  }

  function setOverlay(show, title, msg, btnText, stats) {
    if (show) {
      overlay.classList.remove("hidden");
      overlayTitle.textContent = title;
      overlayMsg.innerHTML = msg;
      startBtn.textContent = btnText;
      if (stats) {
        resultStats.classList.remove("hidden");
        resultStats.innerHTML = `
          <div class="box"><span class="k">WPM</span><span class="v">${stats.wpm}</span></div>
          <div class="box"><span class="k">准确率</span><span class="v">${stats.acc}%</span></div>
          <div class="box"><span class="k">正确/错误</span><span class="v">${stats.ok}/${stats.err}</span></div>
        `;
      } else {
        resultStats.classList.add("hidden");
        resultStats.innerHTML = "";
      }
    } else {
      overlay.classList.add("hidden");
    }
  }

  function stopClocks() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (liveId) {
      clearInterval(liveId);
      liveId = null;
    }
  }

  function finish() {
    if (state !== "playing") return;
    state = "done";
    stopClocks();
    const wpm = calcWpm();
    const acc = calcAccuracy();
    if (wpm > best && correctCount >= 10) {
      best = wpm;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = String(best);
    }
    updateHud();
    renderPrompt();
    setOverlay(
      true,
      "本局结束",
      "按 <kbd>Tab</kbd> 或点按钮再来一局",
      "再来一局",
      { wpm, acc, ok: correctCount, err: errorCount }
    );
    inputEl.blur();
  }

  function prepare(keepOverlay = true) {
    stopClocks();
    state = "ready";
    target = buildText();
    index = 0;
    correctCount = 0;
    errorCount = 0;
    startedAt = 0;
    endsAt = 0;
    charStates = Array(target.length).fill("pending");
    inputEl.value = "";
    typedHint.classList.remove("hidden");
    typedHint.textContent = "点击此处或开始输入…";
    updateHud();
    renderPrompt();
    if (keepOverlay) {
      const modeLabel =
        mode === "quote" ? "短文模式" : `${mode} 秒限时`;
      setOverlay(
        true,
        "准备开始",
        `${modeLabel} · 词库 <strong>${lang}</strong><br/>接上键盘直接打字，或点「开始」`,
        "开始挑战",
        null
      );
    }
  }

  function startRun() {
    if (state === "playing") return;
    if (state === "done" || !target) prepare(false);
    state = "playing";
    startedAt = Date.now();
    const dur = durationSec();
    if (dur != null) {
      endsAt = startedAt + dur * 1000;
      timerId = setTimeout(finish, dur * 1000);
    }
    liveId = setInterval(updateHud, 200);
    setOverlay(false);
    typedHint.classList.add("hidden");
    updateHud();
    renderPrompt();
    inputEl.focus();
  }

  function onChar(ch) {
    if (state === "ready") startRun();
    if (state !== "playing") return;
    if (index >= target.length) return;

    const expected = target[index];
    if (ch === expected) {
      charStates[index] = "correct";
      correctCount += 1;
    } else {
      charStates[index] = "incorrect";
      errorCount += 1;
    }
    index += 1;
    updateHud();
    renderPrompt();

    if (mode === "quote" && index >= target.length) {
      finish();
    }
  }

  function onBackspace() {
    if (state !== "playing") return;
    if (index <= 0) return;
    index -= 1;
    // undo last classification
    if (charStates[index] === "correct") correctCount = Math.max(0, correctCount - 1);
    if (charStates[index] === "incorrect") errorCount = Math.max(0, errorCount - 1);
    charStates[index] = "pending";
    updateHud();
    renderPrompt();
  }

  // --- UI bindings ---
  function syncModeButtons() {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  }

  function syncLangButtons() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      localStorage.setItem(MODE_KEY, mode);
      syncModeButtons();
      prepare(true);
    });
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      lang = btn.dataset.lang;
      localStorage.setItem(LANG_KEY, lang);
      syncLangButtons();
      prepare(true);
    });
  });

  startBtn.addEventListener("click", () => {
    if (state === "done") prepare(false);
    startRun();
  });

  stage.addEventListener("click", () => {
    if (state === "done") return;
    if (state === "ready") {
      startRun();
    } else {
      inputEl.focus();
    }
  });

  // Prefer raw keydown so we don't depend on IME composition for English/code
  window.addEventListener("keydown", (e) => {
    // Tab = restart
    if (e.key === "Tab") {
      e.preventDefault();
      prepare(false);
      startRun();
      return;
    }
    // Esc = reset to ready
    if (e.key === "Escape") {
      e.preventDefault();
      prepare(true);
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      onBackspace();
      return;
    }

    // ignore modifiers / function keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Shift" || e.key === "CapsLock" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
    if (e.key.length !== 1) return;

    e.preventDefault();
    onChar(e.key);
  });

  // also focus input for mobile soft keyboard if ever needed
  inputEl.addEventListener("input", () => {
    const v = inputEl.value;
    if (!v) return;
    const ch = v[v.length - 1];
    inputEl.value = "";
    onChar(ch);
  });

  // init
  syncModeButtons();
  syncLangButtons();
  prepare(true);
})();
