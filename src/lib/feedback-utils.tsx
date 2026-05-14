import type { Sentiment } from "./feedback-data";

export const sentimentDot: Record<Sentiment, string> = {
  Positive: "var(--pos)",
  Negative: "var(--neg)",
  Neutral: "var(--neu)",
};

export const sentimentSoft: Record<Sentiment, string> = {
  Positive: "var(--pos-soft)",
  Negative: "var(--neg-soft)",
  Neutral: "var(--neu-soft)",
};

export function initials(name: string): string {
  const parts = name.replace(/\.$/, "").split(/\s+/);
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const palette = [
  "#c8b89a", "#a8b9a3", "#d1a890", "#b9a8c8",
  "#a3b6c8", "#c8a3a3", "#b8c8a3", "#cab38a",
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatId(id: number): string {
  return "#" + String(id).padStart(4, "0");
}

export function highlight(text: string, q: string): React.ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  // Escape regex special chars in the query before building the splitter.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "i");
  const parts = text.split(re);
  const lowerNeedle = needle.toLowerCase();
  // Compare lowercased strings instead of re.test() — `g` flag makes test()
  // stateful via lastIndex, so back-to-back calls inside .map() would skip
  // matches. Plain string comparison is both correct and faster.
  return parts.map((p, i) =>
    p.toLowerCase() === lowerNeedle ? (
      <mark
        key={i}
        className="bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-foreground rounded-[2px] px-0.5"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
