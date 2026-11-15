-- =============================================================================
-- Migration 007: Datos semilla (Seed)
-- Contenido inicial requerido para que la plataforma funcione
-- =============================================================================
-- Prerequisito: 006_rls_policies.sql ejecutado

-- =============================================================================
-- shared.languages — catálogo de idiomas
-- =============================================================================
INSERT INTO shared.languages (code, name, native_name, flag_emoji, is_active, sort_order)
VALUES
  ('en', 'English',    'English',    '🇬🇧', TRUE,  1),
  ('es', 'Spanish',    'Español',    '🇪🇸', TRUE,  2),
  ('fr', 'French',     'Français',   '🇫🇷', FALSE, 3),
  ('de', 'German',     'Deutsch',    '🇩🇪', FALSE, 4),
  ('pt', 'Portuguese', 'Português',  '🇧🇷', FALSE, 5),
  ('it', 'Italian',    'Italiano',   '🇮🇹', FALSE, 6),
  ('ja', 'Japanese',   '日本語',      '🇯🇵', FALSE, 7),
  ('zh', 'Chinese',    '中文',        '🇨🇳', FALSE, 8)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- languages.irregular_verbs — 50 verbos más comunes en inglés (CEFR A1-B1)
-- =============================================================================
INSERT INTO languages.irregular_verbs (language_code, infinitive, simple_past, past_participle, present_participle, spanish, example_sentence, cefr_level, frequency)
VALUES
  -- A1 — Los más esenciales
  ('en', 'be',     'was/were', 'been',    'being',    'ser/estar',   'I am happy today.',              'A1', 100),
  ('en', 'have',   'had',      'had',     'having',   'tener/haber', 'She has a new book.',            'A1', 99),
  ('en', 'do',     'did',      'done',    'doing',    'hacer',       'What did you do yesterday?',     'A1', 98),
  ('en', 'say',    'said',     'said',    'saying',   'decir',       'He said goodbye.',               'A1', 97),
  ('en', 'go',     'went',     'gone',    'going',    'ir',          'We went to the park.',           'A1', 96),
  ('en', 'get',    'got',      'gotten',  'getting',  'obtener/ir',  'I got a good grade.',            'A1', 95),
  ('en', 'make',   'made',     'made',    'making',   'hacer',       'She made a cake.',               'A1', 94),
  ('en', 'know',   'knew',     'known',   'knowing',  'saber/conocer','Did you know that?',           'A1', 93),
  ('en', 'think',  'thought',  'thought', 'thinking', 'pensar',      'I thought about it.',            'A1', 92),
  ('en', 'take',   'took',     'taken',   'taking',   'tomar/llevar','He took the bus.',              'A1', 91),
  -- A2
  ('en', 'come',   'came',     'come',    'coming',   'venir',       'Come here, please.',             'A2', 90),
  ('en', 'see',    'saw',      'seen',    'seeing',   'ver',         'I saw a great movie.',           'A2', 89),
  ('en', 'give',   'gave',     'given',   'giving',   'dar',         'She gave me a present.',         'A2', 88),
  ('en', 'find',   'found',    'found',   'finding',  'encontrar',   'I found my keys.',               'A2', 87),
  ('en', 'tell',   'told',     'told',    'telling',  'decir/contar','He told me a story.',            'A2', 86),
  ('en', 'feel',   'felt',     'felt',    'feeling',  'sentir',      'I felt nervous.',                'A2', 85),
  ('en', 'leave',  'left',     'left',    'leaving',  'salir/dejar', 'She left at 8 AM.',              'A2', 84),
  ('en', 'put',    'put',      'put',     'putting',  'poner',       'Put it on the table.',           'A2', 83),
  ('en', 'mean',   'meant',    'meant',   'meaning',  'significar',  'What do you mean?',              'A2', 82),
  ('en', 'keep',   'kept',     'kept',    'keeping',  'mantener',    'Keep the change.',               'A2', 81),
  -- B1
  ('en', 'begin',  'began',    'begun',   'beginning','comenzar',    'The class began at 9.',          'B1', 80),
  ('en', 'show',   'showed',   'shown',   'showing',  'mostrar',     'Show me your work.',             'B1', 79),
  ('en', 'hear',   'heard',    'heard',   'hearing',  'oír/escuchar','Did you hear that?',            'B1', 78),
  ('en', 'stand',  'stood',    'stood',   'standing', 'estar de pie','She stood up quickly.',          'B1', 77),
  ('en', 'lose',   'lost',     'lost',    'losing',   'perder',      'We lost the game.',              'B1', 76),
  ('en', 'spend',  'spent',    'spent',   'spending', 'gastar/pasar','I spent two hours studying.',    'B1', 75),
  ('en', 'meet',   'met',      'met',     'meeting',  'conocer/reunirse','I met her last year.',       'B1', 74),
  ('en', 'run',    'ran',      'run',     'running',  'correr',      'He ran 5 km this morning.',      'B1', 73),
  ('en', 'pay',    'paid',     'paid',    'paying',   'pagar',       'Did you pay the bill?',          'B1', 72),
  ('en', 'bring',  'brought',  'brought', 'bringing', 'traer',       'Bring me some water, please.',   'B1', 71)
ON CONFLICT (infinitive, language_code) DO NOTHING;

-- =============================================================================
-- languages.grammar_patterns — patrones gramaticales inglés esenciales
-- =============================================================================
INSERT INTO languages.grammar_patterns (language_code, topic, title, explanation, structure, examples, anti_examples, cefr_level)
VALUES
  ('en', 'present_simple',
   'Present Simple',
   'Used for habits, routines, and general truths. With third person singular (he/she/it), add -s to the verb.',
   'Subject + V(base) [+ s/es for 3rd person]',
   ARRAY['I work from home.', 'She works at a hospital.', 'The sun rises in the east.'],
   ARRAY['She work at home.', 'He don''t like coffee.'],
   'A1'),

  ('en', 'present_continuous',
   'Present Continuous',
   'Used for actions happening right now or temporary situations. Formed with be + -ing.',
   'Subject + am/is/are + V-ing',
   ARRAY['I am studying English now.', 'She is working from home today.', 'They are playing football.'],
   ARRAY['I am know the answer.', 'She is having a car.'],
   'A1'),

  ('en', 'present_perfect',
   'Present Perfect',
   'Connects past actions to the present. Use for experiences, recent events, or unfinished time periods.',
   'Subject + have/has + past participle (V3)',
   ARRAY['I have lived here for 5 years.', 'She has just finished her homework.', 'Have you ever been to Colombia?'],
   ARRAY['I have went there last year.', 'She has saw that movie.'],
   'B1'),

  ('en', 'past_simple',
   'Past Simple',
   'Used for completed actions in the past. Regular verbs add -ed; irregular verbs have their own forms.',
   'Subject + V2 (past form)',
   ARRAY['I visited Bogotá last month.', 'She went to the store yesterday.', 'We met in 2020.'],
   ARRAY['I goed to school.', 'She have eaten breakfast.'],
   'A1'),

  ('en', 'first_conditional',
   'First Conditional (Real Future)',
   'Used for real or possible situations in the future. If + present simple, will + infinitive.',
   'If + subject + present simple, subject + will + V(base)',
   ARRAY['If it rains, I will stay home.', 'If you study hard, you will pass.', 'She will call if she is late.'],
   ARRAY['If it will rain, I stay home.', 'If you will study, you pass.'],
   'B1'),

  ('en', 'second_conditional',
   'Second Conditional (Unreal Present/Future)',
   'Used for hypothetical or unlikely situations. If + past simple, would + infinitive.',
   'If + subject + past simple, subject + would + V(base)',
   ARRAY['If I had more time, I would learn Japanese.', 'If she were here, she would help us.', 'What would you do if you won the lottery?'],
   ARRAY['If I would have time, I learn.', 'If she was richer, she will buy a house.'],
   'B2')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- english.bbc_episodes — primeros 5 episodios de 6 Minute English para seed
-- =============================================================================
INSERT INTO english.bbc_episodes (episode_code, title, series, topic, cefr_level, published_at, tags)
VALUES
  ('ep-250113',
   'Is chess a sport?',
   '6 Minute English',
   'sports, competition, strategy',
   'B1',
   '2025-01-13 09:00:00+00',
   ARRAY['sports', 'debate', 'vocabulary', 'B1']),

  ('ep-250120',
   'The power of the written word',
   '6 Minute English',
   'literacy, education, language',
   'B2',
   '2025-01-20 09:00:00+00',
   ARRAY['education', 'culture', 'vocabulary', 'B2']),

  ('ep-250127',
   'Why do we love rollercoasters?',
   '6 Minute English',
   'psychology, emotions, fun',
   'B1',
   '2025-01-27 09:00:00+00',
   ARRAY['psychology', 'science', 'vocabulary', 'B1']),

  ('ep-250203',
   'The science of sleep',
   '6 Minute English',
   'health, science, biology',
   'B2',
   '2025-02-03 09:00:00+00',
   ARRAY['health', 'science', 'vocabulary', 'B2']),

  ('ep-250210',
   'Are we addicted to our smartphones?',
   '6 Minute English',
   'technology, psychology, society',
   'B1',
   '2025-02-10 09:00:00+00',
   ARRAY['technology', 'society', 'vocabulary', 'B1'])
ON CONFLICT (episode_code) DO NOTHING;

-- =============================================================================
-- Verificar seed completo
-- =============================================================================
SELECT 'shared.languages'          AS tabla, COUNT(*) AS registros FROM shared.languages
UNION ALL
SELECT 'languages.irregular_verbs', COUNT(*) FROM languages.irregular_verbs
UNION ALL
SELECT 'languages.grammar_patterns', COUNT(*) FROM languages.grammar_patterns
UNION ALL
SELECT 'english.bbc_episodes',      COUNT(*) FROM english.bbc_episodes
ORDER BY tabla;
