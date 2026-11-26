import { defineI18n } from "@factory/common";
import { site } from "../site.config.ts";

import it from "./it.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

export const i18n = defineI18n({ config: site, dictionaries: { it, en } });
