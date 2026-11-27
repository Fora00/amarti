/**
 * Domande frequenti — DRAFT, trimmed to 5 in the design review of 2026-11-27 (where/what/updates are already on the page) — (2026-11-26; EN added 2026-11-27, same answers), written only from what the site and
 * her posts already say. Deliberately absent until Martina answers: prices,
 * whether experience is needed, what's included, payment, cancellations.
 *
 * One source: the home page renders it (native `<details>`, zero JS) and
 * llms.txt lists it. No `FAQPage` JSON-LD: Google no longer shows FAQ rich
 * results, so the markup would earn nothing (same call as annina,
 * plan/annina/DECISIONS.md). Answers are written to stand alone when quoted.
 */
export const faqByLang = {
  it: [
  {
    question: "Come si prenota un laboratorio?",
    answer:
      "Dalla pagina del laboratorio, con il modulo \"Prenota il tuo posto\": l'iscrizione è gratuita e Martina ti conferma il posto quando il corso raggiunge il numero minimo, poi ti manda il link per pagare. In alternativa si scrive in DM su Instagram (@amarticeramics).",
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
    question: "Si può affittare la sala?",
    answer:
      "Sì, per compleanni, workshop, eventi e team building: i dettagli sono nella pagina Servizi. Si scrive a Martina in DM su Instagram per parlarne.",
  },
],
  en: [
  {
    question: "How do I book a workshop?",
    answer:
      "On the workshop's page, with the \"Book your place\" form: signing up is free, and Martina confirms your place once the workshop reaches its minimum number of people, then sends you a payment link. You can also send a DM on Instagram (@amarticeramics).",
  },
  {
    question: "How much does a workshop cost and how many places are there?",
    answer:
      "Price and places vary from workshop to workshop: for details, send a DM on Instagram to @amarticeramics.",
  },
  {
    question: "Are there workshops for children?",
    answer:
      "Yes: the ceramic decorating workshops marked \"per grandi e piccini\" are meant for adults and children together.",
  },
  {
    question: "What do \"day 1\" and \"day 2\" mean?",
    answer:
      "Some ceramics courses run over two evenings: on the first you shape the clay, on the second you decorate the piece. You book both together, from day 1.",
  },
  {
    question: "Can I rent the room?",
    answer:
      "Yes, for birthdays, workshops, events and team building: see the Services page. Send Martina a DM on Instagram to talk about it.",
  },
],
} as const;

/** Italian: the default, and what llms.txt lists. */
export const faq = faqByLang.it;
