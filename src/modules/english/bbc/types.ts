/**
 * @file src/modules/english/bbc/types.ts
 * @description Tipos del sub-módulo BBC Learning English (english namespace).
 */

export interface BbcEpisodeWithProgress {
  id:            string
  title:         string
  series:        string
  episodeCode: string
  cefrLevel:     string
  audioUrl:      string | null
  transcriptUrl: string | null
  publishedAt:   Date | null
  // progreso del usuario (null = no iniciado)
  progress: {
    status:          'not_started' | 'in_progress' | 'completed'
    comprehension:   number | null
    lastAccessedAt:  Date | null
  } | null
}

export interface SaveVocabularyInput {
  episodeId:  string
  word:       string
  definition?: string
  context?:   string
  phonetic?:  string
}

export interface UpdateProgressInput {
  episodeId:     string
  status:        'not_started' | 'in_progress' | 'completed'
  comprehension?: number   // 0-100
  notes?:         string
}
