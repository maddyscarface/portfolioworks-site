import { TEMPLATES } from "./templates";
/** Client-safe list of walkthrough types for pickers. */
export const serviceChoices = Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.label, short: t.short }));
