/* ==========================================================================
   BANCO DE PREGUNTAS - QUIZ DESAFÍO (FASE 3)
   ------------------------------------------------------------------
   Materia principal: MATEMÁTICAS 4.º grado (9-10 años).
   Todas offline. Cada pregunta: 4 opciones, 1 correcta (correctIndex).
   20 preguntas para elegir 10 al azar sin repetir.
   ========================================================================== */
window.QUIZ_QUESTIONS = [
  {
    id: 'q01',
    category: 'Suma',
    question: '¿Cuánto es 345 + 230?',
    options: ['565', '575', '475', '585'],
    correctIndex: 1
  },
  {
    id: 'q02',
    category: 'Resta',
    question: '¿Cuánto es 800 − 347?',
    options: ['453', '563', '447', '463'],
    correctIndex: 0
  },
  {
    id: 'q03',
    category: 'Multiplicación',
    question: '¿Cuánto es 12 × 8?',
    options: ['86', '96', '104', '88'],
    correctIndex: 1
  },
  {
    id: 'q04',
    category: 'División',
    question: '¿Cuánto es 72 ÷ 6?',
    options: ['11', '10', '12', '13'],
    correctIndex: 2
  },
  {
    id: 'q05',
    category: 'Comparación',
    question: '¿Qué número es MAYOR?',
    options: ['3.200', '3.020', '3.002', '320'],
    correctIndex: 0
  },
  {
    id: 'q06',
    category: 'Problema',
    question: 'Lucía tiene 24 cromos y su prima le da 18 más. ¿Cuántos tiene ahora?',
    options: ['32', '42', '40', '44'],
    correctIndex: 1
  },
  {
    id: 'q07',
    category: 'Fracciones',
    question: '¿Qué fracción es IGUAL a 1/2?',
    options: ['2/3', '3/6', '1/4', '2/5'],
    correctIndex: 1
  },
  {
    id: 'q08',
    category: 'Multiplicación',
    question: '¿Cuánto es 25 × 4?',
    options: ['100', '90', '110', '80'],
    correctIndex: 0
  },
  {
    id: 'q09',
    category: 'Problema',
    question: 'En una caja hay 54 lápices. Se reparten en 6 bolsas iguales. ¿Cuántos lápices hay en cada bolsa?',
    options: ['7', '8', '9', '10'],
    correctIndex: 2
  },
  {
    id: 'q10',
    category: 'Suma',
    question: '¿Cuánto es 1.000 + 999?',
    options: ['1.999', '1.989', '2.000', '1.899'],
    correctIndex: 0
  },
  {
    id: 'q11',
    category: 'Resta',
    question: 'Un pantalón cuesta 45 € y una camisa 28 €. ¿Cuánto más cuesta el pantalón?',
    options: ['27 €', '17 €', '23 €', '13 €'],
    correctIndex: 1
  },
  {
    id: 'q12',
    category: 'Multiplicación',
    question: '¿Cuánto es 9 × 9?',
    options: ['79', '81', '91', '89'],
    correctIndex: 1
  },
  {
    id: 'q13',
    category: 'División',
    question: '¿Cuánto es 100 ÷ 4?',
    options: ['20', '24', '25', '22'],
    correctIndex: 2
  },
  {
    id: 'q14',
    category: 'Comparación',
    question: '¿Qué número es MENOR?',
    options: ['1/2', '3/4', '1/4', '2/3'],
    correctIndex: 2
  },
  {
    id: 'q15',
    category: 'Problema',
    question: 'Leo lee 12 páginas al día durante una semana (7 días). ¿Cuántas páginas lee en total?',
    options: ['74', '84', '72', '96'],
    correctIndex: 1
  },
  {
    id: 'q16',
    category: 'Fracciones',
    question: '¿Cuánto es 1/4 + 2/4?',
    options: ['3/8', '3/4', '4/3', '1/2'],
    correctIndex: 1
  },
  {
    id: 'q17',
    category: 'Suma',
    question: '¿Cuánto es 67 + 89 + 13?',
    options: ['159', '169', '179', '149'],
    correctIndex: 1
  },
  {
    id: 'q18',
    category: 'Resta',
    question: '¿Cuánto es 2.000 − 650?',
    options: ['1.350', '1.450', '1.250', '1.550'],
    correctIndex: 0
  },
  {
    id: 'q19',
    category: 'Multiplicación',
    question: 'Una clase tiene 5 filas con 6 pupitres cada una. ¿Cuántos pupitres hay en total?',
    options: ['25', '11', '30', '36'],
    correctIndex: 2
  },
  {
    id: 'q20',
    category: 'División',
    question: '8 amigos se reparten 48 cromos a partes iguales. ¿Cuántos cromos tocan a cada uno?',
    options: ['5', '6', '7', '8'],
    correctIndex: 1
  }
];
