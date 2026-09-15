/* ==========================================================================
   JUEGO EDUCATIVO - main.js (FASE 2)
   --------------------------------------------------------------------
   Núcleo de la aplicación.
   Novedades FASE 2:
     • State usa Storage para persistir nombre del jugador
     • HUD real conectado a ScoreSystem / LivesSystem / TimerSystem
     • Settings real: cambiar nombre y guardar
     • High Scores real (tabla dinámica + estado vacío)
     • ShowResults guarda la puntuación en HighScores
   ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Atajo: los systems están en window.ScoreSystem/LivesSystem/TimerSystem
  // cargados por systems.js antes que este archivo.
  // Storage + HighScores cargados por storage.js.
  // ---------------------------------------------------------------------

  /* ====================================================================
     1. STATE (estado simple, sin librerías)
     ==================================================================== */
  const State = {
    _data: {
      playerName: '',
      currentScreen: 'welcome',
      currentGameId: null,
      currentGameInstance: null,
      settings: {
        muted: false
      }
    },

    get(key) {
      return key ? this._data[key] : Object.assign({}, this._data);
    },

    set(key, value) {
      if (typeof key === 'object') {
        Object.assign(this._data, key);
        return;
      }
      this._data[key] = value;
    }
  };

  /* ====================================================================
     2. SCREEN MANAGER
     ==================================================================== */
  const ScreenManager = {
    _screens: null,
    _beforeShow: {},

    init() {
      this._screens = document.querySelectorAll('[data-screen]');
    },

    /**
     * Registrar callback que se ejecuta ANTES de mostrar una pantalla.
     * Útil para cargar datos dinámicos (High Scores table, settings name)
     */
    onBeforeShow(screenId, cb) {
      if (!this._beforeShow[screenId]) this._beforeShow[screenId] = [];
      this._beforeShow[screenId].push(cb);
    },

    show(screenId) {
      if (!this._screens) this.init();

      if (this._beforeShow[screenId]) {
        this._beforeShow[screenId].forEach(function (cb) {
          try { cb(); } catch (err) { console.warn('beforeShow error', err); }
        });
      }

      let found = false;
      this._screens.forEach(function (screen) {
        const id = screen.getAttribute('data-screen');
        if (id === screenId) {
          screen.hidden = false;
          found = true;
        } else {
          screen.hidden = true;
        }
      });

      if (found) {
        State.set('currentScreen', screenId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.warn('[ScreenManager] Pantalla no encontrada:', screenId);
      }
    }
  };

  /* ====================================================================
     3. GAME REGISTRY
     ==================================================================== */
  const GameRegistry = {
    _games: new Map(),

    register(gameObject) {
      if (!gameObject || !gameObject.id) {
        console.error('[GameRegistry] Juego inválido (falta id):', gameObject);
        return;
      }
      if (!gameObject.init || typeof gameObject.init !== 'function') {
        console.error(
          '[GameRegistry] El juego', gameObject.id,
          'no implementa el método init()'
        );
        return;
      }
      this._games.set(gameObject.id, gameObject);
    },

    get(gameId) {
      return this._games.get(gameId) || null;
    },

    listAll() {
      return Array.from(this._games.values());
    }
  };

  /* ====================================================================
     4. HUD (barra superior del juego)
     --------------------------------------------------------------
     Conectado a ScoreSystem.onChange, LivesSystem.onChange, TimerSystem.onTick
     ==================================================================== */
  const HUD = {
    init() {
      if (window.ScoreSystem) {
        const self = this;
        ScoreSystem.onChange(function (score, streak) {
          HUD._updateScore(score, streak, self._prevScore);
          self._prevScore = Number.isFinite(score) ? score : (self._prevScore || 0);
        });
      }
      if (window.LivesSystem) {
        const self = this;
        LivesSystem.onChange(function (lives, max) {
          HUD._updateLives(lives, max, self._prevLives);
          self._prevLives = Number.isFinite(lives) ? lives : (self._prevLives || 0);
        });
      }
      if (window.TimerSystem) {
        TimerSystem.onTick(function (secs) {
          HUD._updateTimer(secs);
        });
        TimerSystem.onComplete(function () {
          HUD._updateTimer(0);
        });
      }
    },

    _updateScore(score, streak, prevScore) {
      const el = document.getElementById('hudScore');
      if (!el) return;
      let txt = score + ' puntos';
      if (Number.isFinite(streak) && streak >= 3) txt += ' 🔥x' + streak;
      // 6B-2: ACTUALIZACIÓN INMEDIATA (sin retardo artificial) como pediste
      el.textContent = txt;
      // Streak class HUD
      if (!Number.isFinite(streak) || streak < 3) {
        el.removeAttribute('data-streak');
      } else if (streak >= 5) {
        el.setAttribute('data-streak', '5+');
      } else {
        el.setAttribute('data-streak', '3');
      }
      // Micro pop score SOLO si aumentó (no muestra pop en reset)
      const wasUp = Number.isFinite(prevScore) && score > prevScore;
      if (wasUp) {
        el.classList.remove('hud-score--up');
        // Force reflow para re-trigger si clase puesta en pregunta anterior
        void el.offsetWidth;
        el.classList.add('hud-score--up');
        // Limpieza (300ms = duración animación)
        window.clearTimeout(this._scoreUpT);
        const hself = this;
        this._scoreUpT = window.setTimeout(function () {
          el.classList.remove('hud-score--up');
        }, 310);
      }
    },

    _updateLives(lives, max, prevLives) {
      const el = document.getElementById('hudLives');
      if (!el) return;
      const full = Math.max(0, Math.min(lives, max || 3));
      const empty = Math.max(0, (max || 3) - full);
      el.textContent = '💚'.repeat(full) + '🖤'.repeat(empty);
      el.setAttribute('title', 'Vidas: ' + full + ' / ' + max);
      // 6B-3: Pérdida vida (diferencia < prevLives conocido)
      const wasLost = Number.isFinite(prevLives) && lives < prevLives;
      if (wasLost) {
        el.classList.remove('hud-lives--lost');
        void el.offsetWidth;
        el.classList.add('hud-lives--lost');
        window.clearTimeout(this._livesLostT);
        const hself = this;
        this._livesLostT = window.setTimeout(function () {
          el.classList.remove('hud-lives--lost');
        }, 250);
      }
    },

    _updateTimer(secs) {
      const el = document.getElementById('hudTimer');
      if (!el) return;
      const s = Math.max(0, Math.floor(secs));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      el.textContent = '⏱️ ' + mm + ':' + ss;
      // 6B-3: data-warning → pulso CSS si <= 10 (hacemos el umbral menos agresivo que antes <=5)
      if (s <= 10 && s > 0) el.dataset.warning = 'true';
      else el.removeAttribute('data-warning');
    },

    reset() {
      this._prevScore = 0;
      this._prevLives = Number.isFinite(window.LivesSystem && LivesSystem.getMax) ? LivesSystem.getMax() : 3;
      if (window.ScoreSystem) ScoreSystem.reset();
      if (window.LivesSystem) LivesSystem.set(3);
      if (window.TimerSystem) TimerSystem.reset();
      // Limpiar timers animaciones HUD (riesgo de timers huérfanos)
      window.clearTimeout(this._scoreUpT);
      window.clearTimeout(this._livesLostT);
    }
  };

  /* ====================================================================
     5. APP (orquestador)
     ==================================================================== */
  const App = {

    /* ---------------- Inicialización general ---------------- */
    init() {
      ScreenManager.init();
      HUD.init();
      this._registerGames();
      this._loadSavedPlayerName();
      this._setupWelcomeScreen();
      this._setupMenuScreen();
      this._setupSelectorScreen();
      this._setupGameScreen();
      this._setupResultsScreen();
      this._setupHighScoresScreen();
      this._setupSettingsScreen();

      // FASE 6A: inicializar sistema audio (autoplay requiere gesto humano primero)
      // FASE 6B-5: Botones pressed state global delegado 90ms
      // (fuera de if(AudioSystem) para que funcione siempre, incluso con audio OFF)
      const self6b = this;
      function _applyPressed(btn) {
        if (!btn) return;
        btn.classList.remove('is-pressed');
        void btn.offsetWidth;
        btn.classList.add('is-pressed');
        window.clearTimeout(self6b._btnPressT);
        self6b._btnPressT = window.setTimeout(function () {
          btn.classList.remove('is-pressed');
        }, 92);
      }
      document.body.addEventListener('pointerdown', function (ev) {
        const btn = ev.target && ev.target.closest ? ev.target.closest('.btn') : null;
        if (!btn) return;
        if (btn.classList && btn.classList.contains('quiz-option')) return; // opciones ya tienen animación propia correctPop/shake
        _applyPressed(btn);
      }, { passive: true });
      // Pressed por teclado (Enter / Space) — accesibilidad
      document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const t = ev.target;
        if (!t) return;
        const isBtn = t.classList && t.classList.contains && t.classList.contains('btn');
        if (!isBtn) return;
        if (ev.repeat) return;
        if (t.classList && t.classList.contains('quiz-option')) return;
        _applyPressed(t);
      }, true);

      if (window.AudioSystem) {
        AudioSystem.bootstrap();
        // Delegado click global: reproducir 'click' cuando se pulse cualquier botón
        // Excluye type=submit dentro de <form> para no reproducir click doble
        // con submit-handler que ya dispara otros sonidos (welcome, settings save).
        document.body.addEventListener('click', function (ev) {
          if (!window.AudioSystem || !AudioSystem.isEnabled()) return;
          const btn = ev.target && ev.target.closest ? ev.target.closest('.btn') : null;
          if (!btn) return;
          if (btn.tagName === 'BUTTON' && btn.type === 'submit' && btn.closest('form')) return;
          // Excluir opciones del quiz (ya reproducen correct/incorrect propios)
          if (btn.classList.contains('quiz-option')) return;
          // Excluir botón "Siguiente" del feedback (ya sonó correct/incorrect hace poco)
          if (btn.classList && btn.classList.contains('quiz-fb__next')) return;
          AudioSystem.play('click');
        });

        // Suscribirse a vidas para detectar pérdidas
        if (window.LivesSystem) {
          let _lastLives = null;
          LivesSystem.onChange(function (lives, max) {
            try {
              if (_lastLives == null) { _lastLives = lives; return; }
              if (lives < _lastLives) {
                AudioSystem.play('lifeLost');
              }
              _lastLives = lives;
            } catch (_) { _lastLives = lives; }
          });
        }
      }

      ScreenManager.show('welcome');
    },

    /* ---------------- Registro de minijuegos ---------------- */
    _registerGames() {
      const games = Object.values(window.GAMES || {});
      games.forEach(function (game) {
        if (game && game.id && typeof game.init === 'function') {
          GameRegistry.register(game);
        }
      });
    },

    /* ---------------- Carga nombre guardado ---------------- */
    _loadSavedPlayerName() {
      if (!window.Storage) return;
      const saved = Storage.load('player_name', '');
      if (saved && typeof saved === 'string' && saved.trim()) {
        App.setPlayerName(saved);
        // Si ya hay nombre guardado, saltar welcome e ir a menú
        const input = document.getElementById('playerName');
        if (input) input.value = saved;
        setTimeout(function () { ScreenManager.show('menu'); }, 50);
      }
    },

    /* ================================================================
       PANTALLA 1: WELCOME (nombre del jugador)
       ================================================================ */
    _setupWelcomeScreen() {
      const form = document.getElementById('nameForm');
      const input = document.getElementById('playerName');

      if (form && input) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const name = (input.value || '').trim();
          if (!name) {
            input.focus();
            return;
          }
          App.setPlayerName(name);
          App._savePlayerName(name);
          ScreenManager.show('menu');
        });
      }
    },

    setPlayerName(name) {
      const cleanName = String(name || '').trim().slice(0, 20);
      State.set('playerName', cleanName);
      const menuTitle = document.getElementById('menuTitle');
      const chipName  = document.getElementById('playerChipName');
      if (menuTitle && cleanName) menuTitle.textContent = '¡Hola, ' + cleanName + '!';
      if (chipName)  chipName.textContent = cleanName || 'Jugador';
      // Rellenar también el input de ajustes, si existe
      const settingsInput = document.getElementById('settingsName');
      if (settingsInput) settingsInput.value = cleanName;
    },

    _savePlayerName(name) {
      if (window.Storage) Storage.save('player_name', name);
    },

    /* ---------- FASE 5C: ESTADÍSTICAS LOCALES PERSISTENTES ---------- */
    _statsKey: 'player_stats',

    _statsDefaults() {
      return {
        totalGames: 0,
        totalHits: 0,
        bestStreak: 0,
        bestStars: 0
      };
    },

    _sanitizeStats(raw) {
      const d = this._statsDefaults();
      if (!raw || typeof raw !== 'object') return d;
      const safe = function (v, min) {
        const n = Number(v);
        if (!Number.isFinite(n)) return min;
        return Math.max(min, Math.floor(n));
      };
      return {
        totalGames: safe(raw.totalGames, 0),
        totalHits:  safe(raw.totalHits,  0),
        bestStreak: safe(raw.bestStreak, 0),
        bestStars:  safe(raw.bestStars, 0)
      };
    },

    loadStats() {
      const defaults = this._statsDefaults();
      if (!window.Storage) return defaults;
      const raw = Storage.load(this._statsKey, null);
      return this._sanitizeStats(raw === null ? defaults : raw);
    },

    _saveStats(stats) {
      if (!window.Storage) return;
      Storage.save(this._statsKey, this._sanitizeStats(stats));
    },

    _recordGameStats(result) {
      if (!result || typeof result !== 'object') return;
      const before = this.loadStats();
      const hits     = Math.max(0, Math.floor(Number(result.hits)        || 0));
      const streak   = Math.max(0, Math.floor(Number(result.maxStreak)   || 0));
      const stars    = Math.max(0, Math.min(3, Math.floor(Number(result.stars) || 0)));

      const next = {
        totalGames: before.totalGames + 1,
        totalHits:  before.totalHits  + hits,
        bestStreak: Math.max(before.bestStreak, streak),
        bestStars:  Math.max(before.bestStars,  stars)
      };
      this._saveStats(next);
      return next;
    },

    _renderStatsSettings() {
      const stats = this.loadStats();
      const s = {
        games: document.getElementById('statGamesPlayed'),
        hits:  document.getElementById('statTotalHits'),
        str:   document.getElementById('statBestStreak'),
        st:    document.getElementById('statBestStars')
      };
      if (s.games) s.games.textContent = String(stats.totalGames);
      if (s.hits)  s.hits.textContent  = String(stats.totalHits);
      if (s.str)   s.str.textContent   = String(stats.bestStreak);
      if (s.st)    s.st.textContent    = String(stats.bestStars);
    },

    /* ================================================================
       PANTALLA 2: MENÚ PRINCIPAL
       ================================================================ */
    _setupMenuScreen() {
      document.querySelectorAll('[data-action]').forEach(function (el) {
        el.addEventListener('click', function () {
          App._handleAction(el.getAttribute('data-action'));
        });
      });

      const editBtn = document.getElementById('editNameBtn');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          ScreenManager.show('settings');
          App._renderStatsSettings();
        });
      }
    },

    /* ================================================================
       PANTALLA 3: SELECTOR DE MINIJUEGOS
       ================================================================ */
    _setupSelectorScreen() {
      this._renderGamesGrid();
    },

    _renderGamesGrid() {
      const grid = document.getElementById('gamesGrid');
      if (!grid) return;
      grid.innerHTML = '';

      const games = GameRegistry.listAll();
      if (games.length === 0) {
        grid.innerHTML = '<p class="text-center" style="color:#888;padding:40px;">No hay minijuegos registrados.</p>';
        return;
      }

      games.forEach(function (game) {
        const card = document.createElement('article');
        card.className = 'game-card';

        card.innerHTML = `
          <div class="game-card__header">
            <div class="game-card__icon" aria-hidden="true">${game.icon || '🎮'}</div>
          </div>
          <div class="game-card__body">
            <h3 class="game-card__name">${game.name || game.id}</h3>
            <p class="game-card__desc">${game.description || ''}</p>
          </div>
          <div class="game-card__footer">
            <button
              class="btn btn--primary btn--lg game-card__play"
              data-game-id="${game.id}"
              type="button"
            >
              ¡Jugar!
            </button>
          </div>
        `;

        const playBtn = card.querySelector('[data-game-id]');
        if (playBtn) {
          playBtn.addEventListener('click', function () { App.startGame(game.id); });
        }

        grid.appendChild(card);
      });
    },

    /* ================================================================
       PANTALLA 4: JUEGO (contenedor + HUD)
       ================================================================ */
    _setupGameScreen() {
      // El botón salir ya tiene data-action="exit-game"
    },

    startGame(gameId) {
      const gameDef = GameRegistry.get(gameId);
      if (!gameDef) {
        console.error('[App] No existe el juego con id:', gameId);
        return;
      }

      const container = document.getElementById('gameContainer');
      if (!container) return;

      // Resetear HUD / systems antes de empezar
      HUD.reset();

      // Limpiar juego previo
      if (State.get('currentGameInstance')) {
        try { State.get('currentGameInstance').destroy(); } catch (_) {}
        State.set('currentGameInstance', null);
      }

      const instance = Object.create(gameDef);

      State.set({
        currentGameId: gameId,
        currentGameInstance: instance,
        _statsRecordedThisGame: false
      });

      instance.init(container, {
        playerName: State.get('playerName'),
        onEnded: function (result) { App._onGameEnded(result); }
      });

      instance.start();
      ScreenManager.show('game');
    },

    _onGameEnded(result) {
      App.showResults(result);
    },

    /* ================================================================
       PANTALLA 5: RESULTADOS (guarda high score)
       ================================================================ */
    _setupResultsScreen() {
      // Los botones con data-action ya se manejan en _handleAction
    },

    showResults(result) {
      const data = Object.assign({
        score: 0,
        hits: 0,
        total: 0,
        maxStreak: 0,
        timeSpentSecs: 0,
        won: true,
        stars: null
      }, result || {});

      const gameId = State.get('currentGameId') || 'quiz';
      const playerName = State.get('playerName') || 'Anónimo';

      // Cálculo de estrellas
      const ratio = data.total > 0 ? data.hits / data.total : 0;
      let stars = 0;
      if (ratio >= 0.9) stars = 3;
      else if (ratio >= 0.7) stars = 2;
      else if (ratio >= 0.5) stars = 1;
      if (Number.isFinite(data.stars) && data.stars >= 0 && data.stars <= 3) {
        stars = data.stars;
      }

      // FASE 5C: actualizar estadísticas persistentes (SOLO UNA VEZ por partida)
      if (State.get('_statsRecordedThisGame') !== true) {
        this._recordGameStats({
          hits:      data.hits,
          maxStreak: data.maxStreak,
          stars:     stars
        });
        State.set('_statsRecordedThisGame', true);
      }

      // Guardar en HighScores
      let previousBest = 0;
      if (window.HighScores) {
        const prevEntry = HighScores.best(gameId);
        previousBest = prevEntry ? (prevEntry.score || 0) : 0;
        HighScores.save(gameId, {
          name: playerName,
          score: data.score || 0,
          stars: stars,
          hits: data.hits || 0,
          total: data.total || 0,
          streak: data.maxStreak || 0
        });
      }
      const newBest = Math.max(previousBest, data.score || 0);
      const isRecord = (data.score || 0) > previousBest && (data.score || 0) > 0;

      const elScore = document.getElementById('statScore');
      const elHits  = document.getElementById('statHits');
      const elBest  = document.getElementById('statBest');
      const elStars = document.getElementById('resultsStars');
      const elSubtitle = document.getElementById('resultsSubtitle');
      const elStatsUl = document.getElementById('resultsStats');

      if (elScore) {
        elScore.classList.remove('results-stats__val--in');
        elScore.textContent = data.score;
        void elScore.offsetWidth;
        elScore.classList.add('results-stats__val--in');
      }
      if (elHits) {
        elHits.classList.remove('results-stats__val--in');
        elHits.textContent  = (data.hits || 0) + ' / ' + (data.total || 0);
        void elHits.offsetWidth;
        elHits.classList.add('results-stats__val--in');
      }
      if (elBest) {
        elBest.classList.remove('is-record');
        elBest.classList.remove('results-stats__val--in');
        if (isRecord) {
          elBest.textContent = newBest + '  ¡Récord!';
          elBest.classList.add('is-record');
        } else {
          elBest.textContent = String(newBest);
        }
        void elBest.offsetWidth;
        elBest.classList.add('results-stats__val--in');
      }
      if (elSubtitle && isRecord) {
        elSubtitle.textContent = '¡Nuevo récord, ' + (playerName || 'campeón') + '! 🎉';
      } else if (elSubtitle && data.won) {
        elSubtitle.textContent = '¡Buen trabajo, ' + (playerName || 'campeón') + '!';
      }

      if (elStars) {
        const spans = elStars.querySelectorAll('span.results-stars__star');
        spans.forEach(function (sp, i) {
          const pos = i + 1;
          const filled = pos <= stars;
          sp.classList.remove('is-filled', 'is-empty');
          sp.classList.add(filled ? 'is-filled' : 'is-empty');
          sp.textContent = filled ? '⭐' : '☆';
        });
        // Force reflow para activar stagger pop en stars is-filled y clase UL stats entries
        void elStars.offsetWidth;
        spans.forEach(function (sp, i) {
          const pos = i + 1;
          const filled = pos <= stars;
          sp.classList.remove('is-staggered');
          if (filled) sp.classList.add('is-staggered');
        });
      }
      // Stagger UL stats para que entren 2º (después de estrellas)
      if (elStatsUl) {
        elStatsUl.classList.remove('results-stats--in');
        void elStatsUl.offsetWidth;
        elStatsUl.classList.add('results-stats--in');
      }

      // FASE 6A: reproducir sonidos finales (antes de mostrar pantalla)
      if (window.AudioSystem && AudioSystem.isEnabled()) {
        if (data.won === true) {
          AudioSystem.play('win');
          if (isRecord) {
            // Récord = fanfarria especial (no reproducir win dos veces; encimamos 'record' al final)
            setTimeout(function () { AudioSystem.play('record'); }, 680);
          }
        } else if (isRecord) {
          AudioSystem.play('record');
        }
      }

      ScreenManager.show('results');
    },

    /* ================================================================
       PANTALLA 6: HIGH SCORES (real - tabla dinámica)
       ================================================================ */
    _setupHighScoresScreen() {
      const T = (window.TEXTS && TEXTS.highscores) || {};
      document.getElementById('hsTitle').textContent = T.title || '🏆 Mejores Puntuaciones';
      document.getElementById('hsEmptyTitle').textContent = T.emptyTitle || '¡Todavía no hay récords!';
      document.getElementById('hsEmptyDesc').textContent  = T.emptyDesc  || 'Juega una partida y aparecerás aquí.';

      // Cargar datos justo ANTES de mostrar la pantalla
      const self = this;
      ScreenManager.onBeforeShow('highscores', function () {
        self._renderHighScores();
      });
    },

    _renderHighScores() {
      if (!window.HighScores) return;

      const games = GameRegistry.listAll();
      const emptyEl = document.getElementById('hsEmpty');
      const tableWrapEl = document.getElementById('hsTableWrap');
      const tableBody = document.getElementById('hsTableBody');
      const selectorEl = document.getElementById('hsGameSelector');
      const gameNameEl = document.getElementById('hsGameName');

      // ¿Seleccionamos qué juego ver?
      let activeGameId = State.get('_hsActiveGameId');
      if (!activeGameId && games.length > 0) activeGameId = games[0].id;

      // Si hay 2+ juegos → mostrar selector de pestañas
      if (selectorEl && games.length > 1) {
        selectorEl.innerHTML = '';
        selectorEl.hidden = false;
        games.forEach(function (g) {
          const b = document.createElement('button');
          b.className = 'btn ' + (g.id === activeGameId ? 'btn--primary' : 'btn--ghost btn--sm');
          b.type = 'button';
          b.textContent = (g.icon || '') + ' ' + (g.name || g.id);
          b.addEventListener('click', function () {
            State.set('_hsActiveGameId', g.id);
            App._renderHighScores();
          });
          selectorEl.appendChild(b);
        });
      } else if (selectorEl) {
        selectorEl.hidden = true;
      }

      if (gameNameEl) {
        const activeGame = games.find(function (g) { return g.id === activeGameId; });
        gameNameEl.textContent = activeGame
          ? (activeGame.icon || '') + ' ' + (activeGame.name || activeGame.id)
          : '';
      }

      const rows = activeGameId ? HighScores.list(activeGameId, 10) : [];

      if (rows.length === 0) {
        emptyEl.hidden = false;
        tableWrapEl.hidden = true;
        return;
      }

      emptyEl.hidden = true;
      tableWrapEl.hidden = false;

      if (!tableBody) return;
      tableBody.innerHTML = '';

      rows.forEach(function (row, idx) {
        const tr = document.createElement('tr');
        const pos = idx + 1;
        let badge;
        if (pos === 1) badge = '🥇';
        else if (pos === 2) badge = '🥈';
        else if (pos === 3) badge = '🥉';
        else badge = String(pos);

        const starsStr = (row.stars > 0)
          ? '⭐'.repeat(Math.min(row.stars, 3))
          : '—';

        const tdPos = document.createElement('td');
        tdPos.dataset.col = 'pos';
        tdPos.textContent = badge;
        tr.appendChild(tdPos);

        const tdName = document.createElement('td');
        tdName.dataset.col = 'name';
        tdName.textContent = String(row.name || 'Anónimo');
        tr.appendChild(tdName);

        const tdStars = document.createElement('td');
        tdStars.dataset.col = 'stars';
        tdStars.textContent = starsStr;
        tr.appendChild(tdStars);

        const tdScore = document.createElement('td');
        tdScore.dataset.col = 'score';
        tdScore.className = 'hs-score';
        const strongEl = document.createElement('strong');
        strongEl.textContent = String(row.score || 0);
        tdScore.appendChild(strongEl);
        tr.appendChild(tdScore);

        tableBody.appendChild(tr);
      });
    },

    /* ================================================================
       PANTALLA 7: AJUSTES (real - solo cambiar nombre por ahora)
       ================================================================ */
    _setupSettingsScreen() {
      const T = (window.TEXTS && TEXTS.settings) || {};
      document.getElementById('settingsTitle').textContent = T.title || '⚙️ Ajustes';
      const nameLabel = document.getElementById('settingsNameLabel');
      const nameInput = document.getElementById('settingsName');
      const saveBtn   = document.getElementById('settingsSaveBtn');
      const savedMsg  = document.getElementById('settingsSavedMsg');
      const audioToggle = document.getElementById('audioToggle');
      const audioPill  = audioToggle ? document.querySelector('label[for="audioToggle"].toggle-pill') : null;
      if (nameLabel && T.nameLabel) nameLabel.textContent = T.nameLabel;
      if (nameInput && T.namePlaceholder) nameInput.placeholder = T.namePlaceholder;
      if (saveBtn   && T.saveBtn)   saveBtn.textContent = T.saveBtn;
      if (savedMsg  && T.savedMsg)  savedMsg.textContent = T.savedMsg;

      // Pre-cargar valor actual antes de mostrar pantalla
      ScreenManager.onBeforeShow('settings', function () {
        if (nameInput) nameInput.value = State.get('playerName') || '';
        if (savedMsg)  savedMsg.hidden = true;
        App._renderStatsSettings();

        // FASE 6A: cargar preferencia audio al entrar Settings
        if (audioToggle) {
          const on = window.AudioSystem ? AudioSystem.isEnabled() : true;
          audioToggle.checked = on;
          if (audioPill) audioPill.setAttribute('aria-checked', on ? 'true' : 'false');
        }
      });

      // FASE 6A: toggle audio (cambio inmediato + persistencia Storage)
      if (audioToggle) {
        audioToggle.addEventListener('change', function () {
          const on = !!audioToggle.checked;
          if (window.AudioSystem) AudioSystem.setEnabled(on);
          if (audioPill) audioPill.setAttribute('aria-checked', on ? 'true' : 'false');
          // Probar audio de confirmación: 1 click-silencio (no suena si no está 1er gesto)
          if (on && window.AudioSystem) {
            try { window.AudioSystem.play('click'); } catch (_) {}
          }
        });
      }

      const form = document.getElementById('settingsForm');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const newName = (nameInput.value || '').trim();
          if (!newName) {
            nameInput.focus();
            return;
          }
          App.setPlayerName(newName);
          App._savePlayerName(newName);
          if (savedMsg) {
            savedMsg.hidden = false;
            setTimeout(function () { savedMsg.hidden = true; }, 2500);
          }
        });
      }

      const resetBtn = document.getElementById('resetDataBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          const ok = window.confirm(
            '¿Seguro/a que quieres borrar TODOS los datos guardados de esta aplicación?\n\n' +
            '· Se eliminará tu nombre\n' +
            '· Se eliminarán todas las Mejores Puntuaciones\n' +
            '· Esta acción no puede deshacerse'
          );
          if (!ok) return;

          if (window.Storage) Storage.clearAll();

          // FASE 6A: tras reset, preferencia audio = valor inicial true (por defecto)
          if (window.AudioSystem) {
            AudioSystem.setEnabled(true, { skipSave: true });
          }
          if (audioToggle) {
            audioToggle.checked = true;
            if (audioPill) audioPill.setAttribute('aria-checked', 'true');
          }

          State.set('playerName', '');
          State.set('_hsActiveGameId', null);
          App._cleanupCurrentGame();

          const welcomeInput = document.getElementById('playerName');
          if (welcomeInput) welcomeInput.value = '';

          const menuTitle = document.getElementById('menuTitle');
          const chipName  = document.getElementById('playerChipName');
          if (menuTitle) menuTitle.textContent = '';
          if (chipName)  chipName.textContent = 'Jugador';

          ScreenManager.show('welcome');
        });
      }
    },

    /* ================================================================
       HANDLER CENTRAL DE ACCIONES (data-action)
       ================================================================ */
    _handleAction(action) {
      switch (action) {
        case 'go-selector':
          App._renderGamesGrid();
          ScreenManager.show('selector');
          break;

        case 'go-highscores':
          ScreenManager.show('highscores');
          break;

        case 'go-settings':
          ScreenManager.show('settings');
          App._renderStatsSettings();
          break;

        case 'go-menu':
          App._cleanupCurrentGame();
          ScreenManager.show('menu');
          break;

        case 'exit-game': {
          const yes = window.confirm(
            '¿Estás seguro/a que quieres salir del juego?\nPerderás el progreso de la partida actual.'
          );
          if (!yes) return;
          App._cleanupCurrentGame();
          App._renderGamesGrid();
          ScreenManager.show('selector');
          break;
        }

        case 'restart-game': {
          const gameId = State.get('currentGameId');
          if (gameId) {
            App.startGame(gameId);
          } else {
            App._renderGamesGrid();
            ScreenManager.show('selector');
          }
          break;
        }

        default:
          console.log('[App] Acción no implementada:', action);
      }
    },

    _cleanupCurrentGame() {
      const inst = State.get('currentGameInstance');
      if (inst && typeof inst.destroy === 'function') {
        try { inst.destroy(); } catch (err) {
          console.warn('[App] Error al destruir el juego:', err);
        }
      }
      // FASE 7A-1: Resetear HUD para no conservar puntos/vidas/timer/racha del juego anterior
      if (window.HUD && typeof HUD.reset === 'function') {
        try { HUD.reset(); } catch (_) {}
      } else {
        // Fallback por si el orden de carga cambiara (no debería)
        if (window.ScoreSystem) try { ScoreSystem.reset(); } catch (_) {}
        if (window.LivesSystem) try { LivesSystem.set(3); } catch (_) {}
        if (window.TimerSystem) try { TimerSystem.reset(); } catch (_) {}
      }
      // Parar timer y systems para evitar que sigan corriendo en segundo plano
      if (window.TimerSystem) try { TimerSystem.reset(); } catch (_) {}
      State.set({
        currentGameId: null,
        currentGameInstance: null,
        _statsRecordedThisGame: false
      });
    }
  };

  /* ====================================================================
     EXPORTS + AUTOSTART
     ==================================================================== */
  window.App          = App;
  window.State        = State;
  window.ScreenManager= ScreenManager;
  window.GameRegistry = GameRegistry;
  window.HUD          = HUD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { App.init(); });
  } else {
    App.init();
  }

})();
