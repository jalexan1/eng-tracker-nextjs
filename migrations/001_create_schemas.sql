-- =============================================================================
-- Migration 001: Crear PostgreSQL Schemas (namespaces)
-- Plataforma: ENG Tracker — Multi-language Learning Platform
-- Supabase Project: seguridad2053@gmail.com
-- =============================================================================
-- EJECUTAR COMO PRIMER PASO en Supabase SQL Editor
-- NUNCA ejecutar en producción con datos existentes sin backup
-- =============================================================================

-- Crear los 4 schemas de la plataforma
CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS english;
CREATE SCHEMA IF NOT EXISTS spanish;
CREATE SCHEMA IF NOT EXISTS languages;

-- Comentarios de documentación
COMMENT ON SCHEMA shared    IS 'Infraestructura compartida entre todas las apps: perfiles, progreso diario, suscripciones';
COMMENT ON SCHEMA english   IS 'App de Inglés: flashcards SM-2, BBC Learning English, gramática. AISLADO de spanish.';
COMMENT ON SCHEMA spanish   IS 'App de Español: flashcards SM-2, RAE, lectura, gramática. AISLADO de english.';
COMMENT ON SCHEMA languages IS 'Repositorio de contenido lingüístico curado: vocabulario, traducciones, patrones gramaticales.';

-- Verificar creación
SELECT schema_name, schema_owner
FROM information_schema.schemata
WHERE schema_name IN ('shared', 'english', 'spanish', 'languages')
ORDER BY schema_name;
