import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { pageMeta } from "@/lib/seo";
import { WalkthroughStartForm } from "@/components/walkthrough/WalkthroughStartForm";
import { WALKTHROUGH_SERVICES, type WalkthroughService } from "@/lib/walkthrough/templates";
import { serviceChoices } from "@/lib/walkthrough/choices";
import { durableStorage, walkthroughStorageAllowed } from "@/lib/p4/db";
import { flags } from "@/lib/p4/flags";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Start a Guided Unit Walkthrough | PortfolioWorks",
  description: "Show us a rental unit, renovation or building from your phone: guided photos, room measurements and access notes. No prices online; our estimator follows up.",
  path: "/walkthrough/start",
  image: "/photos/site-walkthrough.jpg",
  index: false,
});

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Behind PORTFOLIO_MOBILE_WALKTHROUGH_ENABLED (default off until privacy/tenancy QA). Disabled = not live, not linked.
  if (!flags().walkthrough) notFound();
  const sp = await searchParams;
  const service = (WALKTHROUGH_SERVICES as readonly string[]).includes(sp.service ?? "") ? (sp.service as WalkthroughService) : undefined;
  return (
    <>
      <PageHero image="siteWalkthrough" eyebrow="Guided walkthrough" title="Show us the unit from your phone." sub="Room-by-room photos, tape measurements and access notes. You can stop and come back any time. Prices are never shown here." />
      <section className="bg-paper px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {!durableStorage() && walkthroughStorageAllowed() && (
              <p className="border border-bronze bg-bronze-soft p-3 text-sm text-ink" data-testid="storage-demo-note"><b>Preview environment.</b> Durable storage isn&rsquo;t connected here, so walkthrough links may not open reliably on this preview. Production requires Supabase.</p>
            )}
            {walkthroughStorageAllowed()
              ? <WalkthroughStartForm services={serviceChoices} presetService={service} />
              : <div className="card p-6"><p className="text-[15px] text-ink">The guided walkthrough isn&rsquo;t available yet. In the meantime, <Link className="font-semibold underline" href="/request-a-property-walkthrough">request a property walkthrough</Link>.</p></div>}
          </div>
          <aside className="space-y-5 text-[15px] text-ink/85">
            <div className="border-t-2 border-bronze pt-4"><h2 className="text-xl text-navy">How it works</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Tell us who you are and what the property work is.</li>
                <li>Follow the steps on your phone. Progress saves as you go.</li>
                <li>Our estimator reviews it and contacts you about next steps, often a site visit.</li>
                <li>Any price comes only in a written proposal. We don&rsquo;t show prices online.</li>
              </ol></div>
            <div className="border-t border-line pt-4"><h2 className="text-lg text-navy">Resident privacy</h2>
              <p className="mt-2">Photograph the work, not people or their belongings. If a unit is occupied, the resident must know before any photos are taken. We never enter an occupied unit without an arrangement made through you.</p></div>
          </aside>
        </div>
      </section>
    </>
  );
}
