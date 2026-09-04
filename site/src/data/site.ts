/**
 * Configurazione del sito.
 * Aggiorna `previewRequestUrl` con il link reale del foglio / form Google
 * dove tieni traccia delle richieste di anteprima.
 */
export const site = {
  name: "Paolo Riva",
  tagline: "Di giorno sistemi. Di notte storie.",
  email: "paoloriva.main@proton.me",
  location: "Torino",
  /**
   * Link unico per tutte le richieste di anteprima.
   * Incolla qui l’URL del foglio Google Drive (o del form collegato).
   */
  previewRequestUrl:
    "https://docs.google.com/spreadsheets/d/INCOLLA-QUI-IL-TUO-ID/edit",
  bio: {
    short:
      "Informatico di giorno, scrittore di notte. Ogni libro è un mondo; questo sito è la casa che li raccoglie.",
    body: "Vivo all'ombra della Mole, classe 1984. Tre figli, informatica di giorno, libri sempre. Fino al liceo i libri erano arredamento. Poi Ivanhoe ha acceso la miccia.",
    notes: [
      "Il Signore degli Anelli riletto 7 volte",
      "Dumas, Asimov, Christie",
      "Incompatibilità diplomatica con il romance",
      "Da mesi costruisco il mio catalogo di storie",
    ],
  },
  socials: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/paoloriva_book/",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61592838920359",
    },
    {
      label: "Wattpad",
      href: "https://www.wattpad.com/user/PaoloRiva",
    },
  ],
  books: [
    {
      id: "la-veglia",
      title: "La Veglia",
      subtitle: "La coscienza dentro il mostro",
      statusLabel: "Esordio · Horror",
      soon: false,
      arcOpen: true,
      cover: "/images/la-veglia-cover.png",
      excerpt:
        "Un virus ha trasformato il mondo in predatori. Clara Rinaldi è una di loro — ma dentro è ancora sveglia.",
    },
    {
      id: "a-chi-credere",
      title: "A chi credere",
      subtitle: "La mente ricorda ciò che le mani hanno fatto.",
      statusLabel: "Coming soon",
      soon: true,
      arcOpen: false,
      cover: "/images/a-chi-credere-cover.png",
      excerpt: "",
    },
  ],
} as const;
