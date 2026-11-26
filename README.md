# aMarti ceramics

Sito di aMarti ceramics, laboratorio di ceramica e workshop a Rovereto:
calendario dei corsi, pagina di ogni evento (con file `.ics`) e negozio.

**Anteprima:** https://fora00.github.io/amarti/ (non indicizzata: prezzi e dominio sono ancora provvisori).

| Cartella | Cosa |
|---|---|
| `site/` | Sito pubblico (Astro, zero JavaScript). Eventi in `site/src/content/eventi/`. |
| `app/` | Dashboard privata per seguire le iscrizioni, pubblicata su `/dashboard/` (accesso con link via email, che resta salvato). |
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

### Provare le iscrizioni in locale

Una copia di Supabase sul proprio computer, separata dai dati veri. Serve Docker
acceso e la [CLI di Supabase](https://supabase.com/docs/guides/cli).

```sh
echo 'LOCAL_STAFF_EMAIL=tua@email.it' >> backend/.env.local   # chi può entrare nella dashboard locale
pnpm backend:local          # avvia Supabase locale, applica lo schema, scrive i .env.development
pnpm dev                    # sito su http://localhost:4321 → compila "Prenota" su un evento
pnpm dev:app                # dashboard su http://localhost:4322 → accedi con il link
```

Le email con il link di accesso non partono: si leggono nella casella locale
(Mailpit, l'indirizzo è stampato da `pnpm backend:local`). `pnpm backend:local reset`
svuota iscrizioni e messaggi, `pnpm backend:local stop` ferma i container.
`.env.development` vale solo per `pnpm dev`: `pnpm build` e GitHub Pages usano
sempre il progetto Supabase vero.

Ogni push su `main` ricostruisce e pubblica il sito con GitHub Actions
(`.github/workflows/pages.yml`).
