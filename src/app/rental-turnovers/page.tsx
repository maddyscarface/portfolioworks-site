import Link from "next/link";
import { getService } from "@/config/services";
import { site } from "@/config/site";
import LeadForm from "@/components/LeadForm";
import { Breadcrumbs, Btn, Check, CtaBand, Faq, FaqJsonLd, Heading, PageHero, Photo, Section } from "@/components/ui";
import { JsonLd, pageMeta, serviceSchema, webPageSchema } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Rental Unit Turnovers in Boston | PortfolioWorks",
  description: "Coordinate rental unit make-ready work, scope, schedule and closeout with one property-services team serving Greater Boston.",
  path: "/rental-turnovers",
  image: "/photos/living-room-green.jpg",
});

export default function Page() {
  const s = getService("rental-turnovers")!;
  const path = "/rental-turnovers";
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            webPageSchema({ path, name: "Rental Unit Turnovers in Greater Boston", description: s.overview }),
            serviceSchema({ name: "Rental unit turnovers", description: s.overview, path }),
          ],
        }}
      />
      <PageHero
        image="livingRoomGreen"
        eyebrow="Turnovers · Greater Boston"
        title="Rental Unit Turnovers in Greater Boston"
        sub="One coordinator handles access, the readiness checklist, trade sequence, vacancy handoff and photo documentation. The schedule is written for that unit — we do not advertise a staffed turnaround time."
        aside={<LeadForm funnel="turnover" defaultServices={["rental-turnovers"]} />}
      >
        <Btn href="/request-a-turnover">{site.pathways[0].label}</Btn>
        <Btn href="/unit-turn-estimator" variant="ghost-light">Unit turn estimator</Btn>
      </PageHero>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Rental turnovers", path }]} />

      <Section tone="white">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <p className="eyebrow eyebrow-rule mb-4">The problem</p>
            <p className="display text-2xl sm:text-3xl text-navy leading-snug">{s.problem}</p>
            <Photo k="rentReadyOpenPlan" className="aspect-[16/10] mt-10" sizes="(min-width: 1024px) 45vw, 100vw" />
          </div>
          <div>
            <Heading eyebrow="How a turnover actually runs" title="Five operational stages, one record." sub="Each stage has an owner. The work is not finished until the closeout record is delivered." />
            <ol className="space-y-0 border-l border-line">
              {[
                ["Access", "Keys, codes, parking, dumpster rules and tenant-notice windows are confirmed before anyone is scheduled. Boston walk-ups and triple-deckers need those constraints in the job file, not discovered on day one."],
                ["Readiness checklist", "A room-by-room condition survey with dated photos. Work is classified as make-ready, tenant damage or deferred capital work. Deposit decisions stay with you."],
                ["Trades sequence", "Repairs and drywall, then paint, then flooring, then fixtures, then cleaning. One coordinator keeps that order so a trade is not standing on another trade’s finish."],
                ["Vacancy handoff", "The unit is returned with a planned rent-ready condition against the approved scope, not a verbal “it’s done.” Outstanding punch items are listed in writing."],
                ["Photo documentation", "Before, progress and after photos, paint colors, product SKUs, signed change orders and an invoice tied to the approved line items."],
              ].map(([t, d], i) => (
                <li key={t} className="relative pl-8 pb-7">
                  <span className="absolute -left-[13px] top-0 h-6 w-6 grid place-items-center bg-navy text-paper text-xs num">{i + 1}</span>
                  <p className="font-semibold text-navy">{t}</p>
                  <p className="text-slate text-sm mt-1 leading-relaxed">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section tone="paper" id="scope">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12">
          <div>
            <Heading eyebrow="Typical scope" title="What a make-ready can include" sub="The written estimate lists only the items approved for that unit. Nothing below is automatically included." />
            <ul className="space-y-2.5">{s.typicalScope.map((x) => <Check key={x}>{x}</Check>)}</ul>
          </div>
          <div>
            <Heading eyebrow="What you receive" title="Deliverables" />
            <ul className="space-y-3">{s.deliverables.map((x) => <Check key={x}>{x}</Check>)}</ul>
            <div className="mt-10 card p-6">
              <p className="eyebrow">Pricing framework</p>
              <p className="text-xl text-navy display mt-2">{s.pricing.model}</p>
              <p className="text-slate mt-2 text-sm leading-relaxed">{s.pricing.framework}</p>
              {s.pricing.illustrativeRange && <p className="text-xs text-slate mt-3">{s.pricing.illustrativeRange}. Planning assumptions are dated on the estimator; the result is not a contractual bid.</p>}
              <Link href="/unit-turn-estimator" className="text-sm underline mt-4 inline-block">Open the unit turn estimator</Link>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <Heading eyebrow="Guides" title="Turnover planning, written from the work." />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["/resources/what-is-included-in-a-rental-unit-turnover", "What is included in a rental unit turnover"],
            ["/resources/planning-a-30-day-make-ready", "Planning a 30-day make-ready"],
            ["/resources/documenting-unit-closeout", "Documenting unit closeout"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="card p-6 hover:border-bronze">
              <p className="text-navy font-semibold">{label}</p>
              <p className="text-sm text-slate mt-2">Operational checklist →</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12">
          <div>
            <Heading eyebrow="FAQ" title="Rental turnovers: common questions" />
            <Faq items={s.faq} />
            <FaqJsonLd items={s.faq} />
          </div>
          <div>
            <p className="eyebrow mb-4">Often paired with</p>
            <div className="space-y-3">
              {s.upsells.map((u) => {
                const href = u === "rental-turnovers" ? "/rental-turnovers" : `/services/${u}`;
                const name = u.replace(/-/g, " ");
                return (
                  <Link key={u} href={href} className="card p-4 block hover:border-bronze">
                    <p className="text-navy font-semibold capitalize">{name}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Section>
      <CtaBand title="Plan the next unit with one coordinator." primary={site.pathways[0]} secondary={{ label: "Unit turn estimator", href: "/unit-turn-estimator" }} />
    </>
  );
}
