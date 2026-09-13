/* ==========================================================================
   MINIJUEGO: QUIZ (PLACEHOLDER - FASE 1)
   Implementa la interface común de minijuegos.
   En FASE 1 no tiene lógica real, solo muestra un contenedor bonito y
   permite simular el fin de la partida para comprobar el flujo completo.
   ========================================================================== */
(function () {
  'use strict';

  const QuizGame = {

    id: 'quiz',
    name: 'Quiz Desafío',
    icon: '🧠',
    description: 'Responde preguntas y gana puntos',

    configDefaults: {
      questionCount: 10,
      timeLimit: 30,
      lives: 3,
      difficulty: 'normal'
    },

    /* ------------ Estado interno ------------ */
    _container: null,
    _config: null,
    _onEnded: null,
    _cleanupFns: [],

    /* ------------ Ciclo de vida ------------ */

    init(container, config) {
      this._container = container;
      this._config = Object.assign({}, this.configDefaults, config || {});
      this._onEnded = config && config.onEnded ? config.onEnded : null;

      this._renderPlaceholder();
    },

    start() {
      // En FASE 1 no hay lógica de partida. Solo mostramos placeholder.
    },

    restart() {
      if (this._container) {
        this._renderPlaceholder();
      }
    },

    pause()  { /* No-op FASE 1 */ },
    resume() { /* No-op FASE 1 */ },

    end(partialResult) {
      const result = Object.assign({
        score: 0,
        hits: 0,
        total: this._config.questionCount,
        maxStreak: 0,
        timeSpentSecs: 0,
        won: true
      }, partialResult || {});

      this._cleanup();

      if (typeof this._onEnded === 'function') {
        this._onEnded(result);
      }
      return Promise.resolve(result);
    },

    destroy() {
      this._cleanup();
      if (this._container) {
        this._container.innerHTML = '';
      }
      this._container = null;
      this._onEnded = null;
    },

    getState() {
      return {
        phase: 'placeholder',
        config: this._config
      };
    },

    getInstructions() {
      return {
        title: '¿Cómo se juega?',
        steps: [
          { icon: '📖', text: 'Lee la pregunta atentamente' },
          { icon: '✅',  text: 'Elige una de las 4 opciones' },
          { icon: '⏱️',  text: '¡Date prisa! Bonus por tiempo' }
        ],
        tips: [
          '3 respuestas malas = pierdes',
          '¡No te rindas! Cada acierto suma puntos'
        ]
      };
    },

    /* ------------ Helpers internos ------------ */

    _cleanup() {
      // Quitar listeners, timers, etc.
      while (this._cleanupFns.length) {
        const fn = this._cleanupFns.pop();
        try { fn(); } catch (_) { /* ignore */ }
      }
    },

    _renderPlaceholder() {
      if (!this._container) return;
      this._cleanup();

      this._container.innerHTML = `
        <div class="quiz-placeholder">
          <div class="quiz-placeholder__tag">FASE 1 - Placeholder</div>
          <div class="quiz-placeholder__icon">🧠</div>
          <h2 class="quiz-placeholder__title">Quiz Desafío</h2>
          <p class="quiz-placeholder__desc">
            Aquí aparecerán las preguntas del juego.<br>
            La lógica completa del minijuego se implementará en FASE 3.
          </p>

          <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin-top:16px;">
            <button class="btn btn--primary" id="quizSimulateEnd">
              ✨ Simular fin de partida
            </button>
          </div>
        </div>
      `;

      const btn = this._container.querySelector('#quizSimulateEnd');
      if (btn) {
        const handler = () => {
          this.end({
            score: 1250,
            hits: 9,
            total: this._config.questionCount,
            maxStreak: 5,
            timeSpentSecs: 142,
            won: true
          });
        };
        btn.addEventListener('click', handler);
        this._cleanupFns.push(() => btn.removeEventListener('click', handler));
      }
    }
  };

  /* ------- Exponer globalmente para que GameRegistry lo registre ------- */
  window.GAMES = window.GAMES || {};
  window.GAMES.quiz = QuizGame;

})();
