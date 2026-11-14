import Link from "next/link";

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="font-display text-[28px] leading-tight text-char">{title}</h1>{sub && <p className="mt-1 max-w-3xl text-sm text-stone">{sub}</p>}</div>
      {children}
    </div>
  );
}
export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return <div className={`border border-line bg-white p-5 ${className}`}>{title && <h2 className="mb-3 text-sm font-semibold tracking-wide text-char uppercase">{title}</h2>}{children}</div>;
}
export function Forbidden({ perm }: { perm: string }) {
  return <Card><p className="text-char">Your role doesn&rsquo;t include access to this page <span className="text-stone">({perm})</span>. Ask the owner to change your role.</p></Card>;
}
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const c = { neutral: "bg-bone-2 text-char", good: "bg-[#e5f1e8] text-[#1f5130]", warn: "bg-[#fbefd9] text-[#7a4b06]", bad: "bg-[#f9e1de] text-[#8a1f14]", info: "bg-[#e2ebf4] text-[#173a5e]" }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${c}`}>{children}</span>;
}
export function Table({ head, rows, empty = "Nothing yet." }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-stone">{empty}</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
      <thead><tr className="border-b border-line text-xs tracking-wide text-stone uppercase">{head.map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-bone-2 align-top">{r.map((c, j) => <td key={j} className="py-2 pr-4">{c}</td>)}</tr>)}</tbody>
    </table></div>
  );
}
export const A = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="font-semibold text-char underline decoration-copper underline-offset-2">{children}</Link>;
export const when = (iso?: unknown) => (iso ? new Date(String(iso)).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET" : "—");
export const statusTone = (s: string): "neutral" | "good" | "warn" | "bad" | "info" =>
  /dead|failed|revoked|bad|rejected/.test(s) ? "bad" : /done|exported|sent|approved|submitted|imported|configured/.test(s) ? "good" : /pending|stale|followup|draft|progress|retry/.test(s) ? "warn" : "neutral";
