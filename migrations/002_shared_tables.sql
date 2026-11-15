-- =============================================================================
-- Migration 002: Tablas del schema SHARED
-- =============================================================================
-- Prerequisito: 001_create_schemas.sql ejecutado

-- Tipos ENUM en schema shared
CREATE TYPE shared.cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE shared.app_name   AS ENUM ('english', 'spanish', 'french', 'german', 'portuguese');

-- ---------------------------------------------------------------------------
-- shared.languages — catálogo de idiomas soportados
-- ---------------------------------------------------------------------------
CREATE TABLE shared.languages (
  code         TEXT        PRIMARY KEY,               -- 'en', 'es', 'fr'
  name         TEXT        NOT NULL,                  -- 'English'
  native_name  TEXT        NOT NULL,                  -- 'English'
  flag_emoji   TEXT,                                  -- '🇬🇧'
  is_active    BOOLEAN     DEFAULT TRUE,
  sort_order   SMALLINT    DEFAULT 0
);

COMMENT ON TABLE shared.languages IS 'Catálogo de idiomas soportados por la plataforma';

-- ---------------------------------------------------------------------------
-- shared.user_profiles — un perfil por usuario Supabase Auth
-- ---------------------------------------------------------------------------
CREATE TABLE shared.user_profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  avatar_url          TEXT,
  preferred_language  TEXT        DEFAULT 'en' REFERENCES shared.languages(code),
  timezone            TEXT        DEFAULT 'America/Bogota',
  study_streak_days   INTEGER     DEFAULT 0,
  longest_streak_days INTEGER     DEFAULT 0,
  last_studied_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX shared_user_profiles_id_idx ON shared.user_profiles(id);
COMMENT ON TABLE shared.user_profiles IS 'Perfil global del usuario — independiente de la app que esté usando';

-- ---------------------------------------------------------------------------
-- shared.app_enrollments — apps activas del usuario
-- ---------------------------------------------------------------------------
CREATE TABLE shared.app_enrollments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name             shared.app_name NOT NULL,
  cefr_level           shared.cefr_level DEFAULT 'B1',
  target_level         shared.cefr_level DEFAULT 'C1',
  daily_goal_minutes   INTEGER     DEFAULT 60,
  enrolled_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active            BOOLEAN     DEFAULT TRUE,
  UNIQUE (user_id, app_name)
);

CREATE INDEX shared_app_enrollments_user_idx ON shared.app_enrollments(user_id);

-- ---------------------------------------------------------------------------
-- shared.daily_progress — métricas diarias agregadas por app
-- ---------------------------------------------------------------------------
CREATE TABLE shared.daily_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name          shared.app_name NOT NULL,
  study_date        DATE        NOT NULL,
  minutes_studied   INTEGER     DEFAULT 0,
  cards_reviewed    INTEGER     DEFAULT 0,
  cards_correct     INTEGER     DEFAULT 0,
  lessons_completed INTEGER     DEFAULT 0,
  streak_day        INTEGER     DEFAULT 0,
  xp_earned         INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, app_name, study_date)
);

CREATE INDEX shared_daily_progress_user_idx ON shared.daily_progress(user_id);
CREATE INDEX shared_daily_progress_date_idx ON shared.daily_progress(study_date);

-- ---------------------------------------------------------------------------
-- shared.subscriptions — monetización futura
-- ---------------------------------------------------------------------------
CREATE TABLE shared.subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name     shared.app_name,                       -- NULL = all apps
  plan         TEXT        NOT NULL DEFAULT 'free',   -- 'free', 'pro', 'enterprise'
  valid_from   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  valid_until  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX shared_subscriptions_user_idx ON shared.subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION shared.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON shared.user_profiles
  FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at();

CREATE TRIGGER trg_daily_progress_updated_at
  BEFORE UPDATE ON shared.daily_progress
  FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: auto-create user_profile al registrar usuario en Supabase Auth
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION shared.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shared.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION shared.handle_new_auth_user();
