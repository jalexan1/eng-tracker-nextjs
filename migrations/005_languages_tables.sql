-- =============================================================================
-- Migration 005: Tablas del schema LANGUAGES
-- Repositorio de contenido lingüístico curado y compartido
-- =============================================================================
-- Prerequisito: 004_spanish_tables.sql ejecutado

-- Tipos ENUM
CREATE TYPE languages.word_category       AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'article', 'phrase');
CREATE TYPE languages.difficulty_tier     AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE languages.translation_quality AS ENUM ('machine', 'human_reviewed', 'certified');

-- ---------------------------------------------------------------------------
-- languages.vocabulary_bank
-- ---------------------------------------------------------------------------
CREATE TABLE languages.vocabulary_bank (
  id            UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  word          TEXT                       NOT NULL,
  language_code TEXT                       NOT NULL REFERENCES shared.languages(code),
  category      languages.word_category,
  cefr_level    languages.difficulty_tier,
  phonetic      TEXT,
  audio_url     TEXT,
  definition    TEXT,
  etymology     TEXT,
  tags          TEXT[],
  frequency     INTEGER                    DEFAULT 0,
  is_active     BOOLEAN                    DEFAULT TRUE,
  created_at    TIMESTAMPTZ                DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ                DEFAULT NOW() NOT NULL,
  UNIQUE (word, language_code)
);

CREATE INDEX lang_vocab_lang_idx      ON languages.vocabulary_bank(language_code);
CREATE INDEX lang_vocab_category_idx  ON languages.vocabulary_bank(category);
CREATE INDEX lang_vocab_level_idx     ON languages.vocabulary_bank(cefr_level);
CREATE INDEX lang_vocab_frequency_idx ON languages.vocabulary_bank(frequency DESC);

-- ---------------------------------------------------------------------------
-- languages.word_translations
-- ---------------------------------------------------------------------------
CREATE TABLE languages.word_translations (
  id             UUID                           PRIMARY KEY DEFAULT gen_random_uuid(),
  source_word_id UUID                           NOT NULL REFERENCES languages.vocabulary_bank(id) ON DELETE CASCADE,
  target_word_id UUID                           NOT NULL REFERENCES languages.vocabulary_bank(id) ON DELETE CASCADE,
  quality        languages.translation_quality  DEFAULT 'machine',
  confidence     SMALLINT                       DEFAULT 80 CHECK (confidence BETWEEN 0 AND 100),
  context_notes  TEXT,
  example_source TEXT,
  example_target TEXT,
  is_preferred   BOOLEAN                        DEFAULT FALSE,
  created_at     TIMESTAMPTZ                    DEFAULT NOW() NOT NULL,
  UNIQUE (source_word_id, target_word_id),
  CHECK (source_word_id <> target_word_id)
);

CREATE INDEX lang_translations_source_idx ON languages.word_translations(source_word_id);
CREATE INDEX lang_translations_target_idx ON languages.word_translations(target_word_id);

-- ---------------------------------------------------------------------------
-- languages.grammar_patterns
-- ---------------------------------------------------------------------------
CREATE TABLE languages.grammar_patterns (
  id             UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code  TEXT                       NOT NULL REFERENCES shared.languages(code),
  topic          TEXT                       NOT NULL,
  title          TEXT                       NOT NULL,
  explanation    TEXT                       NOT NULL,
  structure      TEXT,
  examples       TEXT[],
  anti_examples  TEXT[],
  cefr_level     languages.difficulty_tier  DEFAULT 'B1',
  related_topics TEXT[],
  is_active      BOOLEAN                    DEFAULT TRUE,
  created_at     TIMESTAMPTZ                DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ                DEFAULT NOW() NOT NULL
);

CREATE INDEX lang_grammar_topic_idx ON languages.grammar_patterns(language_code, topic);
CREATE INDEX lang_grammar_level_idx ON languages.grammar_patterns(cefr_level);

-- ---------------------------------------------------------------------------
-- languages.irregular_verbs
-- ---------------------------------------------------------------------------
CREATE TABLE languages.irregular_verbs (
  id                   UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code        TEXT                       NOT NULL REFERENCES shared.languages(code),
  infinitive           TEXT                       NOT NULL,
  simple_past          TEXT,
  past_participle      TEXT,
  present_participle   TEXT,
  spanish              TEXT,
  example_sentence     TEXT,
  cefr_level           languages.difficulty_tier  DEFAULT 'A2',
  frequency            INTEGER                    DEFAULT 0,
  tags                 TEXT[],
  created_at           TIMESTAMPTZ                DEFAULT NOW() NOT NULL,
  UNIQUE (infinitive, language_code)
);

CREATE INDEX lang_verbs_lang_idx      ON languages.irregular_verbs(language_code);
CREATE INDEX lang_verbs_level_idx     ON languages.irregular_verbs(cefr_level);
CREATE INDEX lang_verbs_frequency_idx ON languages.irregular_verbs(frequency DESC);

-- ---------------------------------------------------------------------------
-- languages.idioms
-- ---------------------------------------------------------------------------
CREATE TABLE languages.idioms (
  id            UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT                       NOT NULL REFERENCES shared.languages(code),
  expression    TEXT                       NOT NULL,
  meaning       TEXT                       NOT NULL,
  literal       TEXT,
  origin        TEXT,
  examples      TEXT[],
  register      TEXT                       DEFAULT 'informal',
  cefr_level    languages.difficulty_tier  DEFAULT 'B2',
  tags          TEXT[],
  is_active     BOOLEAN                    DEFAULT TRUE,
  created_at    TIMESTAMPTZ                DEFAULT NOW() NOT NULL,
  UNIQUE (expression, language_code)
);

CREATE INDEX lang_idioms_lang_idx  ON languages.idioms(language_code);
CREATE INDEX lang_idioms_level_idx ON languages.idioms(cefr_level);

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION languages.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vocab_updated_at
  BEFORE UPDATE ON languages.vocabulary_bank
  FOR EACH ROW EXECUTE FUNCTION languages.update_updated_at();

CREATE TRIGGER trg_grammar_updated_at
  BEFORE UPDATE ON languages.grammar_patterns
  FOR EACH ROW EXECUTE FUNCTION languages.update_updated_at();
