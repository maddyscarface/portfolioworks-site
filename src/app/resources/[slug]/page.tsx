import Link from "next/link";
import { notFound } from "next/navigation";
import { allGuides, getGuide } from "@/config/guides";
import { flags } from "@/config/flags";
import { Breadcrumbs, Check, CtaBand, Faq, FaqJsonLd, Heading, PageHero, Section } from "@/components/ui";
import { JsonLd, articleSchema, pageMeta, webPageSchema } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return allGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const indexable = g.indexable !== false && !flags.noindex;
  return pageMeta({
    title: `${g.title} | PortfolioWorks`,
    description: g.description.slice(0, 155),
    path: `/resources/${g.slug}`,
    type: "article",
    publishedTime: g.datePublished,
    index: indexable,
    image: "/photos/scope-planning.jpg",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const path = `/resources/${g.slug}`;
  const inactive = g.market === "FL" || g.market === "ME";
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            webPageSchema({ path, name: g.h1, description: g.description }),
            articleSchema({ path, headline: g.h1, description: g.description, datePublished: g.datePublished }),
          ],
        }}
      />
      <PageHero
        image="scopePlanning"
        eyebrow={`Guide · ${g.market === "all" ? "All markets" : g.market === "MA" ? "Greater Boston" : g.market === "FL" ? "Southeast Florida" : "Southern Maine"}`}
        title={g.h1}
        sub={g.answer}
      />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }, { name: g.h1, path }]} />
      <Section tone="white">
        {inactive && (
          <div className="border-l-4 border-bronze bg-bronze-soft px-4 py-3 text-sm text-charcoal mb-10 max-w-3xl">
            This article is general information. PortfolioWorks does not currently market {g.market === "FL" ? "Southeast Florida" : "Southern Maine"} as an active service area.
            {g.market === "FL" ? " Licensing and insurance are still pending." : " The market is under evaluation."}
          </div>
        )}
        <article className="max-w-3xl">
          <p className="text-lg text-slate leading-relaxed">{g.answer}</p>
          {g.sections.map((s) => (
            <section key={s.h2} className="mt-12">
              <h2 className="text-2xl text-navy mb-4">{s.h2}</h2>
              {s.body.map((p) => (
                <p key={p} className="text-slate leading-relaxed mb-4">{p}</p>
              ))}
              {s.list && (
                <ul className="space-y-2.5 mt-4">
                  {s.list.map((item) => (
                    <Check key={item}>{item}</Check>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div className="mt-12 card p-6">
            <p className="eyebrow">Continue</p>
            <ul className="mt-3 space-y-2 text-sm">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="underline decoration-line hover:text-navy">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </Section>
      {g.faq && g.faq.length > 0 && (
        <Section tone="paper">
          <Heading eyebrow="FAQ" title="Questions this guide usually raises" />
          <Faq items={g.faq} />
          <FaqJsonLd items={g.faq} />
        </Section>
      )}
      <CtaBand />
    </>
  );
}
