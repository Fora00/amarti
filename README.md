# aMarti ceramics

Sito di aMarti ceramics, laboratorio di ceramica e workshop a Rovereto:
calendario dei corsi, pagina di ogni evento (con file `.ics`) e negozio.

**Anteprima:** https://fora00.github.io/amarti/ (non indicizzata: prezzi e dominio sono ancora provvisori).

| Cartella | Cosa |
|---|---|
| `site/` | Sito pubblico (Astro, zero JavaScript). Eventi in `site/src/content/eventi/`. |
| `app/` | Area privata per seguire le iscrizioni (in lavorazione). |
| `backend/` | Supabase (schema, edge functions) e un backend finto per lo sviluppo locale. |
| `vendor/` | Codice condiviso copiato da un altro repo: non si modifica qui. |

## Comandi

Serve Node 20.12+ e pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev        # sito su http://localhost:4321
pnpm check
pnpm build
```

Ogni push su `main` ricostruisce e pubblica il sito con GitHub Actions
(`.github/workflows/pages.yml`).
