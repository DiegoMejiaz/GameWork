/* ==========================================================================
   STORAGE + HIGH SCORES (FASE 2)
   ------------------------------------------------------------------
   Storage:    wrapper SEGURO sobre localStorage con try/catch y JSON válido.
   HighScores: puntuaciones separadas POR minijuego.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'je_'; // juego_educativo

  /* ====================================================================
     1. STORAGE
     -----------------------------------------------
     API:
       Storage.save(key, value)             guarda cualquier serializable
       Storage.load(key, defaultVal)         valor o defaultVal si no existe/corrupto
       Storage.remove(key)
       Storage.clearAll()
     ==================================================================== */
  const Storage = (function () {

    function _fullKey(k) {
      return STORAGE_PREFIX + String(k);
    }

    function save(k, v) {
      try {
        const fullKey = _fullKey(k);
        localStorage.setItem(fullKey, JSON.stringify(v));
        return true;
      } catch (err) {
        console.warn('[Storage] No se pudo guardar', k, err.message || err);
        return false;
      }
    }

    function load(k, defaultVal) {
      try {
        const fullKey = _fullKey(k);
        const raw = localStorage.getItem(fullKey);
        if (raw == null) {
          return defaultVal;
        }
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (err) {
        console.warn('[Storage] Error cargar ' + k + ' corrupto. Usando default. Error:', err.message || err);
        return defaultVal;
      }
    }

    function remove(k) {
      try {
        localStorage.removeItem(_fullKey(k));
        return true;
      } catch (err) {
        return false;
      }
    }

    function clearAll() {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(STORAGE_PREFIX) === 0) {
            keys.push(k);
          }
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
        return true;
      } catch (err) {
        return false;
      }
    }

    return {
      save: save,
      load: load,
      remove: remove,
      clearAll: clearAll
    };
  })();

  /* ====================================================================
     2. HIGHSCORES
     -----------------------------------------------
     Almacenamos array de objetos: [{name, score, date, hits, streak, stars}]
     Clave por minijuego: 'highscores:{gameId}'

     API:
       HighScores.save(gameId, entry)       guarda + ordena + mantiene top 10
       HighScores.list(gameId, limit)       array top N ordenado descendente
       HighScores.best(gameId)              mejor puntuación o null
       HighScores.bestBy(gameId, name)      mejor puntuación de un jugador
     ==================================================================== */
  const HighScores = (function () {

    function _key(gameId) {
      return 'highscores:' + String(gameId);
    }

    function _ensureArray(arr) {
      return Array.isArray(arr) ? arr : [];
    }

    function list(gameId, limit) {
      const raw = Storage.load(_key(gameId), []);
      let arr = _ensureArray(raw);
      arr.sort(function (a, b) {
        return (b.score || 0) - (a.score || 0);
      });
      if (Number.isFinite(limit) && limit > 0) {
        arr = arr.slice(0, limit);
      }
      return arr;
    }

    function save(gameId, entry) {
      if (!entry || typeof entry !== 'object') return false;
      if (!Number.isFinite(entry.score) || entry.score < 0) return false;

      const cleanEntry = {
        name: String(entry.name || 'Anónimo').slice(0, 20),
        score: Math.floor(entry.score),
        date: Number.isFinite(entry.date) ? entry.date : Date.now(),
        stars: Number.isFinite(entry.stars) ? Math.min(3, Math.max(0, entry.stars)) : 0,
        hits: Number.isFinite(entry.hits) ? entry.hits : 0,
        total: Number.isFinite(entry.total) ? entry.total : 0,
        streak: Number.isFinite(entry.streak) ? entry.streak : 0
      };

      const arr = _ensureArray(Storage.load(_key(gameId), []));
      arr.push(cleanEntry);
      arr.sort(function (a, b) {
        return (b.score || 0) - (a.score || 0);
      });
      const top10 = arr.slice(0, 10);
      Storage.save(_key(gameId), top10);
      return cleanEntry;
    }

    function best(gameId) {
      const top = list(gameId, 1);
      return top.length > 0 ? top[0] : null;
    }

    function bestBy(gameId, name) {
      const arr = list(gameId);
      let top = null;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].name === name) {
          if (!top || arr[i].score > top.score) top = arr[i];
        }
      }
      return top;
    }

    return {
      save: save,
      list: list,
      best: best,
      bestBy: bestBy
    };
  })();

  /* ====================================================================
     EXPORTS
     ==================================================================== */
  window.Storage = Storage;
  window.HighScores = HighScores;

})();
