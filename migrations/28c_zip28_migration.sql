-- =============================================================
-- ZIP 28 — Migración de base de datos
-- Schema: english
-- Tablas nuevas: 9  |  Enums nuevos: 5
-- SOLO contiene CREATE ... IF NOT EXISTS
-- NO borra datos, NO hace DROP, NO hace TRUNCATE
-- Seguro para correr en producción
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ENUMS NUEVOS (módulo Videos + Evaluaciones)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE english.video_status AS ENUM ('processing', 'ready', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE english.eval_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE english.question_type AS ENUM (
    'multiple_choice', 'fill_blank', 'translation', 'open_ended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE english.word_status AS ENUM ('learning', 'learned', 'mastered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE english.feature_status AS ENUM (
    'pending', 'in_progress', 'done', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: english.videos
-- Videos de YouTube importados por el usuario
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  youtube_url      TEXT        NOT NULL,
  youtube_id       TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  category         TEXT,
  transcript       TEXT,
  status           english.video_status NOT NULL DEFAULT 'processing',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_videos_user_idx   ON english.videos (user_id);
CREATE INDEX IF NOT EXISTS english_videos_ytid_idx   ON english.videos (youtube_id);
CREATE INDEX IF NOT EXISTS english_videos_status_idx ON english.videos (status);


-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: english.video_verbs
-- Verbos irregulares extraídos del video por la IA
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.video_verbs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id          UUID        NOT NULL,
  verb_base         TEXT        NOT NULL,
  verb_past         TEXT,
  verb_participle   TEXT,
  context_sentence  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_video_verbs_video_idx ON english.video_verbs (video_id);


-- ─────────────────────────────────────────────────────────────
-- 4. TABLA: english.video_sentences
-- Frases clave extraídas del video
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.video_sentences (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID        NOT NULL,
  sentence_en  TEXT        NOT NULL,
  sentence_es  TEXT,
  difficulty   TEXT        NOT NULL DEFAULT 'intermediate',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_video_sentences_video_idx ON english.video_sentences (video_id);


-- ─────────────────────────────────────────────────────────────
-- 5. TABLA: english.evaluations
-- Sesión de evaluación de un usuario sobre un video
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.evaluations (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID               NOT NULL,
  video_id          UUID               NOT NULL,
  total_questions   INTEGER            NOT NULL DEFAULT 10,
  correct_count     INTEGER            NOT NULL DEFAULT 0,
  score_percentage  REAL,
  status            english.eval_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS english_evals_user_idx  ON english.evaluations (user_id);
CREATE INDEX IF NOT EXISTS english_evals_video_idx ON english.evaluations (video_id);


-- ─────────────────────────────────────────────────────────────
-- 6. TABLA: english.evaluation_questions
-- Preguntas individuales de una evaluación
-- options: JSONB → [{label: string, value: string}] para multiple_choice
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.evaluation_questions (
  id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id    UUID                  NOT NULL,
  question_number  INTEGER               NOT NULL,
  question_type    english.question_type NOT NULL,
  question_text    TEXT                  NOT NULL,
  options          JSONB,
  correct_answer   TEXT                  NOT NULL,
  student_answer   TEXT,
  ai_grade         REAL,
  ai_feedback      TEXT,
  is_correct       BOOLEAN,
  created_at       TIMESTAMPTZ           NOT NULL DEFAULT now(),
  answered_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS english_eval_q_eval_idx ON english.evaluation_questions (evaluation_id);


-- ─────────────────────────────────────────────────────────────
-- 7. TABLA: english.student_errors
-- Errores cometidos — base del Spaced Repetition (SM-2)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.student_errors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  evaluation_id    UUID        NOT NULL,
  question_id      UUID        NOT NULL,
  video_id         UUID        NOT NULL,
  word_or_concept  TEXT        NOT NULL,
  error_type       TEXT,
  next_review_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_count     INTEGER     NOT NULL DEFAULT 0,
  interval_days    INTEGER     NOT NULL DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_errors_user_idx
  ON english.student_errors (user_id);

CREATE INDEX IF NOT EXISTS english_errors_review_idx
  ON english.student_errors (user_id, next_review_at);


-- ─────────────────────────────────────────────────────────────
-- 8. TABLA: english.learned_words
-- Palabras dominadas por el usuario (correctas consistentemente)
-- UNIQUE en (user_id, word) para onConflictDoNothing
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.learned_words (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID               NOT NULL,
  word                 TEXT               NOT NULL,
  word_type            TEXT               NOT NULL DEFAULT 'verb',
  source_video_id      UUID,
  consecutive_correct  INTEGER            NOT NULL DEFAULT 1,
  status               english.word_status NOT NULL DEFAULT 'learning',
  last_tested_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_learned_user_idx
  ON english.learned_words (user_id);

CREATE INDEX IF NOT EXISTS english_learned_status_idx
  ON english.learned_words (user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS english_learned_word_user_uniq
  ON english.learned_words (user_id, word);


-- ─────────────────────────────────────────────────────────────
-- 9. TABLA: english.system_parameters
-- Parámetros configurables del sistema por usuario
-- UNIQUE en (user_id, language, key)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.system_parameters (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  language   TEXT        NOT NULL DEFAULT 'en',
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  label      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS english_params_user_key_uniq
  ON english.system_parameters (user_id, language, key);


-- ─────────────────────────────────────────────────────────────
-- 10. TABLA: english.pending_features
-- Funcionalidades pendientes guardadas desde la app
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS english.pending_features (
  id          UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                   NOT NULL,
  title       TEXT                   NOT NULL,
  description TEXT,
  context     TEXT,
  status      english.feature_status NOT NULL DEFAULT 'pending',
  priority    SMALLINT               NOT NULL DEFAULT 2,
  created_at  TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS english_pending_user_idx
  ON english.pending_features (user_id);

CREATE INDEX IF NOT EXISTS english_pending_status_idx
  ON english.pending_features (status);


-- =============================================================
-- FIN DE MIGRACIÓN ZIP 28
-- Tablas creadas: videos, video_verbs, video_sentences,
--   evaluations, evaluation_questions, student_errors,
--   learned_words, system_parameters, pending_features
-- Enums creados: video_status, eval_status, question_type,
--   word_status, feature_status
-- =============================================================
