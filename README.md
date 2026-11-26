# aMarti ceramics

Sito di aMarti ceramics, laboratorio di ceramica e workshop a Rovereto:
calendario dei corsi, pagina di ogni evento (con file `.ics` e modulo di
iscrizione "Prenota") e negozio. Le iscrizioni si seguono in una dashboard privata.

- **Sito (anteprima):** https://fora00.github.io/amarti/ (non indicizzato: prezzi e dominio sono ancora provvisori)
- **Dashboard:** https://fora00.github.io/amarti/dashboard/ (link "Dashboard" in fondo a ogni pagina)

| Cartella | Cosa |
|---|---|
| `site/` | Sito pubblico (Astro). Quasi zero JavaScript: solo il pulsante tema chiaro/scuro e la copia del messaggio Instagram. Eventi in `site/src/content/eventi/`. |
| `app/` | Dashboard privata: iscritti per corso, stato (iscritta, confermata, pagato, attesa, annullata), scorciatoie WhatsApp/email. Pubblicata su `/dashboard/`; si entra con un link via email, una volta per dispositivo. |
| `backend/` | Supabase: `schema.sql` (tabelle e regole di accesso), edge functions `signup` e `request`, script per lo stack locale. |
| `vendor/` | Codice condiviso copiato da un altro repo: non si modifica qui. |

## Comandi

Serve Node 20.12+ e pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev        # sito su http://localhost:4321
pnpm dev:app    # dashboard su http://localhost:4322
pnpm check      # tipi (sito e dashboard)
pnpm test       # test di backend e codice condiviso
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

## Pubblicazione

Ogni push su `main` ricostruisce sito e dashboard e li pubblica su GitHub Pages
(`.github/workflows/pages.yml`). Il workflow legge due **variabili** del repo
(Settings → Secrets and variables → Actions → Variables, non segreti: sono
pubbliche per natura): `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`.

La parte Supabase non passa dal workflow: si aggiorna dalla cartella `backend/`
con la CLI (`supabase link` al progetto, una volta).

```sh
supabase db query --remote -f supabase/schema.sql   # tabelle e regole (idempotente)
supabase functions deploy signup                    # e/o request
supabase config push                                # accesso: link via email, URL di ritorno
supabase secrets set SITE_URL=https://…             # dove la funzione rimanda dopo l'invio
```

Chi può entrare nella dashboard: un utente in Supabase Auth (le registrazioni
libere sono disattivate) **e** la sua email nella tabella `staff`. Mai mettere la
chiave `service_role`/`secret` in una variabile `PUBLIC_` o in un file committato.
