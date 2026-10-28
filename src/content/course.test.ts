import { describe, expect, it } from 'vitest'
import type {
  CompiledLesson,
  CompiledPack,
  CompiledUnit,
} from '../packs/compiled'
import { findLesson, sentencesOf, wordsOf } from './course'

function lesson(id: string): CompiledLesson {
  return {
    id,
    title: `Les ${id}`,
    goals: [['Je kunt iets.']],
    blocks: [{ type: 'explanation', text: ['Uitleg.'], examples: [] }],
    words: [],
    exercises: [],
    status: 'auto-checked',
  }
}

function unit(id: string, order: number, lessons: string[]): CompiledUnit {
  return {
    id,
    title: `Eenheid ${id}`,
    level: 'A1',
    order,
    goals: [['Je kunt iets.']],
    lessons: lessons.map(lesson),
    status: 'auto-checked',
  }
}

const PACK: CompiledPack = {
  id: 'es',
  units: [unit('een', 1, ['a', 'b']), unit('twee', 2, ['c'])],
  words: {
    hola: {
      id: 'hola',
      text: 'hola',
      translations: ['hallo'],
      partOfSpeech: 'interjection',
      status: 'auto-checked',
    },
  },
  sentences: {
    's-hola': {
      id: 's-hola',
      text: 'Hola.',
      translation: 'Hallo.',
      status: 'auto-checked',
    },
  },
}

describe('findLesson', () => {
  it('vindt een les met haar eenheid en plaats', () => {
    const place = findLesson(PACK, 'b')
    expect(place?.unit.id).toBe('een')
    expect(place?.lesson.id).toBe('b')
    expect(place?.number).toBe(2)
  })

  it('kent de vorige en volgende les, ook over eenheden heen', () => {
    expect(findLesson(PACK, 'a')?.previous).toBeUndefined()
    expect(findLesson(PACK, 'a')?.next?.id).toBe('b')
    expect(findLesson(PACK, 'b')?.next?.id).toBe('c')
    expect(findLesson(PACK, 'c')?.previous?.id).toBe('b')
    expect(findLesson(PACK, 'c')?.next).toBeUndefined()
    expect(findLesson(PACK, 'c')?.number).toBe(1)
  })

  it('geeft undefined voor een les die niet bestaat', () => {
    expect(findLesson(PACK, 'bestaat-niet')).toBeUndefined()
  })
})

describe('wordsOf en sentencesOf', () => {
  it('zoekt onderdelen op en slaat onbekende kenmerken over', () => {
    expect(wordsOf(PACK, ['hola', 'onbekend']).map((word) => word.id)).toEqual([
      'hola',
    ])
    expect(sentencesOf(PACK, ['s-hola'])).toHaveLength(1)
    expect(sentencesOf(PACK, [])).toEqual([])
  })
})
