-- First guess of the course tags (2026-11-27), from the titles of the Nov–Dec
-- programme. Run once on the hosted project; safe to re-run: it fills ONLY
-- courses that have no tags yet, so it never overwrites what Martina set in
-- the dashboard. Keyed by the course id = the day-1 event id.
--
-- Vocabulary (also SUGGESTED in app/src/lib/tags.ts, English labels in
-- site/src/i18n/en.json → tags): ceramica, modellazione, decorazione, candele,
-- gioielli, intrecci, carta, natale, bambini, astrologia, aperitivo,
-- cosmetica naturale, fiori e piante.
insert into corsi (event_id, tags) values
  ('2026-11-05-candela-autunnale-artlab',        '{candele}'),
  ('2026-11-10-corso-base-ceramica-day-1',       '{ceramica,modellazione}'),
  ('2026-11-11-ghirlanda-autunnale-bicelli',     '{"fiori e piante"}'),
  ('2026-11-12-paracord-minicami',               '{intrecci}'),
  ('2026-11-16-astrologia-aperitivo',            '{astrologia,aperitivo}'),
  ('2026-11-26-gioielli-materianomade',          '{gioielli}'),
  ('2026-11-28-macrame-artemisya',               '{intrecci}'),
  ('2026-11-30-vini-calice',                     '{aperitivo,decorazione}'),
  ('2026-12-01-decoro-natale-grandi-piccini',    '{ceramica,decorazione,natale,bambini}'),
  ('2026-12-02-alberello-natale-bicelli',        '{natale}'),
  ('2026-12-03-candela-profumata-artlab',        '{candele}'),
  ('2026-12-10-modellazione-il-grillo-day-1',    '{ceramica,modellazione,decorazione}'),
  ('2026-12-11-quadretto-carta-nebulosa-lab',    '{carta}'),
  ('2026-12-14-tazza-natale-day-1',              '{ceramica,modellazione,decorazione,natale}'),
  ('2026-12-15-bomba-bagno-erbesapienti',        '{"cosmetica naturale"}'),
  ('2026-12-16-festone-natale-bicelli',          '{natale}'),
  ('2026-12-21-decoro-brindisi-natale',          '{ceramica,decorazione,natale,bambini,aperitivo}')
on conflict (event_id) do update set tags = excluded.tags, updated_at = now()
  where corsi.tags = '{}';
