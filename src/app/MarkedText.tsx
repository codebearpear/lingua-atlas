import { Fragment } from 'react'
import type { Language } from '../content/languages'
import type { InlineText } from '../packs/compiled'

/**
 * Nederlandse tekst met de doeltaal erin (zie src/packs/inline.ts). De
 * doeltaal krijgt de taal en schrijfrichting van het pakket, zodat het
 * lettertype, de richting en voorlezen kloppen. In het Latijnse schrift staat
 * ze cursief, zoals in een leerboek; een ander schrift valt zelf al op. Een
 * foute vorm is rood doorgestreept.
 */
export function MarkedText({
  text,
  language,
}: {
  text: InlineText
  language: Language
}) {
  const style = language.scriptCode === 'Latn' ? 'italic' : 'not-italic'
  return text.map((part, index) => {
    if (typeof part === 'string') {
      return <Fragment key={index}>{part}</Fragment>
    }
    if (part.kind === 'target') {
      return (
        <i
          key={index}
          lang={language.locale}
          dir={language.direction}
          className={style}
        >
          {part.text}
        </i>
      )
    }
    return (
      <Fragment key={index}>
        <s
          lang={language.locale}
          dir={language.direction}
          className={`${style} decoration-destructive decoration-2`}
        >
          {part.text}
        </s>
        <span className="sr-only"> (fout)</span>
      </Fragment>
    )
  })
}
