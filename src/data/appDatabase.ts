import { createDatabase, type Database } from './database'

let database: Database | undefined

/** De database van de app, geopend bij de eerste aanroep. */
export function appDatabase(): Database {
  if (database === undefined) {
    const db = createDatabase()
    // Een ander venster heeft de database bijgewerkt voor een nieuwere versie
    // van de app. Dit venster draait nog de oude: herladen haalt de nieuwe op.
    db.on('versionchange', () => {
      db.close()
      window.location.reload()
    })
    database = db
  }
  return database
}
