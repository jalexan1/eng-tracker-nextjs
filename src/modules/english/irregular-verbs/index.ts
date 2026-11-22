/**
 * @file src/modules/english/irregular-verbs/index.ts
 * @description Barrel exports — módulo Verbos Irregulares (inglés)
 */
export { IrregularVerbsHub }  from './components/IrregularVerbsHub'
export { VideoLearning }      from './components/VideoLearning'
export { IRREGULAR_VERBS, GROUP_LABELS, GROUP_ORDER, VERB_COUNT, FROM_RAP_COUNT } from './data/irregular-verbs'
export type { IrregularVerb, VerbGroup } from './data/irregular-verbs'
