/**
 * @file src/modules/spanish/index.ts
 * @description Barrel export del módulo Spanish completo.
 *
 * ARQUITECTURA: Este módulo es COMPLETAMENTE AISLADO.
 * - Solo importa de @lib/db (spanish namespace)
 * - NUNCA importa de @english/* ni de src/modules/english/*
 * - SM2Algorithm es COPIA PROPIA — no compartida con english
 */
export * from './decks'
export * from './rae'
