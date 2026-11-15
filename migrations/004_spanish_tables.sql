-- =============================================================================
-- Migration 004: Tablas del schema SPANISH
-- App de Español — Módulos: Decks (SM-2) + RAE + Lectura + Gramática
-- =============================================================================
-- Prerequisito: 003_english_tables.sql ejecutado
-- NOTA: Las tablas son estructuralmente similares a english pero son
-- COMPLETAMENTE INDEPENDIENTES. No hay FKs cruzadas entre schemas.
-- Esta duplicación es INTENCIONAL — cada app evoluciona independientemente.

-- Tipos ENUM en schema spanish (aislados de english — copia intencional)
CREATE TYPE spanish.deck_status   AS ENUM ('active', 'paused', 'archived');
CREATE TYPE spanish.card_status   AS ENUM ('new', 'learning', 'review', 'mastered');
CREATE TYPE spanish.difficulty    AS ENUM ('again', 'hard', 'good', 'easy');
CREATE TYPE spanish.lesson_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE spanish.exercise_type AS ENUM ('multiple_choice', 'fill_blank', 'translation', 'listening', 'speaking');

-- ---------------------------------------------------------------------------
-- spanish.flashcard_decks
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.flashcard_decks (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT            NOT NULL,
  description     TEXT,
  cover_color     TEXT            DEFAULT '#F59E0B',   -- amber: color de marca spanish
  status          spanish.deck_status DEFAULT 'active',
  total_cards     INTEGER         DEFAULT 0,
  new_cards       INTEGER         DEFAULT 0,
  due_cards       INTEGER         DEFAULT 0,
  mastered_cards  INTEGER         DEFAULT 0,
  last_studied_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_decks_user_idx   ON spanish.flashcard_decks(user_id);
CREATE INDEX spanish_decks_status_idx ON spanish.flashcard_decks(status);

-- ---------------------------------------------------------------------------
-- spanish.flashcards — con estado SM-2 propio
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.flashcards (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id          UUID            NOT NULL REFERENCES spanish.flashcard_decks(id) ON DELETE CASCADE,
  user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front            TEXT            NOT NULL,
  back             TEXT            NOT NULL,
  phonetic         TEXT,
  example_sentence TEXT,
  image_url        TEXT,
  audio_url        TEXT,
  tags             TEXT[],
  -- SM-2 state (duplicado intencional — no importa de english)
  status           spanish.card_status DEFAULT 'new',
  easiness_factor  REAL            DEFAULT 2.5 CHECK (easiness_factor >= 1.3),
  interval_days    INTEGER         DEFAULT 0,
  repetitions      SMALLINT        DEFAULT 0,
  next_review_at   TIMESTAMPTZ     DEFAULT NOW(),
  total_reviews    INTEGER         DEFAULT 0,
  correct_reviews  INTEGER         DEFAULT 0,
  created_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_cards_deck_idx    ON spanish.flashcards(deck_id);
CREATE INDEX spanish_cards_user_idx    ON spanish.flashcards(user_id);
CREATE INDEX spanish_cards_review_idx  ON spanish.flashcards(user_id, next_review_at);
CREATE INDEX spanish_cards_status_idx  ON spanish.flashcards(status);

-- ---------------------------------------------------------------------------
-- spanish.card_reviews — log SM-2 propio
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.card_reviews (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             UUID            NOT NULL REFERENCES spanish.flashcards(id) ON DELETE CASCADE,
  user_id             UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id             UUID            NOT NULL REFERENCES spanish.flashcard_decks(id) ON DELETE CASCADE,
  difficulty          spanish.difficulty NOT NULL,
  ef_before           REAL            NOT NULL,
  interval_before     INTEGER         NOT NULL,
  repetitions_before  SMALLINT        NOT NULL,
  ef_after            REAL            NOT NULL,
  interval_after      INTEGER         NOT NULL,
  repetitions_after   SMALLINT        NOT NULL,
  response_time_ms    INTEGER,
  reviewed_at         TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_reviews_card_idx ON spanish.card_reviews(card_id);
CREATE INDEX spanish_reviews_user_idx ON spanish.card_reviews(user_id);
CREATE INDEX spanish_reviews_date_idx ON spanish.card_reviews(user_id, reviewed_at);

-- ---------------------------------------------------------------------------
-- spanish.rae_lookups — búsquedas en el diccionario RAE
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.rae_lookups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word         TEXT        NOT NULL,
  definition   TEXT,
  etymology    TEXT,
  examples     TEXT[],
  flashcard_id UUID        REFERENCES spanish.flashcards(id) ON DELETE SET NULL,
  looked_up_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_rae_user_idx ON spanish.rae_lookups(user_id);
CREATE INDEX spanish_rae_word_idx ON spanish.rae_lookups(word);

-- ---------------------------------------------------------------------------
-- spanish.reading_sessions — comprensión lectora
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.reading_sessions (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 TEXT            NOT NULL,
  text_content          TEXT,
  source_url            TEXT,
  status                spanish.lesson_status DEFAULT 'not_started',
  words_count           INTEGER         DEFAULT 0,
  reading_time_seconds  INTEGER         DEFAULT 0,
  comprehension         SMALLINT        DEFAULT 0 CHECK (comprehension BETWEEN 0 AND 100),
  notes                 TEXT,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_reading_user_idx ON spanish.reading_sessions(user_id);

-- ---------------------------------------------------------------------------
-- spanish.grammar_exercises — scaffold
-- ---------------------------------------------------------------------------
CREATE TABLE spanish.grammar_exercises (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           spanish.exercise_type NOT NULL,
  question       TEXT            NOT NULL,
  correct_answer TEXT            NOT NULL,
  user_answer    TEXT,
  is_correct     BOOLEAN,
  grammar_topic  TEXT,
  cefr_level     TEXT            DEFAULT 'B1',
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX spanish_grammar_user_idx  ON spanish.grammar_exercises(user_id);
CREATE INDEX spanish_grammar_topic_idx ON spanish.grammar_exercises(grammar_topic);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION spanish.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_es_decks_updated_at
  BEFORE UPDATE ON spanish.flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION spanish.update_updated_at();

CREATE TRIGGER trg_es_cards_updated_at
  BEFORE UPDATE ON spanish.flashcards
  FOR EACH ROW EXECUTE FUNCTION spanish.update_updated_at();

CREATE TRIGGER trg_es_reading_updated_at
  BEFORE UPDATE ON spanish.reading_sessions
  FOR EACH ROW EXECUTE FUNCTION spanish.update_updated_at();
