/**
 * Cache-busted asset loader for GitHub Pages + iPad Safari.
 *
 * Why this exists:
 * - GH Pages sets Cache-Control: max-age=600 on files
 * - iPad Safari keeps JS/CSS/audio aggressively
 * - Hardcoded ?v=20260808g still goes stale when HTML is cached
 *
 * Strategy:
 * 1) Unregister service workers + wipe Cache Storage
 * 2) Fetch version.json with a unique query every load (CDN miss)
 * 3) Inject CSS/JS with ?v=<git-sha> from that file
 * 4) Expose window.__BUILD__ for audio URLs inside game.js
 */
(function () {
  var STATUS_ID = "boot-status";

  function ensureStatus() {
    var el = document.getElementById(STATUS_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = STATUS_ID;
    el.setAttribute(
      "style",
      "position:fixed;left:0;right:0;bottom:0;z-index:99999;" +
        "padding:8px 12px;font:12px/1.4 system-ui,sans-serif;" +
        "background:rgba(20,30,50,.92);color:#fff;text-align:center;"
    );
    document.body.appendChild(el);
    return el;
  }

  function setStatus(msg, isErr) {
    var el = ensureStatus();
    el.textContent = msg;
    el.style.background = isErr ? "rgba(160,40,40,.95)" : "rgba(20,30,50,.92)";
  }

  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = function () {
        resolve();
      };
      link.onerror = function () {
        reject(new Error("CSS failed: " + href));
      };
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Script failed: " + src));
      };
      document.body.appendChild(s);
    });
  }

  function clearBrowserCaches() {
    var jobs = [];
    if ("serviceWorker" in navigator) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (r) {
              return r.unregister();
            })
          );
        })
      );
    }
    if (typeof caches !== "undefined" && caches.keys) {
      jobs.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.map(function (k) {
              return caches.delete(k);
            })
          );
        })
      );
    }
    return Promise.all(jobs).catch(function () {
      /* ignore */
    });
  }

  function applyBuildLabels(v, time) {
    window.__BUILD__ = v;
    window.__BUILD_TIME__ = time || "";
    var footer = document.getElementById("build-label");
    if (footer) footer.textContent = "build " + v;
    var ph = document.getElementById("ph-audio-status");
    if (ph && /build|录音|—/.test(ph.textContent || "—")) {
      ph.textContent = "录音引擎 · build " + v;
    }
    var boot = document.getElementById(STATUS_ID);
    if (boot) {
      // hide after success
      setTimeout(function () {
        if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
      }, 1200);
    }
  }

  function start() {
    setStatus("检查新版本…");
    return clearBrowserCaches()
      .then(function () {
        // Unique query every load → bypass browser + CDN edge cache
        var url = "version.json?_=" + Date.now() + "-" + Math.random().toString(36).slice(2);
        return fetch(url, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error("version.json HTTP " + res.status);
        return res.json();
      })
      .then(function (meta) {
        var v = (meta && meta.v) || String(Date.now());
        setStatus("加载资源 build " + v + " …");
        applyBuildLabels(v, meta && meta.time);
        var q = "?v=" + encodeURIComponent(v);
        return loadCss("style.css" + q).then(function () {
          // Sequential so game.js runs after words/phonics globals exist
          return loadScript("words.js" + q)
            .then(function () {
              return loadScript("phonics.js" + q);
            })
            .then(function () {
              return loadScript("game.js" + q);
            });
        });
      })
      .then(function () {
        setStatus("已加载最新版 " + (window.__BUILD__ || ""));
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          "更新失败，尝试直连… " + (err && err.message ? err.message : err),
          true
        );
        // Fallback without version.json
        var fb = String(Date.now());
        window.__BUILD__ = fb;
        var q = "?v=" + fb;
        return loadCss("style.css" + q)
          .then(function () {
            return loadScript("words.js" + q);
          })
          .then(function () {
            return loadScript("phonics.js" + q);
          })
          .then(function () {
            return loadScript("game.js" + q);
          })
          .then(function () {
            applyBuildLabels(fb, "");
            setStatus("已用应急版本加载");
          })
          .catch(function (e2) {
            setStatus("加载失败，请无痕打开或清 Safari 缓存", true);
            console.error(e2);
          });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
