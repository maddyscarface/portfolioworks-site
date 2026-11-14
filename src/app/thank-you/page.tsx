import Link from "next/link";
import { Btn, Container } from "@/components/ui";

export const metadata = { title: "Request received | PortfolioWorks", robots: { index: false } };

const next: Record<string, string[]> = {
  portfolio: ["A coordinator reviews your portfolio details", "We email you to schedule a discovery call", "On the call we propose a pilot unit"],
  rehab: ["We review your project details and budget", "We schedule a site walk", "You receive a written scope and proposal"],
  default: ["A coordinator reviews your request", "We follow up by email or phone—usually with a request for photos or a site walk time", "You receive a written scope and estimate"],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const steps = next[f ?? ""] ?? next.default;
  // NOTE: conversion events fire in LeadForm on API success (with event_id), not on this page,
  // so reloading or bookmarking /thank-you never double-counts.
  return (
    <section className="bg-paper py-24">
      <Container className="max-w-2xl">
        <p className="eyebrow">Request received</p>
        <h1 className="text-4xl sm:text-5xl text-navy mt-3">Thank you. We&apos;ll take it from here.</h1>
        <ol className="mt-10 space-y-4">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-4 items-start"><span className="num h-8 w-8 shrink-0 grid place-items-center bg-navy text-paper text-sm">{i + 1}</span><span className="pt-1 text-lg">{s}</span></li>
          ))}
        </ol>
        <p className="mt-8 text-slate">Have photos ready? Reply to our confirmation email with them—or use the links below while you wait.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Btn href="/unit-turn-estimator" variant="dark">Try the scope planner</Btn>
          <Btn href="/how-it-works" variant="ghost">How it works</Btn>
        </div>
        <p className="mt-10 text-sm"><Link href="/" className="underline">Back to home</Link></p>
      </Container>
    </section>
  );
}
