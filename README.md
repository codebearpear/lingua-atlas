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

Het Spaanse pakket bevat een eerste voorbeeld: de eenheid Begroeten en voorstellen, met twee lessen.

Het formaat staat in `src/packs/schema.ts`, de regels in `src/packs/check.ts`. `npm run pakketten` controleert alle pakketten, ook binnen `npm run check` en op GitHub. Een fout houdt publicatie tegen; een waarschuwing niet, maar het onderdeel blijft dan op Concept staan.

In Nederlandse tekst, zoals uitleg, doelen, notities en de teksten van oefeningen, staat de doeltaal tussen sterretjes: `*Hola* betekent hallo.` De app toont die woorden in de taal en schrijfrichting van het pakket, cursief bij het Latijnse schrift, zodat het lettertype, de richting en voorlezen kloppen. Een foute vorm die de uitleg wil laten zien, staat tussen tildes: `Schrijf niet ~adios~, maar *adiós*.` De app streept die rood door. Een sterretje of tilde als gewoon teken schrijf je als `\*` of `\~` (in JSON `\\*` en `\\~`).

De controle kijkt ook per taal naar het schrift: tekst in de doeltaal hoort in het eigen schrift te staan, met bijvoorbeeld de Perzische ی en ک en de halve spatie, de danda in het Hindi, ¿ en ¡ in het Spaans, en in het Birmaans Unicode in plaats van Zawgyi. Zawgyi herkent de controle met [myanmar-tools](https://github.com/google/myanmar-tools) van Google; een kopie daarvan staat in `vendor/myanmar-tools`.

De regels voor het schrift gelden ook voor doeltaal tussen sterretjes, niet voor foute vormen tussen tildes. Bij talen met een eigen schrift waarschuwt de controle als er tekst in dat schrift zonder markering in Nederlandse tekst staat.

Elk onderdeel heeft een validatiestatus:

- **Concept:** opgesteld, nog niet gecontroleerd.
- **Automatisch gecontroleerd:** doorstaat alle controles zonder waarschuwing. Dat zegt iets over de vorm, niet over de taal zelf.
- **Bron-geverifieerd:** nagelopen tegen een genoemde gezaghebbende bron.
- **Expert-beoordeeld:** beoordeeld door een gekwalificeerde mens, met naam, kwalificatie en datum.

In de app staat onder Instellingen, bij Taalpakketten, per taal wat het pakket bevat en welke status het heeft. Dat is de laagste status van alles in het pakket, zodat de app nooit meer belooft dan voor elk onderdeel geldt.

## Lessen

Tik in het overzicht op een taal voor de cursus: de eenheden op volgorde, elk met haar lessen. Een les toont wat je leert, de uitleg met voorbeeldzinnen, cultuur, de woorden met hun vertaling en de oefeningen die erbij horen.

Elke les en eenheid toont haar status. Die van een les is de laagste van de les zelf en alles wat ze toont: woorden, voorbeeldzinnen en oefeningen. Die van een eenheid is de laagste van de eenheid en haar lessen.

Bij het bouwen zet een Vite-plug-in (`scripts/packs.ts`) elk gecontroleerd pakket om in een lespakket voor de app (`src/packs/compile.ts`). De app laadt het lespakket van een taal pas als je die taal opent; de service worker bewaart het, zodat lessen ook zonder internet werken.

## Oefenen

Op de pagina van een les staat een knop om te oefenen. Je doet de oefeningen van de les na elkaar: meerkeuze en getypte antwoorden. Onder het invoerveld staan knoppen voor tekens die op een Nederlands toetsenbord lastig zijn, zoals á, ñ en ¿ voor het Spaans en ä en ß voor het Duits; voor een taal met een eigen schrift gebruik je het toetsenbord van die taal. Na elk antwoord zie je het oordeel met uitleg. Is je antwoord goed, maar staat het niet in de sleutel, dan tik je op Mijn antwoord klopt toch. Aan het eind zie je per oefening wat je antwoordde.

De app bewaart de ronde na elk antwoord op je apparaat, ook als je halverwege stopt (`src/data/rounds.ts`). Bij elk antwoord staat het oordeel en wat de oefening toetste: welke woorden of zinnen, in welke richting en op welke manier. De lespagina toont je laatste afgeronde ronde. De rondes gaan mee in de back-up, en elk antwoord telt mee voor je herhaalkaarten.

## Herhalen

Elk woord en elke zin die je oefent, krijgt een herhaalkaart: een voor herkennen en een voor zelf maken (`src/engine/memory.ts`). Zelf maken is alleen een getypt antwoord in de doeltaal. Bij meerkeuze kies je de doeltaal, maar maak je hem niet zelf, dus dat telt als herkennen.

Wanneer een kaart terugkomt, berekent [FSRS](https://github.com/open-spaced-repetition/awesome-fsrs), versie 6, via de bibliotheek [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) 5.4.2 met de standaardinstellingen van de makers:

- een kaart komt terug als de kans dat je hem nog weet, gedaald is tot 90%;
- een nieuwe of vergeten kaart komt eerst na 1 en 10 minuten nog eens terug;
- goed telt als Good, bijna goed als Hard en fout als Again; een zelf goedgekeurd antwoord telt als goed.

De kaarten worden niet apart bewaard. De app berekent ze uit al je antwoorden, in volgorde van tijd. Daardoor kloppen ze ook na het samenvoegen van back-ups van twee apparaten, en kan een nieuwer model later dezelfde geschiedenis opnieuw doorrekenen. Een jaar dagelijks oefenen (zo'n 22.000 antwoorden) kost ongeveer 0,2 seconde rekenwerk; wordt dat te veel, dan bewaart de app later tussenstanden.

Een kaart in de leerfase komt op de minuut terug. Een gewone kaart kun je de hele dag herhalen waarop hij aan de beurt is. In het overzicht staat onder Vandaag per taal wat je nu kunt herhalen en wanneer de rest terugkomt; op de lespagina staat het per woord. Herhalen in de app komt in de volgende stap.

## Antwoordcontrole

De app beoordeelt een antwoord als goed, bijna goed of fout (`src/engine/answers.ts`).

- **Goed:** hoofdletters, leestekens en de soort aanhalingsteken tellen niet mee. Valt er iets op, zoals een ontbrekend ¿ in het Spaans of een spatie in het Koreaans, dan volgt een opmerking.
- **Bijna goed:** je kende het antwoord, maar de vorm wijkt af: een ontbrekend accent (adios voor adiós), letters van een ander toetsenbord (de Arabische ك voor de Perzische ک) of een kleine tikfout. Korte woorden krijgen geen ruimte voor tikfouten, want die worden snel een ander woord; in het Koreaans telt de app per jamo. In het Duits tellen hoofdletters mee, behalve aan het begin van een zin.
- **Fout:** iets anders dan gevraagd. Staan de goede woorden in de verkeerde volgorde, dan zegt de uitleg dat.

Bekende foute antwoorden in het pakket krijgen hun eigen uitleg en fouttype. Antwoorden in het Nederlands, bij herkennen, beoordeelt de app milder: een tikfout of een lidwoord meer of minder telt als goed, want daar toets je of je de doeltaal begrijpt.

## Je gegevens

Lingua Atlas bewaart alles op je eigen apparaat, in de database van de browser (IndexedDB, via Dexie; zie `src/data/database.ts`). Er gaat niets naar een server. Onder Instellingen zie je:

- **Opslag:** hoeveel ruimte de app gebruikt, de bovengrens van de browser en of de browser je gegevens blijvend bewaart. De geïnstalleerde app vraagt dat bij het opstarten zelf aan.
- **Back-up:** één bestand met je instellingen en je oefenrondes, om buiten de app te bewaren. Op de pc download je het; op de iPad kun je het delen en in Bestanden bewaren. Bij terugzetten controleert de app het bestand en laat zien wat erin staat, voordat er iets verandert. Het formaat staat in [`docs/backup-format.md`](docs/backup-format.md).
- **Foutenlogboek:** gaat er iets mis, dan komt de melding hier. Kopieer het logboek en geef het aan Claude. Loopt de app vast, dan zie je een uitleg in plaats van een leeg scherm.
- **Versie:** de commit waaruit GitHub de app heeft gebouwd.

## Licenties

- **Code:** MIT-licentie, zie [`LICENSE`](LICENSE).
- **Lesinhoud** in `content/`: CC BY-NC-SA 4.0, zie [`content/LICENSE.md`](content/LICENSE.md). Onderdelen van anderen houden hun eigen licentie; die staat per onderdeel in het pakket.
- **Lettertypen:** SIL Open Font License 1.1, meegeleverd via de Fontsource-pakketten.
- **Herhaalplanning:** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) van Open Spaced Repetition, MIT-licentie, via npm.
- **Code van anderen** in `vendor/`: myanmar-tools van Google, Apache License 2.0, zie [`vendor/myanmar-tools`](vendor/myanmar-tools). Alleen voor de controle van de taalpakketten, niet in de app.

## Techniek

React, TypeScript en Vite, als installeerbare webapp (PWA) via vite-plugin-pwa. Opmaak met Tailwind CSS, in de stijl van Apple (Human Interface Guidelines); de kleuren en tekststijlen staan in `src/index.css`. Gegevens in IndexedDB via Dexie. Herhaalplanning met FSRS-6 via ts-fsrs. Taalpakketten gecontroleerd met Zod. Tests met Vitest en fake-indexeddb. GitHub Actions controleert elke wijziging en publiceert naar GitHub Pages.
