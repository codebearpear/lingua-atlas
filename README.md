# Lingua Atlas

Persoonlijke taalleerapp voor de iPad, met Nederlands als instructietaal. De app is in ontwikkeling.

- App: <https://codebearpear.github.io/lingua-atlas/>
- Talen: Engels, Duits, Spaans, Koreaans, Hindi, Perzisch en Birmaans

## Werken aan het project

Typ deze opdrachten in de terminal van VS Code, in de map `C:\Projecten\lingua-atlas`.

| Opdracht            | Wat het doet                                                                   |
| ------------------- | ------------------------------------------------------------------------------ |
| `npm run klaar`     | Installeren, opmaken, alles controleren, vastleggen en publiceren              |
| `npm run dev`       | Ontwikkelversie op `http://localhost:5173/lingua-atlas/`; stoppen met Ctrl + C |
| `npm run check`     | Alleen alle controles                                                          |
| `npm run test`      | Alleen de tests                                                                |
| `npm run pakketten` | Alleen de controle van de taalpakketten                                        |

`npm run klaar` legt alleen iets vast en publiceert alleen als alle controles slagen. Het verslag van de laatste keer staat in `.claude-verslag/laatste.txt`.

## Taalpakketten

Elke taal heeft een eigen pakket in `content/packs/<taal>/`:

| Bestand                               | Inhoud                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| `pack.json`                           | Taal, schrift, schrijfrichting, niveaukader en licentie |
| `sources.json`                        | De bronnen waar onderdelen naar verwijzen               |
| `vocabulary.json` en `sentences.json` | Woorden en zinnen (komen later)                         |
| `units/<eenheid>.json`                | Eenheden met lessen en oefeningen (komen later)         |

Het formaat staat in `src/packs/schema.ts`, de regels in `src/packs/check.ts`. `npm run pakketten` controleert alle pakketten, ook binnen `npm run check` en op GitHub. Een fout houdt publicatie tegen; een waarschuwing niet, maar het onderdeel blijft dan op Concept staan.

De controle kijkt ook per taal naar het schrift: tekst in de doeltaal hoort in het eigen schrift te staan, met bijvoorbeeld de Perzische ی en ک en de halve spatie, de danda in het Hindi, ¿ en ¡ in het Spaans, en geen tekens die op Zawgyi-codering wijzen in het Birmaans.

Elk onderdeel heeft een validatiestatus:

- **Concept:** opgesteld, nog niet gecontroleerd.
- **Automatisch gecontroleerd:** doorstaat alle controles zonder waarschuwing. Dat zegt iets over de vorm, niet over de taal zelf.
- **Bron-geverifieerd:** nagelopen tegen een genoemde gezaghebbende bron.
- **Expert-beoordeeld:** beoordeeld door een gekwalificeerde mens, met naam, kwalificatie en datum.

## Licenties

- **Code:** MIT-licentie, zie [`LICENSE`](LICENSE).
- **Lesinhoud** in `content/`: CC BY-NC-SA 4.0, zie [`content/LICENSE.md`](content/LICENSE.md). Onderdelen van anderen houden hun eigen licentie; die staat per onderdeel in het pakket.
- **Lettertypen:** SIL Open Font License 1.1, meegeleverd via de Fontsource-pakketten.

## Techniek

React, TypeScript en Vite, als installeerbare webapp (PWA) via vite-plugin-pwa. Opmaak met Tailwind CSS, in de stijl van Apple (Human Interface Guidelines); de kleuren en tekststijlen staan in `src/index.css`. Taalpakketten gecontroleerd met Zod. Tests met Vitest. GitHub Actions controleert elke wijziging en publiceert naar GitHub Pages.
