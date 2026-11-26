/**
 * Domande frequenti — DRAFT (2026-11-26), written only from what the site and
 * her posts already say. Deliberately absent until Martina answers: prices,
 * whether experience is needed, what's included, payment, cancellations.
 *
 * One source: the home page renders it (native `<details>`, zero JS) and
 * llms.txt lists it. No `FAQPage` JSON-LD: Google no longer shows FAQ rich
 * results, so the markup would earn nothing (same call as annina,
 * plan/annina/DECISIONS.md). Answers are written to stand alone when quoted.
 */
export const faq = [
  {
    question: "Come si prenota un laboratorio?",
    answer:
      "Scrivendo a Martina in DM su Instagram (@amarticeramics), indicando il laboratorio e la data. Dalla pagina di ogni evento, il pulsante di prenotazione apre la chat e copia un messaggio già pronto da incollare.",
  },
  {
    question: "Quanto costa un laboratorio e quanti posti ci sono?",
    answer:
      "Prezzo e posti disponibili variano da laboratorio a laboratorio: per informazioni si scrive in DM su Instagram a @amarticeramics.",
  },
  {
    question: "Ci sono laboratori per bambini?",
    answer:
      "Sì: i laboratori di decoro su ceramica \"per grandi e piccini\" sono pensati per adulti e bambini insieme. Sono segnati così nel programma.",
  },
  {
    question: "Cosa vuol dire \"day 1\" e \"day 2\"?",
    answer:
      "Alcuni corsi di ceramica si svolgono in due serate: nella prima si modella l'argilla, nella seconda si decora il pezzo modellato. Si prenotano insieme, dal day 1.",
  },
  {
    question: "I laboratori sono solo di ceramica?",
    answer:
      "No. Oltre alla ceramica, nella sala si alternano artigiane e artisti ospiti con laboratori di gioielli, macramè, candele, carta, astrologia e decorazioni di Natale.",
  },
  {
    question: "Dove si trova l'aMarticeramics Lab?",
    answer:
      "In Piazza Malfatti 10 a Rovereto (TN). Accanto al laboratorio c'è il concept store con le ceramiche di aMarti e le creazioni di artigiane del territorio.",
  },
  {
    question: "Si può affittare la sala?",
    answer:
      "Sì, per workshop, eventi e team building. Si scrive a Martina in DM su Instagram per parlarne.",
  },
  {
    question: "Come resto aggiornato sul programma?",
    answer:
      "Il programma completo è sulla pagina Laboratori, mese per mese. Dalla stessa pagina si possono aggiungere i laboratori al calendario del telefono, oppure seguire @amarticeramics su Instagram.",
  },
] as const;
