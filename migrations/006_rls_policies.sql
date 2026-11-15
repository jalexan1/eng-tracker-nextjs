-- =============================================================================
-- Migration 006: Row Level Security (RLS)
-- Políticas de seguridad por schema — cada app tiene sus propias políticas
-- =============================================================================
-- Prerequisito: 005_languages_tables.sql ejecutado
-- IMPORTANTE: Ejecutar esto en Supabase SQL Editor con permisos de superuser

-- =============================================================================
-- SCHEMA: shared
-- =============================================================================
ALTER TABLE shared.languages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.app_enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.daily_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.subscriptions    ENABLE ROW LEVEL SECURITY;

-- shared.languages: lectura pública (catálogo de idiomas)
CREATE POLICY "shared_languages_public_read"
  ON shared.languages FOR SELECT
  USING (TRUE);

-- shared.user_profiles: solo el propio usuario
CREATE POLICY "shared_profiles_own_read"
  ON shared.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "shared_profiles_own_insert"
  ON shared.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "shared_profiles_own_update"
  ON shared.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- shared.app_enrollments
CREATE POLICY "shared_enrollments_own_all"
  ON shared.app_enrollments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- shared.daily_progress
CREATE POLICY "shared_progress_own_all"
  ON shared.daily_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- shared.subscriptions: solo lectura propia
CREATE POLICY "shared_subscriptions_own_read"
  ON shared.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- SCHEMA: english — políticas aisladas
-- =============================================================================
ALTER TABLE english.flashcard_decks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.flashcards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.card_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.bbc_episodes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.bbc_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.bbc_vocabulary    ENABLE ROW LEVEL SECURITY;
ALTER TABLE english.grammar_exercises ENABLE ROW LEVEL SECURITY;

-- Decks: CRUD propio
CREATE POLICY "english_decks_own_all"
  ON english.flashcard_decks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Flashcards: CRUD propio
CREATE POLICY "english_cards_own_all"
  ON english.flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Card reviews: INSERT/SELECT propio (nunca UPDATE/DELETE — log inmutable)
CREATE POLICY "english_reviews_own_select"
  ON english.card_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "english_reviews_own_insert"
  ON english.card_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- BBC Episodes: lectura pública (contenido curado por admin)
CREATE POLICY "english_bbc_episodes_public_read"
  ON english.bbc_episodes FOR SELECT
  USING (TRUE);

-- BBC Progress: CRUD propio
CREATE POLICY "english_bbc_progress_own_all"
  ON english.bbc_user_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- BBC Vocabulary: CRUD propio
CREATE POLICY "english_bbc_vocab_own_all"
  ON english.bbc_vocabulary FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grammar: CRUD propio
CREATE POLICY "english_grammar_own_all"
  ON english.grammar_exercises FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SCHEMA: spanish — políticas aisladas (copia intencional de english)
-- =============================================================================
ALTER TABLE spanish.flashcard_decks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE spanish.flashcards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE spanish.card_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE spanish.rae_lookups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE spanish.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spanish.grammar_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spanish_decks_own_all"
  ON spanish.flashcard_decks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spanish_cards_own_all"
  ON spanish.flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spanish_reviews_own_select"
  ON spanish.card_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "spanish_reviews_own_insert"
  ON spanish.card_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spanish_rae_own_all"
  ON spanish.rae_lookups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spanish_reading_own_all"
  ON spanish.reading_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spanish_grammar_own_all"
  ON spanish.grammar_exercises FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SCHEMA: languages — solo lectura para usuarios autenticados
-- (escritura reservada para service_role / admin)
-- =============================================================================
ALTER TABLE languages.vocabulary_bank   ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages.word_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages.grammar_patterns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages.irregular_verbs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages.idioms            ENABLE ROW LEVEL SECURITY;

-- Lectura pública para todos los usuarios autenticados
CREATE POLICY "languages_vocab_auth_read"
  ON languages.vocabulary_bank FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "languages_translations_auth_read"
  ON languages.word_translations FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "languages_grammar_auth_read"
  ON languages.grammar_patterns FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "languages_verbs_auth_read"
  ON languages.irregular_verbs FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "languages_idioms_auth_read"
  ON languages.idioms FOR SELECT
  TO authenticated USING (TRUE);

-- =============================================================================
-- GRANTS: permisos para el rol anon y authenticated de Supabase
-- =============================================================================

-- shared
GRANT USAGE ON SCHEMA shared TO anon, authenticated;
GRANT SELECT ON shared.languages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON shared.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.app_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.daily_progress TO authenticated;
GRANT SELECT ON shared.subscriptions TO authenticated;

-- english
GRANT USAGE ON SCHEMA english TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA english TO authenticated;

-- spanish
GRANT USAGE ON SCHEMA spanish TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA spanish TO authenticated;

-- languages (solo lectura para usuarios)
GRANT USAGE ON SCHEMA languages TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA languages TO authenticated;
