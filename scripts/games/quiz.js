/* ==========================================================================
   MINIJUEGO: QUIZ (REAL - FASE 3)
   ------------------------------------------------------------------
   Lógica real: 10 preguntas / 3 vidas / 30s por pregunta.
   Reutiliza: ScoreSystem, LivesSystem, TimerSystem (NO los reinventa).
   Banco de preguntas: window.QUIZ_QUESTIONS (20 matemáticas 4º).
   ========================================================================== */
(function () {
  'use strict';

  const T = (window.TEXTS && window.TEXTS.quiz) ? window.TEXTS.quiz : {};

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
    _unsubs: [],

    _state: {
      questionIds: [],
      index: 0,
      stats: {
        score: 0,
        hits: 0,
        total: 0,
        maxStreak: 0,
        timeSpentSecs: 0
      },
      locked: false,
      currentCorrect: null,
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
      // El jugador pulsa "Comenzar" desde la intro.
      // Este método se deja por compatibilidad interface (init -> start desde App).
      // En esta fase 3 la intro renderiza su propio botón que llama a _startMatch().
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
      const total = Math.max(stats.total, this._config.questionCount);

      const result = Object.assign({
        score: Math.max(stats.score, sysScore),
        hits: stats.hits,
        total: total,
        maxStreak: Math.max(stats.maxStreak, sysStreak),
        timeSpentSecs: stats.timeSpentSecs,
        won: !noVidas && stats.total >= this._config.questionCount
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
        phase: 'quiz-real-fase3',
        config: this._config,
        stats: this._state.stats,
        index: this._state.index,
        locked: this._state.locked
      };
    },

    getInstructions() {
      const rules = (T.intro && Array.isArray(T.intro.rules)) ? T.intro.rules : [];
      return {
        title: (T.intro && T.intro.title) ? T.intro.title : '¿Cómo se juega?',
        steps: rules.map(function (text) { return { icon: '📘', text: text }; }),
        tips: [
          'Responde rápido para más puntos',
          '¡3 aciertos seguidos dan más puntos!'
        ]
      };
    },

    /* ------------ Helpers internos ------------ */

    _resetAllState() {
      this._state = {
        questionIds: [],
        index: 0,
        stats: { score: 0, hits: 0, total: 0, maxStreak: 0, timeSpentSecs: 0 },
        locked: false,
        currentCorrect: null,
        transitionTimer: null
      };

      // Resetea HUD/systems antes de la intro (limpio)
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

    /* ------------ Fases UI ------------ */

    _renderIntro() {
      const self = this;
      const c = this._container;
      if (!c) return;

      const intro = (T.intro) ? T.intro : {};
      const rules = Array.isArray(intro.rules) ? intro.rules : [];

      c.innerHTML = `
        <div class="quiz-intro">
          <div class="quiz-intro__icon" aria-hidden="true">🧠</div>
          <h2 class="quiz-intro__title">${intro.title || 'Quiz Desafío'}</h2>
          <p class="quiz-intro__desc">
            ${intro.desc || 'Responde 10 preguntas y consigue puntos.'}
          </p>

          <ul class="quiz-rules">
            ${rules.map(function (r) { return '<li>📘 ' + r + '</li>'; }).join('')}
          </ul>

          <button class="btn btn--primary btn--lg quiz-intro__start" type="button">
            ${intro.btnStart || '¡Comenzar!'}
          </button>
        </div>
      `;

      const startBtn = c.querySelector('.quiz-intro__start');
      function onStart() { self._startMatch(); }
      startBtn.addEventListener('click', onStart);
      this._cleanupFns.push(function () { startBtn.removeEventListener('click', onStart); });
    },

    _startMatch() {
      this._resetAllState();

      // Preparar 10 preguntas aleatorias SIN repetir
      const pool = Array.isArray(window.QUIZ_QUESTIONS) ? window.QUIZ_QUESTIONS.slice() : [];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      const needed = this._config.questionCount || 10;
      this._state.questionIds = pool.slice(0, Math.min(needed, pool.length)).map(function (q) { return q.id; });

      // Subscripciones temporales a onComplete del Timer (tiempo agotado por pregunta)
      if (window.TimerSystem) {
        const self = this;
        const unsub = TimerSystem.onComplete(function () {
          if (!self._state.locked) self._handleTimeout();
        });
        this._unsubs.push(unsub);
      }
      if (window.LivesSystem) {
        const self = this;
        const unsub = LivesSystem.onEmpty(function () {
          if (!self._state.locked) {
            self._state.locked = true;
            // Dar margen para que se pinte el feedback antes de terminar
            self._state.transitionTimer = setTimeout(function () {
              self.end({ won: false });
            }, 1200);
          }
        });
        this._unsubs.push(unsub);
      }

      this._state.index = 0;
      this._renderQuestion();
    },

    _renderQuestion() {
      if (!this._container) return;
      this._state.locked = false;

      const qId = this._state.questionIds[this._state.index];
      const q = (window.QUIZ_QUESTIONS || []).find(function (qq) { return qq.id === qId; });
      if (!q) {
        this.end();
        return;
      }
      this._state.currentCorrect = q.correctIndex;

      const total = this._state.questionIds.length;
      const progressText = (T.progress)
        ? T.progress.replace('{current}', this._state.index + 1).replace('{total}', total)
        : ((this._state.index + 1) + ' / ' + total);

      const streakNow = window.ScoreSystem ? ScoreSystem.getStreak() : 0;
      const streakBadge = (streakNow >= 3 && T.streamBadge)
        ? T.streamBadge.replace('{n}', streakNow)
        : '';

      this._container.innerHTML = `
        <div class="quiz-wrap">
          <div class="quiz-meta">
            <div class="quiz-meta__progress">${progressText}</div>
            ${streakBadge ? '<div class="quiz-meta__streak">' + streakBadge + '</div>' : ''}
          </div>

          <div class="quiz-question">
            <div class="quiz-question__cat" aria-hidden="true">${q.category || ''}</div>
            <h2 class="quiz-question__text">${q.question}</h2>
          </div>

          <div class="quiz-options" role="list">
            ${q.options.map(function (opt, i) {
              return `
                <button class="btn quiz-option" type="button" role="listitem" data-opt="${i}">
                  <span class="quiz-option__key" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
                  <span class="quiz-option__text">${opt}</span>
                </button>
              `;
            }).join('')}
          </div>

          <div class="quiz-feedback" aria-live="polite"></div>
        </div>
      `;

      // Bind opciones
      const self = this;
      const opts = this._container.querySelectorAll('[data-opt]');
      function handler(e) {
        if (self._state.locked) return;
        const idx = parseInt(e.currentTarget.getAttribute('data-opt'), 10);
        if (!Number.isFinite(idx)) return;
        self._handleAnswer(idx, e.currentTarget);
      }
      opts.forEach(function (el) {
        el.addEventListener('click', handler);
        self._cleanupFns.push(function () { el.removeEventListener('click', handler); });
      });

      // Iniciar timer de la pregunta
      if (window.TimerSystem) TimerSystem.start(this._config.timeLimit || 30);

      this._updateStreakBadge();
    },

    _handleAnswer(chosenIdx, btnEl) {
      if (this._state.locked) return;
      this._state.locked = true;

      const timeRemaining = window.TimerSystem ? TimerSystem.getRemaining() : 0;
      if (window.TimerSystem) TimerSystem.pause();

      const correctIdx = this._state.currentCorrect;
      const correct = (chosenIdx === correctIdx);

      // Estilos de feedback
      const allOpts = this._container.querySelectorAll('[data-opt]');
      allOpts.forEach(function (el, i) {
        el.classList.add('is-disabled');
        el.setAttribute('aria-disabled', 'true');
        if (i === correctIdx) el.classList.add('is-correct');
        else if (i === chosenIdx && !correct) el.classList.add('is-incorrect');
      });

      // Lógica puntos/racha/vidas
      this._state.stats.total += 1;
      if (correct) this._applyCorrect(timeRemaining);
      else this._applyIncorrect(false);

      this._paintFeedback(correct, chosenIdx);
      this._advanceSoon();
    },

    _handleTimeout() {
      if (this._state.locked) return;
      this._state.locked = true;

      const correctIdx = this._state.currentCorrect;
      const allOpts = this._container.querySelectorAll('[data-opt]');
      allOpts.forEach(function (el, i) {
        el.classList.add('is-disabled');
        el.setAttribute('aria-disabled', 'true');
        if (i === correctIdx) el.classList.add('is-correct');
      });

      this._state.stats.total += 1;
      this._applyIncorrect(true);
      this._paintFeedback(false, null, true);
      this._advanceSoon();
    },

    _applyCorrect(remainingSecs) {
      const stats = this._state.stats;
      stats.hits += 1;
      let added = 100;

      if (window.ScoreSystem) {
        ScoreSystem.addStreakSuccess();
        // Bonus de rapidez (3 tramos sencillos):
        //   >=20s -> +60; 10-19 -> +30; <10 -> +5
        let timeBonus = 5;
        if (remainingSecs >= 20) timeBonus = 60;
        else if (remainingSecs >= 10) timeBonus = 30;
        added = ScoreSystem.add(100, { timeBonus: timeBonus }) || added;

        stats.maxStreak = Math.max(stats.maxStreak, ScoreSystem.getStreak());
        stats.score = ScoreSystem.getScore();
      } else {
        stats.score += 100;
      }

      stats.timeSpentSecs += Math.max(0, (this._config.timeLimit || 30) - remainingSecs);

      // FASE 6B-1: guardar puntos reales para el feedback
      this._state._lastAddedPoints = Number.isFinite(added) ? added : 100;
      this._state._lastTimeBonus  = Number.isFinite(remainingSecs)
        ? (remainingSecs >= 20 ? 60 : (remainingSecs >= 10 ? 30 : 5))
        : 0;
      this._state._lastMultiplier = window.ScoreSystem ? ScoreSystem.getMultiplier() : 1.0;

      // FASE 6A: sonido respuesta correcta
      if (window.AudioSystem) {
        try { AudioSystem.play('correct'); } catch (_) {}
      }

      this._updateStreakBadge();
    },

    _applyIncorrect(isTimeout) {
      if (window.ScoreSystem) ScoreSystem.resetStreak();
      if (window.LivesSystem) LivesSystem.lose();
      // tiempo gastado ~= timeLimit completo (timeout) o algo
      this._state.stats.timeSpentSecs += Math.floor((this._config.timeLimit || 30) * 0.5);

      // FASE 6A: sonido respuesta incorrecta (o timeout)
      if (window.AudioSystem) {
        try { AudioSystem.play('incorrect'); } catch (_) {}
      }

      this._updateStreakBadge();
    },

    _paintFeedback(correct, chosenIdx, timeout) {
      const wrap = this._container.querySelector('.quiz-feedback');
      if (!wrap) return;
      const fb = T.feedback || {};
      if (correct) {
        const added = Number.isFinite(this._state._lastAddedPoints)
          ? this._state._lastAddedPoints
          : 100;
        const bonus = this._state._lastTimeBonus || 0;
        const mult = this._state._lastMultiplier || 1.0;
        const ptsText = (fb.correct && fb.correct.pointsLabel)
          ? fb.correct.pointsLabel.replace('{pts}', String(added))
          : ('+' + added + ' puntos');
        const showBreakdown = bonus > 0 || mult > 1.0;
        let breakdownHtml = '';
        if (showBreakdown) {
          const parts = [];
          parts.push('Base 100');
          if (bonus > 0)   parts.push('⏱️ +' + bonus);
          if (mult > 1.0)  parts.push('🔥 ×' + (String(Math.round(mult * 100) / 100)).replace('.00','').replace('.0',''));
          breakdownHtml = ' <span class="quiz-fb__pts-break">(' + parts.join(' · ') + ')</span>';
        }
        wrap.innerHTML = '';
        const fbCard = document.createElement('div');
        fbCard.className = 'quiz-fb quiz-fb--correct';
        const titleEl = document.createElement('div');
        titleEl.className = 'quiz-fb__title';
        titleEl.textContent = fb.correct ? (fb.correct.title || '✨ Correcto') : '✨ Correcto';
        const ptsEl = document.createElement('div');
        ptsEl.className = 'quiz-fb__points quiz-fb__points--pop';
        ptsEl.textContent = ptsText;
        if (breakdownHtml) {
          const brk = document.createElement('span');
          brk.className = 'quiz-fb__breakdown';
          brk.innerHTML = breakdownHtml;
          ptsEl.appendChild(document.createTextNode(' '));
          ptsEl.appendChild(brk);
        }
        const btnNext = document.createElement('button');
        btnNext.className = 'btn btn--primary quiz-fb__next';
        btnNext.type = 'button';
        btnNext.textContent = T.btnNext || 'Siguiente →';
        fbCard.appendChild(titleEl);
        fbCard.appendChild(ptsEl);
        fbCard.appendChild(btnNext);
        wrap.appendChild(fbCard);
      } else if (timeout) {
        wrap.innerHTML = '';
        const fbCard = document.createElement('div');
        fbCard.className = 'quiz-fb quiz-fb--timeout';
        const titleEl = document.createElement('div');
        titleEl.className = 'quiz-fb__title';
        titleEl.textContent = fb.timeout ? (fb.timeout.title || '⏰ Tiempo') : '⏰ Tiempo';
        const metaEl = document.createElement('div');
        metaEl.className = 'quiz-fb__meta';
        const lbl = document.createElement('span');
        lbl.textContent = fb.timeout ? (fb.timeout.correctWas || 'La correcta era:') : 'La correcta era:';
        const ans = document.createElement('strong');
        ans.className = 'quiz-fb__answer';
        ans.textContent = this._currentCorrectOptionText();
        metaEl.appendChild(lbl);
        metaEl.appendChild(document.createTextNode(' '));
        metaEl.appendChild(ans);
        const btnNext = document.createElement('button');
        btnNext.className = 'btn btn--primary quiz-fb__next';
        btnNext.type = 'button';
        btnNext.textContent = T.btnNext || 'Siguiente →';
        fbCard.appendChild(titleEl);
        fbCard.appendChild(metaEl);
        fbCard.appendChild(btnNext);
        wrap.appendChild(fbCard);
      } else {
        wrap.innerHTML = '';
        const fbCard = document.createElement('div');
        fbCard.className = 'quiz-fb quiz-fb--incorrect';
        const titleEl = document.createElement('div');
        titleEl.className = 'quiz-fb__title';
        titleEl.textContent = fb.incorrect ? (fb.incorrect.title || '❌ Casi') : '❌ Casi';
        const metaEl = document.createElement('div');
        metaEl.className = 'quiz-fb__meta';
        const lbl = document.createElement('span');
        lbl.textContent = fb.incorrect ? (fb.incorrect.correctWas || 'La correcta era:') : 'La correcta era:';
        const ans = document.createElement('strong');
        ans.className = 'quiz-fb__answer';
        ans.textContent = this._currentCorrectOptionText();
        metaEl.appendChild(lbl);
        metaEl.appendChild(document.createTextNode(' '));
        metaEl.appendChild(ans);
        const btnNext = document.createElement('button');
        btnNext.className = 'btn btn--primary quiz-fb__next';
        btnNext.type = 'button';
        btnNext.textContent = T.btnNext || 'Siguiente →';
        fbCard.appendChild(titleEl);
        fbCard.appendChild(metaEl);
        fbCard.appendChild(btnNext);
        wrap.appendChild(fbCard);
      }

      const nextBtn = wrap.querySelector('.quiz-fb__next');
      const self = this;
      function next() { self._advanceNow(); }
      nextBtn.addEventListener('click', next);
      this._cleanupFns.push(function () { nextBtn.removeEventListener('click', next); });
    },

    _currentCorrectOptionText() {
      const qId = this._state.questionIds[this._state.index];
      const q = (window.QUIZ_QUESTIONS || []).find(function (qq) { return qq.id === qId; });
      if (!q || !q.options || !q.options[q.correctIndex]) return '';
      return q.options[q.correctIndex];
    },

    _updateStreakBadge() {
      if (!this._container) return;
      const badge = this._container.querySelector('.quiz-meta__streak');
      const meta = this._container.querySelector('.quiz-meta');
      if (!meta) return;
      const streak = window.ScoreSystem ? ScoreSystem.getStreak() : 0;
      const ruleText = (window.TEXTS && window.TEXTS.quiz && window.TEXTS.quiz.streamBadge)
        ? window.TEXTS.quiz.streamBadge.replace('{n}', streak)
        : ('🔥 Racha x' + streak);
      if (streak >= 3) {
        let el = badge;
        let isNew = false;
        if (!el) {
          el = document.createElement('div');
          el.className = 'quiz-meta__streak';
          meta.appendChild(el);
          isNew = true;
        }
        el.textContent = ruleText;
        if (streak >= 5) el.setAttribute('data-level', '5');
        else             el.setAttribute('data-level', '3');
        if (isNew) {
          el.classList.add('quiz-meta__streak--pop');
        }
      } else if (badge) {
        badge.remove();
      }
    },

    _advanceSoon() {
      // Avance automático suave 1.6s después, a menos que el jugador pulse "Siguiente" antes
      const self = this;
      this._state.transitionTimer = setTimeout(function () {
        self._advanceNow();
      }, 1600);
    },

    _advanceNow() {
      if (this._state.transitionTimer) {
        clearTimeout(this._state.transitionTimer);
        this._state.transitionTimer = null;
      }

      // Si ya terminó por vidas (LivesSystem.onEmpty agendó end()), no forzar
      if (window.LivesSystem && LivesSystem.isEmpty()) return;

      this._state.index += 1;

      // ¿Terminaron las preguntas?
      if (this._state.index >= this._state.questionIds.length) {
        this.end({ won: true });
        return;
      }

      // Si no: siguiente pregunta
      this._renderQuestion();
    }
  };

  /* ------- Exponer globalmente para que GameRegistry lo registre ------- */
  window.GAMES = window.GAMES || {};
  window.GAMES.quiz = QuizGame;

})();
