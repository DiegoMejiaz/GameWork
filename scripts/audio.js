/* ==========================================================================
   SISTEMA DE AUDIO CENTRALIZADO (FASE 6A)
   ------------------------------------------------------------------
   - 100% OFFLINE. Web Audio API sintético.
   - Sin archivos de audio externos ni CDN.
   - Apropiado para niños 9-10 años: tonos suaves sine/triangle, cortos, 0 distorsión.
   - Protegido contra política autoplay Chrome: requiere 1 gesto humano (click/touch/key).
   - Persistencia: audioEnabled se guarda vía Storage existente.
   ========================================================================== */
(function () {
  'use strict';

  const AudioCtx = (typeof window !== 'undefined')
    ? (window.AudioContext || window.webkitAudioContext || null)
    : null;

  const STORAGE_KEY = 'audio_enabled';
  const DEFAULT_ENABLED = true;

  const _state = {
    ctx: null,
    master: null,
    enabled: DEFAULT_ENABLED,
    bootstrapped: false,
    _storageReady: (typeof window !== 'undefined' && !!window.Storage)
  };

  /* ---------- Configuración master ---------- */
  function _ensureCtx() {
    if (!AudioCtx) return null;
    if (_state.ctx) return _state.ctx;
    try {
      _state.ctx = new AudioCtx();
      _state.master = _state.ctx.createGain();
      _state.master.gain.value = 0.58;   // volumen general: audible pero seguro (sin clipping)
      _state.master.connect(_state.ctx.destination);
      return _state.ctx;
    } catch (err) {
      console.warn('[AudioSystem] Web Audio no disponible:', err.message || err);
      _state.ctx = null;
      return null;
    }
  }

  /* ---------- Helpers notas (Hz, equal temperament A4=440) ---------- */
  const NOTE = (function () {
    const base = {
      A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
      A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99,
      A5: 880.00, B5: 987.77, C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98
    };
    return function (name) { return base[name] || 440.0; };
  })();

  /* ---------- 1. Tono single con envolvente ADSR (suave sin clicks) ---------- */
  function _playTone(noteHz, durationMs, opts) {
    const ctx = _ensureCtx();
    if (!ctx || !_state.master) return;
    const wave   = (opts && opts.wave)   || 'sine';
    const gain   = (opts && opts.gain != null) ? opts.gain : 0.09;
    const delay  = (opts && opts.delayMs) ? (opts.delayMs / 1000) : 0;
    const vibratoDepth = (opts && opts.vibratoHz) ? opts.vibratoDepth || 0 : 0;
    const vibratoHz    = (opts && opts.vibratoHz) || 0;

    const now = ctx.currentTime + delay;
    const dur = durationMs / 1000;
    const att = Math.min(0.012, dur * 0.12);
    const rel = Math.min(0.05,  dur * 0.35);

    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(noteHz, now);

      if (vibratoHz > 0 && vibratoDepth > 0) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = vibratoHz;
        lfoGain.gain.value = vibratoDepth;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + dur + rel);
      }

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + att);
      env.gain.setValueAtTime(Math.max(0.0002, gain), now + Math.max(att, dur - rel));
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(env);
      env.connect(_state.master);

      osc.start(now);
      osc.stop(now + dur + rel);
    } catch (e) {
      try { console.warn('[AudioSystem] _playTone error:', e && e.message ? e.message : e); } catch (_) {}
    }
  }

  /* ---------- 2. Definición de 6 sonidos ---------- */
  const SOUNDS = {
    click:     [ function () { _playTone(NOTE('C5'),  75, { wave: 'triangle', gain: 0.160 }); } ],
    correct:   [
      function () { _playTone(NOTE('C5'),  95, { wave: 'triangle', gain: 0.170 }); },
      function () { _playTone(NOTE('E5'),  95, { wave: 'triangle', gain: 0.170, delayMs:  95 }); },
      function () { _playTone(NOTE('G5'), 120, { wave: 'triangle', gain: 0.175, delayMs: 190 }); }
    ],
    incorrect: [
      function () { _playTone(NOTE('A3'), 130, { wave: 'sine',     gain: 0.165 }); },
      function () { _playTone(NOTE('F3'), 150, { wave: 'sine',     gain: 0.160, delayMs: 130 }); }
    ],
    lifeLost: [
      function () { _playTone(NOTE('D4'), 125, { wave: 'triangle', gain: 0.170 }); },
      function () { _playTone(NOTE('A3'), 150, { wave: 'triangle', gain: 0.165, delayMs: 125 }); }
    ],
    win: [
      function () { _playTone(NOTE('C5'), 135, { wave: 'triangle', gain: 0.170 }); },
      function () { _playTone(NOTE('E5'), 135, { wave: 'triangle', gain: 0.170, delayMs: 135 }); },
      function () { _playTone(NOTE('G5'), 135, { wave: 'triangle', gain: 0.175, delayMs: 270 }); },
      function () { _playTone(NOTE('C6'), 180, { wave: 'triangle', gain: 0.180, delayMs: 405 }); }
    ],
    record: [
      function () { _playTone(NOTE('C5'),  120, { wave: 'sine', gain: 0.170 }); },
      function () { _playTone(NOTE('E5'),  120, { wave: 'sine', gain: 0.170, delayMs: 120 }); },
      function () { _playTone(NOTE('G5'),  120, { wave: 'sine', gain: 0.175, delayMs: 240 }); },
      function () { _playTone(NOTE('C6'),  150, { wave: 'sine', gain: 0.180, delayMs: 360 }); },
      function () { _playTone(NOTE('G6'),  260, { wave: 'sine', gain: 0.190, delayMs: 510, vibratoHz: 5.2, vibratoDepth: 8 }); }
    ]
  };

  /* ---------- 3. Persistencia preferencia audio ---------- */
  function _loadEnabled() {
    if (!_state._storageReady) return DEFAULT_ENABLED;
    try {
      const v = Storage.load(STORAGE_KEY, DEFAULT_ENABLED);
      return v === true || v === false ? v : DEFAULT_ENABLED;
    } catch (_) { return DEFAULT_ENABLED; }
  }

  function _saveEnabled(val) {
    if (!_state._storageReady) return;
    try { Storage.save(STORAGE_KEY, val === true); }
    catch (_) {}
  }

  /* ---------- 4. API pública ---------- */
  // Helper: ejecuta la secuencia de sonido (una vez que ctx.running está garantizado)
  function _runSequence(seq) {
    for (let i = 0; i < seq.length; i++) {
      try { seq[i](); } catch (e) {
        try { console.warn('[AudioSystem] seq step error:', e && e.message ? e.message : e); } catch (_) {}
      }
    }
  }

  const AudioSystem = {
    /** Reproduce un sonido registrado (silencioso si disabled o ctx no disponible). */
    play(name) {
      if (!this.isEnabled()) return;
      const seq = SOUNDS[name];
      if (!Array.isArray(seq) || seq.length === 0) return;
      const ctx = _ensureCtx();
      if (!ctx) return;

      // Camino rápido: ctx ya running → reproducir YA (sin micro-delay de Promise microtask)
      if (ctx.state === 'running') {
        _runSequence(seq);
        return;
      }

      // ctx === 'suspended' o 'interrupted' (autoplay policy): reanudar PRIMERO y luego reproducir
      // Chromium 120+: osciladores scheduleados SUSPENDED antes de resume.then() se dropean silenciosamente.
      const whenReady = function () {
        try { _runSequence(seq); } catch (_) {}
      };
      try {
        const p = ctx.resume();
        if (p && typeof p.then === 'function') {
          p.then(whenReady).catch(function () { whenReady(); });
        } else {
          whenReady();
        }
      } catch (_) {
        whenReady();
      }
    },

    isEnabled() { return _state.enabled === true; },

    /** Activa/desactiva audio; persiste preferencia. */
    setEnabled(enabled, opts) {
      const next = enabled === true;
      _state.enabled = next;
      if (!(opts && opts.skipSave === true)) _saveEnabled(next);
    },

    /** Resumen Web Audio: tras 1er gesto humano, reanuda ctx y no vuelve a preguntar. */
    bootstrap() {
      if (_state.bootstrapped) return;
      _state.bootstrapped = true;
      _state.enabled = _loadEnabled();
      if (!AudioCtx) return;
      const self = this;
      function once(e) {
        const ctx = _ensureCtx();
        if (ctx && ctx.state === 'suspended') { try { ctx.resume().catch(function () {}); } catch (_) {} }
        window.removeEventListener('click',     once, true);
        window.removeEventListener('touchstart',once, true);
        window.removeEventListener('keydown',   once, true);
      }
      window.addEventListener('click',     once, true);
      window.addEventListener('touchstart',once, true);
      window.addEventListener('keydown',   once, true);
    }
  };

  if (typeof window !== 'undefined') {
    window.AudioSystem = AudioSystem;
  }
})();
