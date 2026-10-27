# Lingua Atlas

Persoonlijke taalleerapp voor de iPad, met Nederlands als instructietaal. De app is in ontwikkeling.

- App: <https://codebearpear.github.io/lingua-atlas/>
- Talen: Engels, Duits, Spaans, Koreaans, Hindi, Perzisch en Birmaans

## Werken aan het project

Typ deze opdrachten in de terminal van VS Code, in de map `C:\Projecten\lingua-atlas`.

| Opdracht        | Wat het doet                                                                   |
| --------------- | ------------------------------------------------------------------------------ |
| `npm run klaar` | Installeren, opmaken, alles controleren, vastleggen en publiceren              |
| `npm run dev`   | Ontwikkelversie op `http://localhost:5173/lingua-atlas/`; stoppen met Ctrl + C |
| `npm run check` | Alleen alle controles                                                          |
| `npm run test`  | Alleen de tests                                                                |

`npm run klaar` legt alleen iets vast en publiceert alleen als alle controles slagen. Het verslag van de laatste keer staat in `.claude-verslag/laatste.txt`.

## Techniek

React, TypeScript en Vite, als installeerbare webapp (PWA) via vite-plugin-pwa. Opmaak met Tailwind CSS, in de stijl van Apple (Human Interface Guidelines); de kleuren en tekststijlen staan in `src/index.css`. Tests met Vitest. GitHub Actions controleert elke wijziging en publiceert naar GitHub Pages.
