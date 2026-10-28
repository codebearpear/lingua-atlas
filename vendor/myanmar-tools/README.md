# myanmar-tools (kopie)

Deze map bevat de Zawgyi-herkenning en de Zawgyi-omzetter van [myanmar-tools](https://github.com/google/myanmar-tools) van Google, versie 1.2.0. De controle van de taalpakketten gebruikt ze om Birmaanse tekst in Zawgyi-codering te vinden (`src/packs/scripts.ts`). De app zelf gebruikt ze niet.

## Waarom een kopie

Het npm-pakket `myanmar-tools` 1.2.0 bevat de broncode, het model en de omzetregels, maar niet de gebouwde bestanden waar het zelf naar verwijst. In Node werkt het daardoor niet. Deze map bevat die gebouwde bestanden.

## Hoe gebouwd

Op 28 oktober 2026 uit de bestanden van het npm-pakket, met dezelfde stappen als de `gulpfile.js` daarin:

- het model (`resources/zawgyiUnicodeModel.dat`) als base64 in `zawgyi_detector.js`;
- de omzetregels (`resources/Z2U.js`, `U2Z.js` en `ZNorm.js`) in `zawgyi_converter.js`;
- de variant voor de browser, die ook in Node werkt;
- van TypeScript naar JavaScript vertaald, als ES-modules.

Aan de code zelf is niets veranderd. De tests van myanmar-tools zelf (de map `spec` in het npm-pakket) slagen met deze bestanden: 7 tests met 602 controles.

`index.js` en `index.d.ts` zijn van Lingua Atlas: ze bundelen de twee onderdelen en geven de typen.

## Licentie

Apache License 2.0, copyright 2017 Google LLC. Zie [`LICENSE`](LICENSE).
