/* ==========================================================================
   TEXTOS UI - Español (FASE 1)
   Solo los textos que se usan realmente en FASE 1.
   Añadir más aquí cuando se necesiten (sin inventar por inventar).
   ========================================================================== */
window.TEXT = {

  welcome: {
    title: '¡Bienvenido!',
    subtitle: '¿Cómo te llamas hoy?',
    labelName: 'Escribe tu nombre',
    placeholderName: 'Tu nombre aquí',
    btnContinue: '¡Continuar! →'
  },

  menu: {
    greeting: '¡Hola, {name}!',
    subtitle: '¿Qué quieres hacer hoy?',

    nav: {
      play: {
        icon: '🎮',
        title: 'Jugar',
        desc: 'Elige un minijuego'
      },
      scores: {
        icon: '🏆',
        title: 'Mejores Puntuaciones',
        desc: 'Mira los récords'
      },
      settings: {
        icon: '⚙️',
        title: 'Ajustes',
        desc: 'Configura la app'
      }
    }
  },

  selector: {
    title: 'Elige un juego',
    back: '← Volver',
    play: '¡Jugar!'
  },

  game: {
    exit: '← Salir',
    hud: {
      lives: 'Vidas',
      score: 'Puntos',
      timer: 'Tiempo'
    }
  },

  results: {
    title: '¡Fin de la partida!',
    subtitle: 'Buen trabajo',
    stats: {
      score: 'Puntos',
      hits: 'Aciertos',
      best: 'Mejor récord'
    },
    actions: {
      restart: '🔄 Jugar de nuevo',
      menu: '🏠 Menú principal'
    }
  },

  highscores: {
    title: '🏆 Mejores Puntuaciones',
    emptyTitle: '¡Todavía no hay récords!',
    emptyDesc: 'Juega una partida y aparecerás aquí.',
    table: {
      pos: '#',
      name: 'Nombre',
      score: 'Puntos',
      stars: 'Estrellas'
    }
  },

  settings: {
    title: '⚙️ Ajustes',
    nameLabel: 'Tu nombre',
    namePlaceholder: 'Escribe tu nombre',
    saveBtn: '💾 Guardar cambios',
    savedMsg: '¡Cambios guardados!'
  },

  quiz: {
    intro: {
      title: '🧠 Quiz Desafío',
      desc: 'Responde 10 preguntas y consigue puntos. ¡Haz una buena racha!',
      rules: [
        '3 vidas por partida',
        '30 segundos por pregunta',
        'Bonus por responder rápido',
        '3 aciertos seguidos = ¡Puntos extra!'
      ],
      btnStart: '¡Comenzar! 🚀'
    },
    progress: 'Pregunta {current} de {total}',
    feedback: {
      correct: {
        title: '✨ ¡CORRECTO!',
        pointsLabel: '+{pts} puntos'
      },
      incorrect: {
        title: '❌ ¡Casi!',
        correctWas: 'La respuesta correcta era:',
        correctAnswer: '{answer}'
      },
      timeout: {
        title: '⏰ ¡Se acabó el tiempo!',
        correctWas: 'La respuesta correcta era:',
        correctAnswer: '{answer}'
      }
    },
    btnNext: 'Siguiente →',
    streamBadge: '🔥 Racha x{n}'
  }
};
