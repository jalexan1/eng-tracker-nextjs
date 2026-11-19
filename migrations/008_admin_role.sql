-- =============================================================================
-- Migration 008: Columna role en shared.user_profiles
-- =============================================================================

-- Agregar columna role
ALTER TABLE shared.user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'superadmin'));

COMMENT ON COLUMN shared.user_profiles.role IS 'Rol del usuario: user | admin | superadmin';

-- Crear el primer superadmin (reemplaza el email si es diferente)
-- IMPORTANTE: El usuario debe haberse registrado primero en la app
-- Este UPDATE se puede correr después del primer registro
 UPDATE shared.user_profiles
   SET role = 'superadmin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'seguridad2053@gmail.com');
