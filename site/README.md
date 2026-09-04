# Sito Paolo Riva (Astro + blog + Sveltia CMS)

Sito personale a **tre colonne**: bio | blog | libri. Gli articoli si scrivono dal browser tramite Sveltia CMS, senza aprire Cursor.

## Avvio in locale

```bash
cd site
npm install
npm run dev
```

Apri http://localhost:4321 — pannello scrittura: http://localhost:4321/admin/

## Scrivere articoli (senza Cursor)

1. Pubblica il sito su GitHub Pages (workflow già pronto).
2. Vai su `https://TUO-DOMINIO/admin/`
3. Accedi con GitHub (Personal Access Token con permesso *Contents: Read and write* sul repo).
4. Crea/modifica articoli nella collezione **Blog** e salva: il CMS fa commit sul repo e il sito si aggiorna da solo.

## Link anteprima → Google Drive

Tutti i pulsanti **Richiedi anteprima** usano un unico URL.

Modifica in `src/data/site.ts` la proprietà `previewRequestUrl` e incolla il link del tuo foglio (o del form Google collegato al foglio).

## Contenuti del sito

| Cosa | Dove |
|------|------|
| Bio, social, libri, link anteprima | `src/data/site.ts` |
| Articoli del blog | `src/content/blog/*.md` |
| Config CMS | `public/admin/config.yml` |

## Deploy GitHub Pages

1. Push del repo `warhamster8/PaoloRiva` sul branch `main`.
2. In **Settings → Pages**: Source = **GitHub Actions**.
3. Il workflow `.github/workflows/deploy-site.yml` builda la cartella `site/` e pubblica.

Se usi il dominio `paoloriva.site`, collega il custom domain nelle impostazioni Pages.

## Repo CMS

In `public/admin/config.yml` è impostato `repo: warhamster8/PaoloRiva`. Se cambi nome o owner del repository, aggiorna anche quello.
