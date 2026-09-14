/* ==========================================================================
   SISTEMAS COMPARTIDOS MÍNIMOS (FASE 2)
   ScoreSystem, LivesSystem, TimerSystem
   ------------------------------------------------------------------
   - Sin EventBus complejo. Cada sistema expone callbacks (onChange / onEmpty)
     o el consumidor llama a los getters cuando lo necesite.
   - Simples. Sin sobreingeniería.
   ========================================================================== */
(function () {
  'use strict';

  /* ====================================================================
     1. SCORESYSTEM
     -----------------------------------------------
     API:
       ScoreSystem.reset()                         → pone a 0 todo
       ScoreSystem.add(basePoints, opts?)          → suma con bonus de racha/tiempo
       ScoreSystem.addStreakSuccess()              → +1 racha (acierto)
       ScoreSystem.resetStreak()                    → racha = 0 (fallo)
       ScoreSystem.getScore()                       → número actual
       ScoreSystem.getStreak()                      → racha actual
       ScoreSystem.getMultiplier()                 → 1.0, 1.25, 1.5 según racha
       ScoreSystem.onChange(cb(score, streak))     → callback cuando cambia
     ==================================================================== */
  const ScoreSystem = (function () {
    let _score = 0;
    let _streak = 0;
    let _listeners = [];

    function _emit() {
      const s = _score;
      const k = _streak;
      _listeners.forEach(function (cb) { try { cb(s, k); } catch (_) {} });
    }

    function reset() {
      _score = 0;
      _streak = 0;
      _emit();
    }

    function getScore()    { return _score; }
    function getStreak()   { return _streak; }

    function getMultiplier() {
      if (_streak >= 5) return 1.5;
      if (_streak >= 3) return 1.25;
      return 1.0;
    }

    function addStreakSuccess() {
      _streak++;
      _emit();
    }

    function resetStreak() {
      if (_streak !== 0) {
        _streak = 0;
        _emit();
      }
    }

    function add(basePoints, opts) {
      if (!Number.isFinite(basePoints) || basePoints <= 0) return;
      const options = opts || {};
      const multiplier = options.multiplier != null ? options.multiplier : getMultiplier();
      const timeBonus  = Number.isFinite(options.timeBonus) ? options.timeBonus : 0;
      const total = Math.round((basePoints * multiplier) + timeBonus);
      _score += total;
      _emit();
      return total;
    }

    function onChange(cb) {
      if (typeof cb !== 'function') return function () {};
      _listeners.push(cb);
      return function unsubscribe() {
        _listeners = _listeners.filter(function (fn) { return fn !== cb; });
      };
    }

    return {
      reset: reset,
      add: add,
      addStreakSuccess: addStreakSuccess,
      resetStreak: resetStreak,
      getScore: getScore,
      getStreak: getStreak,
      getMultiplier: getMultiplier,
      onChange: onChange
    };
  })();

  /* ====================================================================
     2. LIFESYSTEM
     -----------------------------------------------
     API:
       LivesSystem.set(n)                         → establece vidas iniciales
       LivesSystem.lose()                         → -1 vida; true si llegó a 0
       LivesSystem.gain()                         → +1 vida (sin tope por ahora)
       LivesSystem.get()                          → vidas actuales
       LivesSystem.getMax()                       → inicial (para mostrar en HUD)
       LivesSystem.isEmpty()                      → true si 0
       LivesSystem.onChange(cb(lives, max))       → callback cambios
       LivesSystem.onEmpty(cb)                    → callback cuando llega a 0
     ==================================================================== */
  const LivesSystem = (function () {
    let _lives = 3;
    let _max   = 3;
    let _changeListeners = [];
    let _emptyListeners  = [];
    let _lastWasEmpty = false;

    function _emitChange() {
      const l = _lives;
      const m = _max;
      _changeListeners.forEach(function (cb) { try { cb(l, m); } catch (_) {} });
      if (l <= 0 && !_lastWasEmpty) {
        _lastWasEmpty = true;
        _emptyListeners.forEach(function (cb) { try { cb(); } catch (_) {} });
      }
      if (l > 0) _lastWasEmpty = false;
    }

    function set(n) {
      if (!Number.isFinite(n) || n < 0) n = 3;
      _lives = Math.max(0, Math.floor(n));
      _max   = _lives || 1;
      _lastWasEmpty = _lives <= 0;
      _emitChange();
    }

    function lose() {
      if (_lives > 0) _lives--;
      _emitChange();
      return _lives <= 0;
    }

    function gain() {
      _lives++;
      if (_lives > _max) _max = _lives;
      _emitChange();
    }

    function get()     { return _lives; }
    function getMax()  { return _max; }
    function isEmpty() { return _lives <= 0; }

    function onChange(cb) {
      if (typeof cb !== 'function') return function () {};
      _changeListeners.push(cb);
      return function () {
        _changeListeners = _changeListeners.filter(function (fn) { return fn !== cb; });
      };
    }

    function onEmpty(cb) {
      if (typeof cb !== 'function') return function () {};
      _emptyListeners.push(cb);
      return function () {
        _emptyListeners = _emptyListeners.filter(function (fn) { return fn !== cb; });
      };
    }

    return {
      set: set,
      lose: lose,
      gain: gain,
      get: get,
      getMax: getMax,
      isEmpty: isEmpty,
      onChange: onChange,
      onEmpty: onEmpty
    };
  })();

  /* ====================================================================
     3. TIMERSYSTEM
     -----------------------------------------------
     Temporizador de cuenta regresiva simple (1 instancia única por ahora).
     API:
       TimerSystem.start(seconds, opts?)           → empieza cuenta atrás
       TimerSystem.pause()                          → pausa
       TimerSystem.resume()                         → reanuda
       TimerSystem.reset()                          → a 0, detiene
       TimerSystem.getRemaining()                   → segundos restantes
       TimerSystem.isRunning()                      → booleano
       TimerSystem.onTick(cb(secsRemaining))       → cada segundo
       TimerSystem.onComplete(cb)                   → al llegar a 0
     ==================================================================== */
  const TimerSystem = (function () {
    let _remaining = 0;
    let _total     = 0;
    let _intervalId = null;
    let _tickListeners    = [];
    let _completeListeners= [];

    function _emitTick() {
      const r = _remaining;
      _tickListeners.forEach(function (cb) { try { cb(r); } catch (_) {} });
    }

    function _emitComplete() {
      _completeListeners.forEach(function (cb) { try { cb(); } catch (_) {} });
    }

    function _stopInterval() {
      if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
    }

    function start(seconds, opts) {
      if (!Number.isFinite(seconds) || seconds <= 0) seconds = 30;
      const options = opts || {};
      _total     = Math.floor(seconds);
      _remaining = _total;
      _stopInterval();
      _emitTick();
      _intervalId = setInterval(function () {
        if (_remaining > 0) {
          _remaining--;
          _emitTick();
          if (_remaining <= 0) {
            _stopInterval();
            _emitComplete();
          }
        } else {
          _stopInterval();
        }
      }, 1000);
    }

    function pause() {
      _stopInterval();
    }

    function resume() {
      if (_remaining > 0 && _intervalId === null) {
        _emitTick();
        _intervalId = setInterval(function () {
          if (_remaining > 0) {
            _remaining--;
            _emitTick();
            if (_remaining <= 0) {
              _stopInterval();
              _emitComplete();
            }
          } else {
            _stopInterval();
          }
        }, 1000);
      }
    }

    function reset() {
      _stopInterval();
      _remaining = 0;
      _total     = 0;
      _emitTick();
    }

    function getRemaining() { return _remaining; }
    function getTotal()     { return _total; }
    function isRunning()    { return _intervalId !== null; }

    function onTick(cb) {
      if (typeof cb !== 'function') return function () {};
      _tickListeners.push(cb);
      return function () {
        _tickListeners = _tickListeners.filter(function (fn) { return fn !== cb; });
      };
    }

    function onComplete(cb) {
      if (typeof cb !== 'function') return function () {};
      _completeListeners.push(cb);
      return function () {
        _completeListeners = _completeListeners.filter(function (fn) { return fn !== cb; });
      };
    }

    return {
      start: start,
      pause: pause,
      resume: resume,
      reset: reset,
      getRemaining: getRemaining,
      getTotal: getTotal,
      isRunning: isRunning,
      onTick: onTick,
      onComplete: onComplete
    };
  })();

  /* ====================================================================
     EXPORTS
     ==================================================================== */
  window.ScoreSystem = ScoreSystem;
  window.LivesSystem = LivesSystem;
  window.TimerSystem = TimerSystem;

})();
