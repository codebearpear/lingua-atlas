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
| `vocabulary.json` en `sentences.json` | Woorden en zinnen                                       |
| `units/<eenheid>.json`                | Eenheden met lessen en oefeningen                       |

Het Spaanse pakket bevat een eerste voorbeeld: de eenheid Begroeten en voorstellen, met twee lessen. Lessen volgen kan nog niet; dat komt in een latere fase.

Het formaat staat in `src/packs/schema.ts`, de regels in `src/packs/check.ts`. `npm run pakketten` controleert alle pakketten, ook binnen `npm run check` en op GitHub. Een fout houdt publicatie tegen; een waarschuwing niet, maar het onderdeel blijft dan op Concept staan.

De controle kijkt ook per taal naar het schrift: tekst in de doeltaal hoort in het eigen schrift te staan, met bijvoorbeeld de Perzische ی en ک en de halve spatie, de danda in het Hindi, ¿ en ¡ in het Spaans, en in het Birmaans Unicode in plaats van Zawgyi. Zawgyi herkent de controle met [myanmar-tools](https://github.com/google/myanmar-tools) van Google; een kopie daarvan staat in `vendor/myanmar-tools`.

Elk onderdeel heeft een validatiestatus:

- **Concept:** opgesteld, nog niet gecontroleerd.
- **Automatisch gecontroleerd:** doorstaat alle controles zonder waarschuwing. Dat zegt iets over de vorm, niet over de taal zelf.
- **Bron-geverifieerd:** nagelopen tegen een genoemde gezaghebbende bron.
- **Expert-beoordeeld:** beoordeeld door een gekwalificeerde mens, met naam, kwalificatie en datum.

In de app staat onder Instellingen, bij Taalpakketten, per taal wat het pakket bevat en welke status het heeft. Dat is de laagste status van alles in het pakket, zodat de app nooit meer belooft dan voor elk onderdeel geldt.

## Je gegevens

Lingua Atlas bewaart alles op je eigen apparaat, in de database van de browser (IndexedDB, via Dexie; zie `src/data/database.ts`). Er gaat niets naar een server. Onder Instellingen zie je:

- **Opslag:** hoeveel ruimte de app gebruikt, de bovengrens van de browser en of de browser je gegevens blijvend bewaart. De geïnstalleerde app vraagt dat bij het opstarten zelf aan.
- **Foutenlogboek:** gaat er iets mis, dan komt de melding hier. Kopieer het logboek en geef het aan Claude. Loopt de app vast, dan zie je een uitleg in plaats van een leeg scherm.
- **Versie:** de commit waaruit GitHub de app heeft gebouwd.

## Licenties

- **Code:** MIT-licentie, zie [`LICENSE`](LICENSE).
- **Lesinhoud** in `content/`: CC BY-NC-SA 4.0, zie [`content/LICENSE.md`](content/LICENSE.md). Onderdelen van anderen houden hun eigen licentie; die staat per onderdeel in het pakket.
- **Lettertypen:** SIL Open Font License 1.1, meegeleverd via de Fontsource-pakketten.
- **Code van anderen** in `vendor/`: myanmar-tools van Google, Apache License 2.0, zie [`vendor/myanmar-tools`](vendor/myanmar-tools). Alleen voor de controle van de taalpakketten, niet in de app.

## Techniek

React, TypeScript en Vite, als installeerbare webapp (PWA) via vite-plugin-pwa. Opmaak met Tailwind CSS, in de stijl van Apple (Human Interface Guidelines); de kleuren en tekststijlen staan in `src/index.css`. Gegevens in IndexedDB via Dexie. Taalpakketten gecontroleerd met Zod. Tests met Vitest en fake-indexeddb. GitHub Actions controleert elke wijziging en publiceert naar GitHub Pages.
