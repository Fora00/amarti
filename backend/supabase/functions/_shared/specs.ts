// What the public contact form may contain. Shared by the edge function and the
// local mock backend (see validate.ts). A field not listed here is dropped, so a
// new input on the site does nothing until it is added here AND to the page.
import type { FieldSpec } from "./validate.ts";

export const requestFields: FieldSpec = {
  nome: { required: true, max: 120 },
  email: { required: true, max: 160 },
  telefono: { max: 40 },
  messaggio: { required: true, max: 2000 },
};
