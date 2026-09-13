/* ==========================================================================
   JUEGO EDUCATIVO - main.js (FASE 1)
   --------------------------------------------------------------------
   Núcleo de la aplicación. Todo en 1 archivo para simplicidad de FASE 1.
   Contiene:
     • State         → estado simple (nombre jugador, pantalla actual, juego activo)
     • ScreenManager → mostrar/ocultar pantallas por data-screen
     • GameRegistry  → registro de minijuegos (extendible a 3+ sin tocar core)
     • App           → inicialización, navegación, flujo: nombre → menú → selector → juego → resultados
   ========================================================================== */
(function () {
  'use strict';

  /* ====================================================================
     1. STATE (estado simple, sin librerías)
     --------------------------------------------------------------
     Solo los campos que realmente usamos en FASE 1.
     Añadiremos más cuando los necesitemos.
     ==================================================================== */
  const State = {
    _data: {
      playerName: '',
      currentScreen: 'welcome',
      currentGameId: null,
      currentGameInstance: null
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
     --------------------------------------------------------------
     Muestra la pantalla con data-screen === id y oculta las demás.
     ==================================================================== */
  const ScreenManager = {
    _screens: null,

    init() {
      this._screens = document.querySelectorAll('[data-screen]');
    },

    show(screenId) {
      if (!this._screens) this.init();
      let found = false;
      this._screens.forEach((screen) => {
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
     --------------------------------------------------------------
     Los minijuegos se registran aquí.
     Agregar un minijuego = crear su módulo + llamar register()
     NO hay que modificar este archivo por cada nuevo juego más allá
     de la llamada inicial.
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
     4. APP (orquestador)
     ==================================================================== */
  const App = {

    /* ---------------- Inicialización general ---------------- */
    init() {
      ScreenManager.init();
      this._registerGames();
      this._setupWelcomeScreen();
      this._setupMenuScreen();
      this._setupSelectorScreen();
      this._setupGameScreen();
      this._setupResultsScreen();
      ScreenManager.show('welcome');
    },

    /* ---------------- Registro de minijuegos ---------------- */
    _registerGames() {
      // Cada minijuego se cuelga en window.GAMES.{id}
      if (window.GAMES && window.GAMES.quiz) {
        GameRegistry.register(window.GAMES.quiz);
      }
    },

    /* ================================================================
       PANTALLA 1: WELCOME (nombre del jugador)
       ================================================================ */
    _setupWelcomeScreen() {
      const form = document.getElementById('nameForm');
      const input = document.getElementById('playerName');

      if (form && input) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = (input.value || '').trim();
          if (!name) {
            input.focus();
            return;
          }
          App.setPlayerName(name);
          ScreenManager.show('menu');
        });
      }
    },

    setPlayerName(name) {
      const cleanName = String(name || '').trim().slice(0, 20);
      State.set('playerName', cleanName);
      // Actualizar UI que muestre el nombre
      const menuTitle = document.getElementById('menuTitle');
      const chipName  = document.getElementById('playerChipName');
      if (menuTitle) menuTitle.textContent = '¡Hola, ' + cleanName + '!';
      if (chipName)  chipName.textContent = cleanName;
    },

    /* ================================================================
       PANTALLA 2: MENÚ PRINCIPAL
       ================================================================ */
    _setupMenuScreen() {
      // Botones tipo "menu-card" con data-action
      document.querySelectorAll('[data-action]').forEach((el) => {
        el.addEventListener('click', (e) => App._handleAction(e.currentTarget.getAttribute('data-action')));
      });

      // Botón lápiz de cambiar nombre (player chip)
      const editBtn = document.getElementById('editNameBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          const current = State.get('playerName');
          const newName = window.prompt(
            'Escribe tu nuevo nombre:',
            current
          );
          if (newName !== null && newName.trim()) {
            App.setPlayerName(newName.trim());
          }
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

      games.forEach((game) => {
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
          playBtn.addEventListener('click', () => App.startGame(game.id));
        }

        grid.appendChild(card);
      });
    },

    /* ================================================================
       PANTALLA 4: JUEGO (contenedor)
       ================================================================ */
    _setupGameScreen() {
      // El botón de salir ya tiene data-action="exit-game" en HTML,
      // lo captura _handleAction
    },

    startGame(gameId) {
      const gameDef = GameRegistry.get(gameId);
      if (!gameDef) {
        console.error('[App] No existe el juego con id:', gameId);
        return;
      }

      const container = document.getElementById('gameContainer');
      if (!container) return;

      // Si hay un juego activo, limpiarlo primero
      if (State.get('currentGameInstance')) {
        try { State.get('currentGameInstance').destroy(); } catch (_) {}
        State.set('currentGameInstance', null);
      }

      // Crear instancia clonando el gameDef para aislar estado
      const instance = Object.create(gameDef);

      State.set({
        currentGameId: gameId,
        currentGameInstance: instance
      });

      // Inicializar
      instance.init(container, {
        playerName: State.get('playerName'),
        onEnded: (result) => App._onGameEnded(result)
      });

      instance.start();
      ScreenManager.show('game');
    },

    _onGameEnded(result) {
      // Al terminar un juego → resultados
      App.showResults(result);
    },

    /* ================================================================
       PANTALLA 5: RESULTADOS
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
        won: true
      }, result || {});

      const elScore = document.getElementById('statScore');
      const elHits  = document.getElementById('statHits');
      const elBest  = document.getElementById('statBest');
      const elStars = document.getElementById('resultsStars');

      if (elScore) elScore.textContent = data.score;
      if (elHits)  elHits.textContent  = data.hits + ' / ' + data.total;

      // High score = el mismo por ahora (placeholder)
      const best = Math.max(data.score || 0, 0);
      if (elBest) elBest.textContent = best;

      if (elStars) {
        const ratio = data.total > 0 ? data.hits / data.total : 0;
        let stars = 0;
        if (ratio >= 0.9) stars = 3;
        else if (ratio >= 0.7) stars = 2;
        else if (ratio >= 0.5) stars = 1;

        elStars.textContent = stars > 0
          ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars)
          : '☆☆☆';
      }

      ScreenManager.show('results');
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
      State.set({
        currentGameId: null,
        currentGameInstance: null
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

  // Cuando el DOM esté listo, arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})();
