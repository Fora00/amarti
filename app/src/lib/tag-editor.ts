/**
 * A small tag editor: the current tags as removable chips, an input with the
 * suggestions as a <datalist>, and one-click chips for proposed tags. Calls
 * `save(next)` on every change; re-renders itself.
 */
import { el, render } from "./ui";
import { SUGGESTED, normTag, normTags } from "./tags";

let seq = 0;

export function tagEditor(opts: { tags: string[]; proposed?: string[]; label: string; save: (next: string[]) => Promise<void> }) {
  const box = el("div", { class: "tag-editor" });
  let tags = normTags(opts.tags);
  const listId = `tag-sugg-${++seq}`;

  const draw = () => {
    const input = el("input", { class: "input", list: listId, placeholder: "Aggiungi un tag…", "aria-label": opts.label, style: "width:auto;min-width:12rem" });
    const add = el("button", { type: "button", class: "btn secondary small" }, "Aggiungi");
    const commit = async (next: string[]) => {
      tags = normTags(next);
      await opts.save(tags);
      draw();
    };
    const addTyped = () => { const t = normTag(input.value); if (t) void commit([...tags, t]); };
    add.onclick = addTyped;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } });
    const proposed = normTags(opts.proposed ?? []).filter((t) => !tags.includes(t));
    render(box,
      el("div", { class: "row", style: "justify-content:flex-start;flex-wrap:wrap;gap:.4rem" },
        ...(tags.length ? tags.map((t) => {
          const chip = el("button", { type: "button", class: "pill tag-chip", title: `Togli "${t}"`, "aria-label": `Togli il tag ${t}` }, t, " ×");
          chip.onclick = () => void commit(tags.filter((x) => x !== t));
          return chip;
        }) : [el("span", { class: "muted" }, "Nessun tag.")])),
      proposed.length ? el("div", { class: "row", style: "justify-content:flex-start;flex-wrap:wrap;gap:.4rem;margin-top:.5rem" },
        el("span", { class: "muted" }, "Suggeriti:"),
        ...proposed.map((t) => {
          const chip = el("button", { type: "button", class: "btn secondary small" }, `+ ${t}`);
          chip.onclick = () => void commit([...tags, t]);
          return chip;
        })) : null,
      el("div", { class: "row", style: "justify-content:flex-start;flex-wrap:wrap;gap:.4rem;margin-top:.5rem" }, input, add),
      el("datalist", { id: listId }, ...SUGGESTED.map((t) => el("option", { value: t }))));
  };
  draw();
  return box;
}
