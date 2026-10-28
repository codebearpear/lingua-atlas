# Het back-upbestand van Lingua Atlas

Een back-up is één JSON-bestand in UTF-8, met een naam als `lingua-atlas-backup-2026-10-28-1230.json`. Dit document beschrijft formaatversie 1. De code staat in `src/data/backup.ts`; houd die twee gelijk.

## Voorbeeld

```json
{
  "format": "lingua-atlas-backup",
  "formatVersion": 1,
  "createdAt": "2026-10-28T11:30:00.000Z",
  "app": { "version": "f9208d5" },
  "database": { "version": 1 },
  "settings": { "theme": "dark" },
  "tables": {},
  "checksum": {
    "algorithm": "SHA-256",
    "value": "…64 hexadecimale tekens…"
  }
}
```

## Velden

| Veld               | Betekenis                                                                               |
| ------------------ | --------------------------------------------------------------------------------------- |
| `format`           | Altijd `lingua-atlas-backup`.                                                           |
| `formatVersion`    | De versie van dit bestandsformaat, nu `1`.                                              |
| `createdAt`        | Wanneer de back-up is gemaakt, in UTC (ISO 8601).                                       |
| `app.version`      | De versie van de app die de back-up maakte: de commit bij GitHub, of `lokaal`.          |
| `database.version` | De versie van de database (zie `src/data/database.ts`) waar de gegevens uit komen.      |
| `settings`         | Instellingen buiten de database. Nu alleen `theme`: `system`, `light` of `dark`.        |
| `tables`           | Per tabel van de database een lijst met records, precies zoals ze in de database staan. |
| `checksum`         | Het controlegetal, zie hieronder.                                                       |

Welke tabellen meegaan, staat in `BACKUP_TABLES` in `src/data/backupStore.ts`. Het foutenlogboek en de gegevens over de database zelf horen bij het apparaat en gaan niet mee. In database versie 1 zijn er nog geen tabellen met jouw gegevens, dus `tables` is leeg.

## Het controlegetal

`checksum.value` is de SHA-256 van het bestand zonder het veld `checksum`, in kleine hexadecimale tekens. De tekst die daarvoor telt:

1. Haal `checksum` uit het object.
2. Schrijf de rest als JSON zonder spaties of regeleinden, met de sleutels van elk object op volgorde van hun UTF-16-code-eenheden. Lijsten houden hun volgorde.
3. Neem de SHA-256 van die tekst als UTF-8.

Inspringing en de volgorde van de sleutels in het bestand tellen dus niet mee; elke andere wijziging wel. Het controlegetal ontdekt een beschadigd of half opgeslagen bestand. Het is geen beveiliging: wie het bestand aanpast, kan ook een nieuw controlegetal uitrekenen.

## Versies

- Een bestand met een hogere `formatVersion` of `database.version` dan de app kent, weigert de app: werk dan eerst de app bij.
- Komt er een nieuwe formaatversie, dan blijft de app de oudere versies lezen.
- Komt er een nieuwe databaseversie, dan zet de app de gegevens uit een oudere back-up bij het herstellen om, met dezelfde stappen als de database zelf.
