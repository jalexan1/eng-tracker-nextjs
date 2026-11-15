-- =============================================================================
-- Migration 003: Tablas del schema ENGLISH
-- App de Inglés — Módulos: Decks (SM-2) + BBC Learning English + Grammar
-- =============================================================================
-- Prerequisito: 002_shared_tables.sql ejecutado

-- Tipos ENUM en schema english (aislados de spanish)
CREATE TYPE english.deck_status   AS ENUM ('active', 'paused', 'archived');
CREATE TYPE english.card_status   AS ENUM ('new', 'learning', 'review', 'mastered');
CREATE TYPE english.difficulty    AS ENUM ('again', 'hard', 'good', 'easy');
CREATE TYPE english.lesson_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE english.exercise_type AS ENUM ('multiple_choice', 'fill_blank', 'translation', 'listening', 'speaking');

-- ---------------------------------------------------------------------------
-- english.flashcard_decks
-- ---------------------------------------------------------------------------
CREATE TABLE english.flashcard_decks (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT            NOT NULL,
  description     TEXT,
  cover_color     TEXT            DEFAULT '#6366F1',
  status          english.deck_status DEFAULT 'active',
  total_cards     INTEGER         DEFAULT 0,
  new_cards       INTEGER         DEFAULT 0,
  due_cards       INTEGER         DEFAULT 0,
  mastered_cards  INTEGER         DEFAULT 0,
  last_studied_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX english_decks_user_idx   ON english.flashcard_decks(user_id);
CREATE INDEX english_decks_status_idx ON english.flashcard_decks(status);
COMMENT ON TABLE english.flashcard_decks IS 'Mazos de flashcards del usuario — App Inglés';

-- ---------------------------------------------------------------------------
-- english.flashcards — con estado SM-2
-- ---------------------------------------------------------------------------
CREATE TABLE english.flashcards (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id          UUID            NOT NULL REFERENCES english.flashcard_decks(id) ON DELETE CASCADE,
  user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front            TEXT            NOT NULL,
  back             TEXT            NOT NULL,
  phonetic         TEXT,
  example_sentence TEXT,
  image_url        TEXT,
  audio_url        TEXT,
  tags             TEXT[],
  -- SM-2 Algorithm state
  status           english.card_status DEFAULT 'new',
  easiness_factor  REAL            DEFAULT 2.5 CHECK (easiness_factor >= 1.3),
  interval_days    INTEGER         DEFAULT 0,
  repetitions      SMALLINT        DEFAULT 0,
  next_review_at   TIMESTAMPTZ     DEFAULT NOW(),
  total_reviews    INTEGER         DEFAULT 0,
  correct_reviews  INTEGER         DEFAULT 0,
  created_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX english_cards_deck_idx    ON english.flashcards(deck_id);
CREATE INDEX english_cards_user_idx    ON english.flashcards(user_id);
CREATE INDEX english_cards_review_idx  ON english.flashcards(user_id, next_review_at);
CREATE INDEX english_cards_status_idx  ON english.flashcards(status);

-- ---------------------------------------------------------------------------
-- english.card_reviews — log inmutable SM-2
-- ---------------------------------------------------------------------------
CREATE TABLE english.card_reviews (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             UUID            NOT NULL REFERENCES english.flashcards(id) ON DELETE CASCADE,
  user_id             UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id             UUID            NOT NULL REFERENCES english.flashcard_decks(id) ON DELETE CASCADE,
  difficulty          english.difficulty NOT NULL,
  ef_before           REAL            NOT NULL,
  interval_before     INTEGER         NOT NULL,
  repetitions_before  SMALLINT        NOT NULL,
  ef_after            REAL            NOT NULL,
  interval_after      INTEGER         NOT NULL,
  repetitions_after   SMALLINT        NOT NULL,
  response_time_ms    INTEGER,
  reviewed_at         TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX english_reviews_card_idx ON english.card_reviews(card_id);
CREATE INDEX english_reviews_user_idx ON english.card_reviews(user_id);
CREATE INDEX english_reviews_date_idx ON english.card_reviews(user_id, reviewed_at);

-- ---------------------------------------------------------------------------
-- english.bbc_episodes
-- ---------------------------------------------------------------------------
CREATE TABLE english.bbc_episodes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_code     TEXT        NOT NULL UNIQUE,     -- 'ep-250113'
  title            TEXT        NOT NULL,
  series           TEXT        NOT NULL,            -- '6 Minute English'
  topic            TEXT,
  cefr_level       TEXT        DEFAULT 'B1',
  audio_url        TEXT,
  transcript_url   TEXT,
  duration_seconds INTEGER,
  published_at     TIMESTAMPTZ,
  tags             TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX english_bbc_series_idx ON english.bbc_episodes(series);
CREATE INDEX english_bbc_level_idx  ON english.bbc_episodes(cefr_level);

-- ---------------------------------------------------------------------------
-- english.bbc_user_progress
-- ---------------------------------------------------------------------------
CREATE TABLE english.bbc_user_progress (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id       UUID            NOT NULL REFERENCES english.bbc_episodes(id) ON DELETE CASCADE,
  status           english.lesson_status DEFAULT 'not_started',
  listen_count     SMALLINT        DEFAULT 0,
  comprehension    SMALLINT        DEFAULT 0 CHECK (comprehension BETWEEN 0 AND 100),
  notes            TEXT,
  vocabulary_count SMALLINT        DEFAULT 0,
  completed_at     TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ     DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, episode_id)
);

CREATE INDEX english_bbc_progress_user_idx ON english.bbc_user_progress(user_id);

-- ---------------------------------------------------------------------------
-- english.bbc_vocabulary — palabras guardadas de episodios BBC
-- ---------------------------------------------------------------------------
CREATE TABLE english.bbc_vocabulary (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id   UUID        NOT NULL REFERENCES english.bbc_episodes(id) ON DELETE CASCADE,
  word         TEXT        NOT NULL,
  definition   TEXT,
  context      TEXT,
  phonetic     TEXT,
  flashcard_id UUID        REFERENCES english.flashcards(id) ON DELETE SET NULL,
  saved_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX english_bbc_vocab_user_idx    ON english.bbc_vocabulary(user_id);
CREATE INDEX english_bbc_vocab_episode_idx ON english.bbc_vocabulary(episode_id);

-- ---------------------------------------------------------------------------
-- english.grammar_exercises — scaffold para módulo futuro
-- ---------------------------------------------------------------------------
CREATE TABLE english.grammar_exercises (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           english.exercise_type NOT NULL,
  question       TEXT            NOT NULL,
  correct_answer TEXT            NOT NULL,
  user_answer    TEXT,
  is_correct     BOOLEAN,
  grammar_topic  TEXT,
  cefr_level     TEXT            DEFAULT 'B1',
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ     DEFAULT NOW() NOT NULL
);

CREATE INDEX english_grammar_user_idx  ON english.grammar_exercises(user_id);
CREATE INDEX english_grammar_topic_idx ON english.grammar_exercises(grammar_topic);

-- ---------------------------------------------------------------------------
-- Triggers updated_at para tablas english
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION english.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_en_decks_updated_at
  BEFORE UPDATE ON english.flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION english.update_updated_at();

CREATE TRIGGER trg_en_cards_updated_at
  BEFORE UPDATE ON english.flashcards
  FOR EACH ROW EXECUTE FUNCTION english.update_updated_at();

CREATE TRIGGER trg_en_bbc_progress_updated_at
  BEFORE UPDATE ON english.bbc_user_progress
  FOR EACH ROW EXECUTE FUNCTION english.update_updated_at();
