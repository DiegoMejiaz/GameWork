/* ==========================================================================
   MINIJUEGO: MEMORY FRACCIONES (ESQUELETO - FASE 7B)
   ------------------------------------------------------------------
   Esqueleto estructural compatible con GameRegistry / App.
   NO implementa cartas, parejas, fracciones ni mecánica todavía (FASE 7C).
   Reutiliza: ScoreSystem, LivesSystem, TimerSystem (NO los reinventa).
   ========================================================================== */
(function () {
  'use strict';

  const T = (window.TEXTS && window.TEXTS.memory) ? window.TEXTS.memory : {};

  const MemoryGame = {

    id: 'memory',
    name: 'Memory Fracciones',
    icon: '🧩',
    description: 'Empareja fracciones equivalentes',

    configDefaults: {
      pairCount: 8,
      timeLimit: 180,
      lives: 3,
      difficulty: 'normal'
    },

    /* ------------ Estado interno ------------ */
    _container: null,
    _config: null,
    _onEnded: null,
    _cleanupFns: [],
    _unsubs: [],

    _state: {
      phase: 'intro',
      stats: {
        score: 0,
        hits: 0,
        total: 0,
        maxStreak: 0,
        timeSpentSecs: 0
      },
      locked: false,
      transitionTimer: null
    },

    /* ------------ Ciclo de vida ------------ */

    init(container, config) {
      this._container = container;
      this._config = Object.assign({}, this.configDefaults, config || {});
      this._onEnded = config && config.onEnded ? config.onEnded : null;
      this._resetAllState();
      this._renderIntro();
    },

    start() {
      // Compatibilidad interface init -> start (App).
      // Intro renderiza botón que llama a _startMatch() cuando esté implementada.
    },

    restart() {
      this._cleanupMatch();
      this._resetAllState();
      this._renderIntro();
    },

    pause() {
      if (window.TimerSystem) TimerSystem.pause();
    },

    resume() {
      if (window.TimerSystem) TimerSystem.resume();
    },

    end(partialResult) {
      this._cleanupMatch();

      const sysScore   = window.ScoreSystem   ? ScoreSystem.getScore()   : 0;
      const sysStreak  = window.ScoreSystem   ? ScoreSystem.getStreak()  : 0;
      const noVidas    = window.LivesSystem   ? LivesSystem.isEmpty()    : false;

      const stats = this._state.stats;
      const total = Math.max(stats.total, (this._config.pairCount || 0) * 2);

      const result = Object.assign({
        score: Math.max(stats.score, sysScore),
        hits: stats.hits,
        total: total,
        maxStreak: Math.max(stats.maxStreak, sysStreak),
        timeSpentSecs: stats.timeSpentSecs,
        won: !noVidas && stats.hits >= (this._config.pairCount || 0)
      }, partialResult || {});

      this._cleanup();

      if (typeof this._onEnded === 'function') {
        this._onEnded(result);
      }
      return Promise.resolve(result);
    },

    destroy() {
      this._cleanupMatch();
      this._cleanup();
      if (this._container) {
        this._container.innerHTML = '';
      }
      this._container = null;
      this._onEnded = null;
    },

    getState() {
      return {
        phase: 'memory-skeleton-fase7b',
        config: this._config,
        stats: this._state.stats,
        locked: this._state.locked
      };
    },

    getInstructions() {
      const rules = (T.intro && Array.isArray(T.intro.rules)) ? T.intro.rules : [
        'Encuentra las parejas de fracciones equivalentes',
        'Cada pareja acertada suma puntos',
        '¡Evita fallar para no perder vidas!'
      ];
      return {
        title: (T.intro && T.intro.title) ? T.intro.title : '¿Cómo se juega?',
        steps: rules.map(function (text) { return { icon: '🧩', text: text }; }),
        tips: [
          'Recuerda bien las cartas que volteas',
          'Rápido y preciso = más puntos'
        ]
      };
    },

    /* ------------ Helpers internos ------------ */

    _resetAllState() {
      this._state = {
        phase: 'intro',
        stats: { score: 0, hits: 0, total: 0, maxStreak: 0, timeSpentSecs: 0 },
        locked: false,
        transitionTimer: null
      };

      if (window.ScoreSystem) ScoreSystem.reset();
      if (window.LivesSystem) LivesSystem.set(this._config.lives || 3);
      if (window.TimerSystem) TimerSystem.reset();
    },

    _cleanup() {
      while (this._cleanupFns.length) {
        const fn = this._cleanupFns.pop();
        try { fn(); } catch (_) {}
      }
      while (this._unsubs.length) {
        const fn = this._unsubs.pop();
        try { fn(); } catch (_) {}
      }
    },

    _cleanupMatch() {
      if (this._state.transitionTimer) {
        clearTimeout(this._state.transitionTimer);
        this._state.transitionTimer = null;
      }
      if (window.TimerSystem) {
        try { TimerSystem.reset(); } catch (_) {}
      }
      this._state.locked = true;
    },

    /* ------------ Fases UI (ESQUELETO - SIN MECÁNICA) ------------ */

    _renderIntro() {
      const self = this;
      const c = this._container;
      if (!c) return;

      const intro = (T.intro) ? T.intro : {};
      const rules = Array.isArray(intro.rules) ? intro.rules : this.getInstructions().steps.map(s => s.text);

      c.innerHTML = `
        <div class="quiz-intro">
          <div class="quiz-intro__icon" aria-hidden="true">🧩</div>
          <h2 class="quiz-intro__title">${intro.title || 'Memory Fracciones'}</h2>
          <p class="quiz-intro__desc">
            ${intro.desc || 'Empareja fracciones equivalentes. Próximamente (FASE 7C).'}
          </p>

          <ul class="quiz-rules">
            ${rules.map(function (r) { return '<li>🧩 ' + r + '</li>'; }).join('')}
          </ul>

          <button class="btn btn--primary btn--lg quiz-intro__start" type="button" disabled aria-disabled="true">
            ${intro.btnStart || 'Próximamente'}
          </button>
          <p class="quiz-intro__desc" style="margin-top:16px; opacity:.7;">
            Esqueleto estructural · Mecánica en FASE 7C
          </p>
        </div>
      `;

      const startBtn = c.querySelector('.quiz-intro__start');
      function onStart() {
        // _startMatch() se implementará en FASE 7C.
        // Actualmente el botón está disabled para evitar clicks sin mecánica.
      }
      startBtn.addEventListener('click', onStart);
      this._cleanupFns.push(function () { startBtn.removeEventListener('click', onStart); });
    },

    _startMatch() {
      // MECÁNICA CARTAS / PAREJAS / FRACCIONES — IMPLEMENTAR EN FASE 7C.
      // Actualmente esqueleto no inicia partida; se deja método por coherencia interfaz.
      this._state.phase = 'waiting-7c';
    }

  };

  /* ----- Exponer globalmente para registro automático FASE 7A-2 ----- */
  window.GAMES = window.GAMES || {};
  window.GAMES.memory = MemoryGame;

})();
