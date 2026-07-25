import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Sun, Moon, Copy, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { feedback as ALL, type Sentiment, type Feedback } from "@/lib/feedback-data";
import {
  sentimentDot, sentimentSoft, initials, avatarColor,
  formatDate, formatId, highlight,
} from "@/lib/feedback-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumina Feedback — Customer voices" },
      { name: "description", content: "An editorial dashboard for browsing customer feedback." },
    ],
  }),
  component: LuminaPage,
});

type SentFilter = "All" | Sentiment;
type Sort = "Newest" | "Oldest" | "Name";

const SENT_KEYS: SentFilter[] = ["All", "Positive", "Neutral", "Negative"];

// ---------- URL hash sync ----------
function readHash() {
  if (typeof window === "undefined") return { q: "", s: "All" as SentFilter, sort: "Newest" as Sort };
  const h = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(h);
  const s = params.get("s") as SentFilter | null;
  const sort = params.get("sort") as Sort | null;
  return {
    q: params.get("q") ?? "",
    s: s && SENT_KEYS.includes(s) ? s : ("All" as SentFilter),
    sort: sort && ["Newest", "Oldest", "Name"].includes(sort) ? sort : ("Newest" as Sort),
  };
}

function writeHash(q: string, s: SentFilter, sort: Sort) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (s !== "All") params.set("s", s);
  if (sort !== "Newest") params.set("sort", sort);
  const str = params.toString();
  const next = str ? `#${str}` : "";
  if (window.location.hash !== next) {
    history.replaceState(null, "", window.location.pathname + window.location.search + next);
  }
}

// ---------- Theme ----------
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const set = useCallback((t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem("lumina-theme", t); } catch {}
  }, []);
  const toggle = useCallback(() => set(theme === "dark" ? "light" : "dark"), [theme, set]);
  return { theme, toggle };
}

function LuminaPage() {
  const init = typeof window !== "undefined" ? readHash() : { q: "", s: "All" as SentFilter, sort: "Newest" as Sort };
  const [q, setQ] = useState(init.q);
  const [sent, setSent] = useState<SentFilter>(init.s);
  const [sort, setSort] = useState<Sort>(init.sort);
  const [open, setOpen] = useState<Feedback | null>(null);
  const [copied, setCopied] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const { theme, toggle } = useTheme();

  // URL sync
  useEffect(() => { writeHash(q, sent, sort); }, [q, sent, sort]);

  // Re-trigger stagger on filter changes
  useEffect(() => { setRenderKey((k) => k + 1); }, [q, sent, sort]);

  // Counts (always from full set)
  const counts = useMemo(() => {
    const c: Record<SentFilter, number> = { All: ALL.length, Positive: 0, Negative: 0, Neutral: 0 };
    ALL.forEach((f) => { c[f.sentiment]++; });
    return c;
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = ALL.filter((f) => {
      if (sent !== "All" && f.sentiment !== sent) return false;
      if (!needle) return true;
      return (
        f.customer_name.toLowerCase().includes(needle) ||
        f.feedback_text.toLowerCase().includes(needle)
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === "Name") return a.customer_name.localeCompare(b.customer_name);
      if (sort === "Oldest") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });
    return list;
  }, [q, sent, sort]);

  const latest = useMemo(() => {
    return [...ALL].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (open) { setOpen(null); return; }
        if (q) { setQ(""); return; }
      }
      if (inField) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "1") setSent("All");
      else if (e.key === "2") setSent("Positive");
      else if (e.key === "3") setSent("Neutral");
      else if (e.key === "4") setSent("Negative");
      else if (e.key.toLowerCase() === "t") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, open, toggle]);

  const distribution = useMemo(() => {
    const total = ALL.length || 1;
    return {
      pos: (counts.Positive / total) * 100,
      neu: (counts.Neutral / total) * 100,
      neg: (counts.Negative / total) * 100,
    };
  }, [counts]);

  const copyQuote = async () => {
    if (!open) return;
    try {
      await navigator.clipboard.writeText(`"${open.feedback_text}" — ${open.customer_name}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const clearAll = () => { setQ(""); setSent("All"); setSort("Newest"); };

  return (
    <div className="relative min-h-screen">
      <div className="noise-overlay" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[color-mix(in_oklab,var(--background)_75%,transparent)] border-b border-hairline">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif italic text-2xl leading-none">Lumina</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Feedback</span>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="size-9 rounded-full border border-hairline grid place-items-center hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-14 pb-24">
        {/* Hero */}
        <section className="mb-14">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
            Dashboard · May 10 — May 14, 2026
          </div>
          <h1 className="font-serif font-light text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight max-w-4xl">
            What customers are saying,{" "}
            <span className="italic text-muted-foreground">right now.</span>
          </h1>
        </section>

        {/* Stats */}
        <section className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden">
            <Stat label="Total" value={String(counts.All)} />
            <Stat label="Positive" value={String(counts.Positive)} />
            <Stat label="Negative" value={String(counts.Negative)} />
            <Stat label="Latest" value={latest ? new Date(latest.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} mono />
          </div>
          {/* Distribution bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden flex bg-muted">
              <div style={{ width: `${distribution.pos}%`, background: "var(--pos)" }} />
              <div style={{ width: `${distribution.neu}%`, background: "var(--neu)" }} />
              <div style={{ width: `${distribution.neg}%`, background: "var(--neg)" }} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex gap-3">
              <span className="flex items-center gap-1.5"><Dot c="var(--pos)" />{counts.Positive}</span>
              <span className="flex items-center gap-1.5"><Dot c="var(--neu)" />{counts.Neutral}</span>
              <span className="flex items-center gap-1.5"><Dot c="var(--neg)" />{counts.Negative}</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="mb-8 flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers and feedback…"
              aria-label="Search feedback"
              className="w-full h-11 pl-11 pr-14 rounded-full bg-surface border border-hairline text-sm placeholder:text-muted-foreground outline-none transition-shadow focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_22%,transparent)] focus:border-accent"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] px-1.5 py-0.5 rounded border border-hairline bg-muted text-muted-foreground">/</kbd>
          </div>

          {/* Sentiment pills */}
          <div role="tablist" aria-label="Filter by sentiment" className="inline-flex p-1 rounded-full bg-muted border border-hairline">
            {SENT_KEYS.map((k) => {
              const active = sent === k;
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSent(k)}
                  className={`relative px-3.5 h-9 rounded-full text-xs font-medium transition-colors flex items-center gap-2 ${
                    active ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k !== "All" && <Dot c={sentimentDot[k as Sentiment]} />}
                  <span>{k}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{counts[k]}</span>
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 px-4 rounded-full bg-surface border border-hairline text-xs font-mono uppercase tracking-wider hover:bg-muted transition-colors">
              Sort · {sort}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              {(["Newest", "Oldest", "Name"] as Sort[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setSort(s)}>{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        {/* Results meta — count, active filters, single clear affordance */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2">
            <span>
              Showing <span className="text-foreground">{filtered.length}</span> of{" "}
              <span className="text-foreground">{ALL.length}</span>
            </span>
            {sent !== "All" && (
              <>
                <span aria-hidden="true">·</span>
                <span>{sent.toLowerCase()}</span>
              </>
            )}
            {q.trim() && (
              <>
                <span aria-hidden="true">·</span>
                <span className="normal-case tracking-normal">“{q.trim()}”</span>
              </>
            )}
            {sort !== "Newest" && (
              <>
                <span aria-hidden="true">·</span>
                <span>sorted by {sort.toLowerCase()}</span>
              </>
            )}
          </div>
          {(q.trim() || sent !== "All" || sort !== "Newest") && (
            <button
              onClick={clearAll}
              className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState onClear={clearAll} />
        ) : (
          <section
            key={renderKey}
            aria-label="Feedback list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map((f, i) => (
              <FeedbackCard
                key={f.id}
                f={f}
                q={q}
                index={i}
                onOpen={() => setOpen(f)}
              />
            ))}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-serif italic text-base">Lumina</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <kbd className="px-1 border border-hairline rounded">/</kbd> search
            <span aria-hidden="true">·</span>
            <kbd className="px-1 border border-hairline rounded">1</kbd>–<kbd className="px-1 border border-hairline rounded">4</kbd> filter
            <span aria-hidden="true">·</span>
            <kbd className="px-1 border border-hairline rounded">T</kbd> theme
            <span aria-hidden="true">·</span>
            <kbd className="px-1 border border-hairline rounded">Esc</kbd> clear
          </span>
        </footer>
      </div>

      {/* Modal */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="bg-surface border-hairline max-w-2xl p-0 overflow-hidden">
          {open && (
            <div className="relative p-8 md:p-10">
              {/* Top-right close — what users instinctively reach for */}
              <button
                onClick={() => setOpen(null)}
                aria-label="Close dialog"
                className="absolute top-5 right-5 size-9 rounded-full border border-hairline grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center justify-between gap-4 mb-8 pr-12">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="size-10 rounded-full grid place-items-center text-[11px] font-mono flex-shrink-0"
                    style={{ background: avatarColor(open.customer_name), color: "#14130f" }}
                  >
                    {initials(open.customer_name)}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-sm font-medium truncate">{open.customer_name}</DialogTitle>
                    <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.18em]">
                      {formatDate(open.date)} · {formatId(open.id)}
                    </DialogDescription>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] flex-shrink-0"
                  style={{ background: sentimentSoft[open.sentiment] }}
                >
                  <Dot c={sentimentDot[open.sentiment]} />
                  {open.sentiment}
                </span>
              </div>

              <blockquote className="font-serif text-3xl md:text-4xl leading-[1.25] tracking-tight">
                <span className="text-muted-foreground/60 mr-1">“</span>
                {open.feedback_text}
                <span className="text-muted-foreground/60 ml-1">”</span>
              </blockquote>

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={copyQuote}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy quote"}
                </button>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Press <kbd className="px-1 border border-hairline rounded ml-1">Esc</kbd> to close
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block size-1.5 rounded-full" style={{ background: c }} aria-hidden="true" />;
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-surface p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{label}</div>
      <div className={`${mono ? "font-mono text-2xl" : "font-serif text-4xl font-light"} leading-none tracking-tight`}>
        {value}
      </div>
    </div>
  );
}

function FeedbackCard({
  f, q, index, onOpen,
}: { f: Feedback; q: string; index: number; onOpen: () => void }) {
  const delay = Math.min(index * 45, 280);
  return (
    <article
      className="group animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onOpen}
        className="text-left w-full h-full bg-surface border border-hairline rounded-xl p-5 transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] shadow-[0_1px_0_rgba(20,19,15,0.02)] hover:shadow-[0_8px_24px_-12px_rgba(20,19,15,0.18)] hover:-translate-y-[2px] focus:outline-none focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_22%,transparent)]"
      >
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="size-8 rounded-full grid place-items-center text-[10px] font-mono"
              style={{ background: avatarColor(f.customer_name), color: "#14130f" }}
            >
              {initials(f.customer_name)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm">{highlight(f.customer_name, q)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{formatDate(f.date)}</span>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
            style={{ background: sentimentSoft[f.sentiment] }}
          >
            <Dot c={sentimentDot[f.sentiment]} />
            {f.sentiment}
          </span>
        </header>

        <p className="text-[14.5px] leading-[1.6] text-foreground/90">
          {highlight(f.feedback_text, q)}
        </p>

        <footer className="mt-5 pt-4 border-t border-hairline flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">{formatId(f.id)}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Read →
          </span>
        </footer>
      </button>
    </article>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <section className="py-24 text-center border border-dashed border-hairline rounded-2xl">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
        Nothing here
      </div>
      <h2 className="font-serif text-3xl font-light mb-3">
        No feedback matches that view.
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Try widening the sentiment filter or clearing your search to see all customer voices again.
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
      >
        Clear filters
      </button>
    </section>
  );
}
