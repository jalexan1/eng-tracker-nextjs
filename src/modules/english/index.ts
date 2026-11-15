/**
 * @file src/modules/english/index.ts
 * @description Barrel export del módulo English completo.
 *
 * ARQUITECTURA: Este módulo es COMPLETAMENTE AISLADO.
 * - Solo importa de @lib/db (english namespace)
 * - NUNCA importa de @spanish/* ni de src/modules/spanish/*
 * - SM2Algorithm es propiedad exclusiva de este módulo
 */
export * from './decks'
export * from './bbc'
