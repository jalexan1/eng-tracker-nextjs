/**
 * @file src/modules/english/irregular-verbs/data/irregular-verbs.ts
 * @description Base de datos de verbos irregulares en inglés.
 *   Organizados por GRUPOS SONOROS (patrón fonético), no alfabéticamente.
 *   Fuente principal: YouTube Rap "Irregular Verbs" (KiLcb9WS_XE).
 */

export type VerbGroup =
  | 'i-a-u'          // sing/sang/sung — patrón vocálico i→a→u
  | 'ought-aught'    // think/thought/thought — transformación -ought/-aught
  | 'invariable'     // cut/cut/cut — sin cambio
  | 'ew-own'         // grow/grew/grown — patrón ew→own
  | 'oke-oken'       // speak/spoke/spoken — patrón oke/oken
  | 'ook-aken'       // take/took/taken — patrón ook/aken
  | 'eft-elt-ent'    // leave/left/left — consonante + t al final
  | 'irregular'      // go/went/gone — sin patrón claro (high-frequency)

export interface IrregularVerb {
  id: string
  base: string          // base form
  past: string          // past simple
  participle: string    // past participle
  spanish: string       // traducción
  group: VerbGroup
  exampleSentence: string   // frase con past simple
  difficulty: 1 | 2 | 3    // 1=fácil 2=medio 3=difícil
  fromRap: boolean          // ¿aparece en el video rap KiLcb9WS_XE?
}

export const IRREGULAR_VERBS: IrregularVerb[] = [

  // ── GRUPO i → a → u ─────────────────────────────────────────────────────
  // Patrón: la vocal interna cambia i→a→u. Memotécnico: "sing sang sung"
  { id: 'sing',   base: 'sing',   past: 'sang',   participle: 'sung',   spanish: 'cantar',   group: 'i-a-u', exampleSentence: 'She sang a beautiful song at the concert.',    difficulty: 1, fromRap: true  },
  { id: 'drink',  base: 'drink',  past: 'drank',  participle: 'drunk',  spanish: 'beber',    group: 'i-a-u', exampleSentence: 'He drank three cups of coffee this morning.',  difficulty: 1, fromRap: true  },
  { id: 'swim',   base: 'swim',   past: 'swam',   participle: 'swum',   spanish: 'nadar',    group: 'i-a-u', exampleSentence: 'They swam across the lake last summer.',       difficulty: 2, fromRap: true  },
  { id: 'begin',  base: 'begin',  past: 'began',  participle: 'begun',  spanish: 'comenzar', group: 'i-a-u', exampleSentence: 'The movie began at exactly 8 p.m.',            difficulty: 2, fromRap: true  },
  { id: 'ring',   base: 'ring',   past: 'rang',   participle: 'rung',   spanish: 'sonar',    group: 'i-a-u', exampleSentence: 'The phone rang just as I was leaving.',         difficulty: 2, fromRap: true  },
  { id: 'run',    base: 'run',    past: 'ran',    participle: 'run',    spanish: 'correr',   group: 'i-a-u', exampleSentence: 'She ran five kilometers before breakfast.',      difficulty: 1, fromRap: true  },
  { id: 'spring', base: 'spring', past: 'sprang', participle: 'sprung', spanish: 'saltar',   group: 'i-a-u', exampleSentence: 'The cat sprang onto the table.',               difficulty: 3, fromRap: true  },
  { id: 'shrink', base: 'shrink', past: 'shrank', participle: 'shrunk', spanish: 'encoger',  group: 'i-a-u', exampleSentence: 'My shirt shrank in the wash.',                 difficulty: 3, fromRap: false },
  { id: 'stink',  base: 'stink',  past: 'stank',  participle: 'stunk',  spanish: 'apestar',  group: 'i-a-u', exampleSentence: 'The old fish stank terribly.',                  difficulty: 3, fromRap: false },

  // ── GRUPO ought / aught ──────────────────────────────────────────────────
  // Patrón: terminación cambia a -ought o -aught. Pronunciación idéntica: /ɔːt/
  { id: 'think',  base: 'think',  past: 'thought',  participle: 'thought',  spanish: 'pensar',   group: 'ought-aught', exampleSentence: 'I thought about you all day.',                difficulty: 1, fromRap: true  },
  { id: 'bring',  base: 'bring',  past: 'brought',  participle: 'brought',  spanish: 'traer',    group: 'ought-aught', exampleSentence: 'He brought flowers to the party.',              difficulty: 1, fromRap: true  },
  { id: 'buy',    base: 'buy',    past: 'bought',   participle: 'bought',   spanish: 'comprar',  group: 'ought-aught', exampleSentence: 'She bought a new laptop yesterday.',             difficulty: 1, fromRap: true  },
  { id: 'catch',  base: 'catch',  past: 'caught',   participle: 'caught',   spanish: 'atrapar',  group: 'ought-aught', exampleSentence: 'He caught the ball with one hand.',              difficulty: 1, fromRap: true  },
  { id: 'teach',  base: 'teach',  past: 'taught',   participle: 'taught',   spanish: 'enseñar',  group: 'ought-aught', exampleSentence: 'She taught English for 20 years.',               difficulty: 1, fromRap: true  },
  { id: 'fight',  base: 'fight',  past: 'fought',   participle: 'fought',   spanish: 'pelear',   group: 'ought-aught', exampleSentence: 'They fought hard for their rights.',             difficulty: 2, fromRap: true  },
  { id: 'seek',   base: 'seek',   past: 'sought',   participle: 'sought',   spanish: 'buscar',   group: 'ought-aught', exampleSentence: 'He sought advice from his mentor.',              difficulty: 3, fromRap: false },

  // ── GRUPO invariable (base = past = participle) ──────────────────────────
  // Patrón: las tres formas son iguales. Fácil de memorizar en bloque.
  { id: 'cut',    base: 'cut',    past: 'cut',    participle: 'cut',    spanish: 'cortar',   group: 'invariable', exampleSentence: 'She cut her finger while cooking.',              difficulty: 1, fromRap: true  },
  { id: 'put',    base: 'put',    past: 'put',    participle: 'put',    spanish: 'poner',    group: 'invariable', exampleSentence: 'He put the keys on the table.',                 difficulty: 1, fromRap: true  },
  { id: 'hit',    base: 'hit',    past: 'hit',    participle: 'hit',    spanish: 'golpear',  group: 'invariable', exampleSentence: 'The ball hit the window.',                       difficulty: 1, fromRap: true  },
  { id: 'let',    base: 'let',    past: 'let',    participle: 'let',    spanish: 'dejar',    group: 'invariable', exampleSentence: 'She let me borrow her car.',                    difficulty: 1, fromRap: false },
  { id: 'set',    base: 'set',    past: 'set',    participle: 'set',    spanish: 'fijar',    group: 'invariable', exampleSentence: 'He set a new world record.',                    difficulty: 1, fromRap: false },
  { id: 'hurt',   base: 'hurt',   past: 'hurt',   participle: 'hurt',   spanish: 'herir',    group: 'invariable', exampleSentence: 'She hurt her knee during the race.',             difficulty: 1, fromRap: true  },
  { id: 'cost',   base: 'cost',   past: 'cost',   participle: 'cost',   spanish: 'costar',   group: 'invariable', exampleSentence: 'The ticket cost more than I expected.',          difficulty: 1, fromRap: false },
  { id: 'read',   base: 'read',   past: 'read',   participle: 'read',   spanish: 'leer',     group: 'invariable', exampleSentence: 'I read the whole book in one day.',              difficulty: 2, fromRap: true  },
  { id: 'spread', base: 'spread', past: 'spread', participle: 'spread', spanish: 'extender', group: 'invariable', exampleSentence: 'The news spread quickly through the town.',      difficulty: 2, fromRap: false },

  // ── GRUPO ew → own / ew → ew ─────────────────────────────────────────────
  // Patrón: past con -ew, participle con -own (o igual al past)
  { id: 'grow',   base: 'grow',   past: 'grew',   participle: 'grown',  spanish: 'crecer',  group: 'ew-own', exampleSentence: 'The company grew rapidly last year.',             difficulty: 1, fromRap: true  },
  { id: 'blow',   base: 'blow',   past: 'blew',   participle: 'blown',  spanish: 'soplar',  group: 'ew-own', exampleSentence: 'The wind blew all night.',                        difficulty: 2, fromRap: true  },
  { id: 'know',   base: 'know',   past: 'knew',   participle: 'known',  spanish: 'saber',   group: 'ew-own', exampleSentence: 'I knew the answer immediately.',                  difficulty: 1, fromRap: true  },
  { id: 'throw',  base: 'throw',  past: 'threw',  participle: 'thrown', spanish: 'lanzar',  group: 'ew-own', exampleSentence: 'He threw the ball across the field.',             difficulty: 1, fromRap: true  },
  { id: 'fly',    base: 'fly',    past: 'flew',   participle: 'flown',  spanish: 'volar',   group: 'ew-own', exampleSentence: 'She flew to London for the meeting.',              difficulty: 1, fromRap: true  },
  { id: 'draw',   base: 'draw',   past: 'drew',   participle: 'drawn',  spanish: 'dibujar', group: 'ew-own', exampleSentence: 'He drew a map to explain the route.',              difficulty: 2, fromRap: false },

  // ── GRUPO oke / oken ─────────────────────────────────────────────────────
  // Patrón: past termina en -oke, participle en -oken
  { id: 'speak',   base: 'speak',   past: 'spoke',   participle: 'spoken',   spanish: 'hablar',    group: 'oke-oken', exampleSentence: 'She spoke in front of 500 people.',           difficulty: 1, fromRap: true  },
  { id: 'break',   base: 'break',   past: 'broke',   participle: 'broken',   spanish: 'romper',    group: 'oke-oken', exampleSentence: 'He broke his arm playing soccer.',             difficulty: 1, fromRap: true  },
  { id: 'wake',    base: 'wake',    past: 'woke',    participle: 'woken',    spanish: 'despertar', group: 'oke-oken', exampleSentence: 'She woke up at 5 a.m. every day.',             difficulty: 2, fromRap: true  },
  { id: 'choose',  base: 'choose',  past: 'chose',   participle: 'chosen',   spanish: 'elegir',    group: 'oke-oken', exampleSentence: 'They chose the best candidate.',               difficulty: 2, fromRap: false },
  { id: 'freeze',  base: 'freeze',  past: 'froze',   participle: 'frozen',   spanish: 'congelar',  group: 'oke-oken', exampleSentence: 'The river froze overnight.',                   difficulty: 2, fromRap: false },
  { id: 'steal',   base: 'steal',   past: 'stole',   participle: 'stolen',   spanish: 'robar',     group: 'oke-oken', exampleSentence: 'Someone stole his phone on the subway.',       difficulty: 2, fromRap: true  },

  // ── GRUPO ook / aken ─────────────────────────────────────────────────────
  // Patrón: past termina en -ook, participle en -aken o -en
  { id: 'take',    base: 'take',  past: 'took',  participle: 'taken',   spanish: 'tomar',    group: 'ook-aken', exampleSentence: 'She took a taxi to the airport.',               difficulty: 1, fromRap: true  },
  { id: 'shake',   base: 'shake', past: 'shook', participle: 'shaken',  spanish: 'sacudir',  group: 'ook-aken', exampleSentence: 'He shook hands with everyone in the room.',     difficulty: 2, fromRap: true  },
  { id: 'mistake', base: 'mistake',past:'mistook',participle:'mistaken', spanish: 'confundir',group: 'ook-aken', exampleSentence: 'I mistook him for his brother.',                difficulty: 3, fromRap: false },
  { id: 'forsake', base: 'forsake',past:'forsook',participle:'forsaken', spanish: 'abandonar',group: 'ook-aken', exampleSentence: 'He forsook his old habits completely.',          difficulty: 3, fromRap: false },

  // ── GRUPO eft / elt / ent (consonante + t) ───────────────────────────────
  // Patrón: la vocal desaparece y se añade -t. Suena "comprimido".
  { id: 'leave',  base: 'leave',  past: 'left',  participle: 'left',  spanish: 'irse',      group: 'eft-elt-ent', exampleSentence: 'She left the office before 6 p.m.',           difficulty: 1, fromRap: true  },
  { id: 'feel',   base: 'feel',   past: 'felt',  participle: 'felt',  spanish: 'sentir',    group: 'eft-elt-ent', exampleSentence: 'He felt nervous before the interview.',        difficulty: 1, fromRap: true  },
  { id: 'keep',   base: 'keep',   past: 'kept',  participle: 'kept',  spanish: 'guardar',   group: 'eft-elt-ent', exampleSentence: 'She kept all his old letters.',                difficulty: 1, fromRap: true  },
  { id: 'sleep',  base: 'sleep',  past: 'slept', participle: 'slept', spanish: 'dormir',    group: 'eft-elt-ent', exampleSentence: 'He slept for 10 hours after the trip.',        difficulty: 1, fromRap: true  },
  { id: 'build',  base: 'build',  past: 'built', participle: 'built', spanish: 'construir', group: 'eft-elt-ent', exampleSentence: 'They built the bridge in just six months.',    difficulty: 2, fromRap: true  },
  { id: 'send',   base: 'send',   past: 'sent',  participle: 'sent',  spanish: 'enviar',    group: 'eft-elt-ent', exampleSentence: 'She sent the report by email.',                difficulty: 1, fromRap: false },
  { id: 'spend',  base: 'spend',  past: 'spent', participle: 'spent', spanish: 'gastar',    group: 'eft-elt-ent', exampleSentence: 'He spent all his savings on the trip.',        difficulty: 1, fromRap: true  },
  { id: 'lend',   base: 'lend',   past: 'lent',  participle: 'lent',  spanish: 'prestar',   group: 'eft-elt-ent', exampleSentence: 'She lent me her umbrella.',                    difficulty: 2, fromRap: false },

  // ── GRUPO irregular (alta frecuencia, sin patrón claro) ──────────────────
  // Son los más usados del idioma. Prioridad máxima de memorización.
  { id: 'go',     base: 'go',     past: 'went',  participle: 'gone',   spanish: 'ir',         group: 'irregular', exampleSentence: 'Yesterday I went to the office early.',       difficulty: 1, fromRap: true  },
  { id: 'be',     base: 'be',     past: 'was/were',participle:'been',  spanish: 'ser/estar',  group: 'irregular', exampleSentence: 'She was very happy when she heard the news.', difficulty: 1, fromRap: true  },
  { id: 'have',   base: 'have',   past: 'had',   participle: 'had',    spanish: 'tener/haber',group: 'irregular', exampleSentence: 'He had breakfast at 7 a.m.',                  difficulty: 1, fromRap: true  },
  { id: 'do',     base: 'do',     past: 'did',   participle: 'done',   spanish: 'hacer',      group: 'irregular', exampleSentence: 'She did all the work by herself.',            difficulty: 1, fromRap: true  },
  { id: 'make',   base: 'make',   past: 'made',  participle: 'made',   spanish: 'hacer',      group: 'irregular', exampleSentence: 'He made dinner for the whole family.',        difficulty: 1, fromRap: true  },
  { id: 'say',    base: 'say',    past: 'said',  participle: 'said',   spanish: 'decir',      group: 'irregular', exampleSentence: 'She said she would call back.',               difficulty: 1, fromRap: true  },
  { id: 'see',    base: 'see',    past: 'saw',   participle: 'seen',   spanish: 'ver',        group: 'irregular', exampleSentence: 'I saw a great movie last night.',             difficulty: 1, fromRap: true  },
  { id: 'come',   base: 'come',   past: 'came',  participle: 'come',   spanish: 'venir',      group: 'irregular', exampleSentence: 'She came home late after the meeting.',       difficulty: 1, fromRap: true  },
  { id: 'give',   base: 'give',   past: 'gave',  participle: 'given',  spanish: 'dar',        group: 'irregular', exampleSentence: 'He gave me a book for my birthday.',          difficulty: 1, fromRap: true  },
  { id: 'get',    base: 'get',    past: 'got',   participle: 'gotten', spanish: 'obtener',    group: 'irregular', exampleSentence: 'She got a promotion at work.',                difficulty: 1, fromRap: true  },
  { id: 'find',   base: 'find',   past: 'found', participle: 'found',  spanish: 'encontrar',  group: 'irregular', exampleSentence: 'He found his keys under the couch.',          difficulty: 1, fromRap: true  },
  { id: 'tell',   base: 'tell',   past: 'told',  participle: 'told',   spanish: 'decir/contar',group:'irregular', exampleSentence: 'She told me the whole story.',               difficulty: 1, fromRap: true  },
  { id: 'write',  base: 'write',  past: 'wrote', participle: 'written',spanish: 'escribir',   group: 'irregular', exampleSentence: 'He wrote three chapters in one week.',        difficulty: 1, fromRap: true  },
  { id: 'stand',  base: 'stand',  past: 'stood', participle: 'stood',  spanish: 'estar de pie',group:'irregular', exampleSentence: 'They stood in line for two hours.',          difficulty: 2, fromRap: true  },
  { id: 'win',    base: 'win',    past: 'won',   participle: 'won',    spanish: 'ganar',      group: 'irregular', exampleSentence: 'Our team won the championship.',              difficulty: 1, fromRap: true  },
  { id: 'meet',   base: 'meet',   past: 'met',   participle: 'met',    spanish: 'conocer',    group: 'irregular', exampleSentence: 'I met my best friend in college.',            difficulty: 1, fromRap: true  },
  { id: 'sit',    base: 'sit',    past: 'sat',   participle: 'sat',    spanish: 'sentarse',   group: 'irregular', exampleSentence: 'She sat by the window and read.',             difficulty: 1, fromRap: true  },
  { id: 'eat',    base: 'eat',    past: 'ate',   participle: 'eaten',  spanish: 'comer',      group: 'irregular', exampleSentence: 'He ate sushi for the first time.',            difficulty: 1, fromRap: true  },
  { id: 'fall',   base: 'fall',   past: 'fell',  participle: 'fallen', spanish: 'caer',       group: 'irregular', exampleSentence: 'She fell asleep during the movie.',           difficulty: 1, fromRap: true  },
  { id: 'hear',   base: 'hear',   past: 'heard', participle: 'heard',  spanish: 'oír',        group: 'irregular', exampleSentence: 'He heard a strange noise upstairs.',          difficulty: 1, fromRap: true  },
  { id: 'pay',    base: 'pay',    past: 'paid',  participle: 'paid',   spanish: 'pagar',      group: 'irregular', exampleSentence: 'She paid for dinner.',                        difficulty: 1, fromRap: true  },
]

/** Helpers */
export const GROUP_LABELS: Record<VerbGroup, string> = {
  'i-a-u':       'i → a → u  (sing/sang/sung)',
  'ought-aught': '-ought / -aught  (think/thought)',
  'invariable':  'Sin cambio  (cut/cut/cut)',
  'ew-own':      '-ew / -own  (grow/grew/grown)',
  'oke-oken':    '-oke / -oken  (speak/spoke)',
  'ook-aken':    '-ook / -aken  (take/took)',
  'eft-elt-ent': 'Consonante + t  (leave/left)',
  'irregular':   'Alta frecuencia  (go/went/gone)',
}

export const GROUP_ORDER: VerbGroup[] = [
  'i-a-u', 'ought-aught', 'invariable', 'ew-own',
  'oke-oken', 'ook-aken', 'eft-elt-ent', 'irregular',
]

export const VERB_COUNT = IRREGULAR_VERBS.length
export const FROM_RAP_COUNT = IRREGULAR_VERBS.filter(v => v.fromRap).length
