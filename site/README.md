# Sito Paolo Riva (Astro)

Homepage attuale: **bio + catalogo libri** (senza blog in home).

La versione con blog al centro è salvata sul branch GitHub `feature/blog`.

## Avvio in locale

```bash
cd site
npm install
npm run dev
```

Apri http://localhost:4321 — pannello CMS: http://localhost:4321/admin/

## Blog (in standby)

Gli articoli esempio sono in bozza. Per ripristinare la home con blog:

```bash
git checkout feature/blog
```

## Link anteprima → Google Drive

In `src/data/site.ts` aggiorna `previewRequestUrl`.

## Deploy GitHub Pages

Push su `main` → workflow `Deploy site` (Pages source = GitHub Actions).
