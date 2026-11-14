import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, flags } from "@/lib/p4/flags";
import { publicState, resolveToken } from "@/lib/walkthrough/service";
import { uploadMode } from "@/lib/walkthrough/uploads";
import { durableStorage } from "@/lib/p4/db";
import { WalkthroughApp } from "@/components/walkthrough/WalkthroughApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your walkthrough | PortfolioWorks", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = flags().walkthrough ? await resolveToken(BRAND, token) : null;
  if (!r) {
    return (
      <section className="min-h-[70vh] bg-paper px-5 py-16">
        <div className="card mx-auto max-w-md p-7" data-testid="link-gone">
          <p className="eyebrow">PortfolioWorks</p>
          <h1 className="mt-3 text-2xl text-navy">This link isn&rsquo;t active</h1>
          <p className="mt-3 text-[15px] text-ink/80">It may have expired or been replaced. Reply to the message that sent you this link, or use the <Link className="font-semibold underline" href="/contact">contact page</Link>, and we&rsquo;ll send a new one.</p>
          {!durableStorage() && <p className="mt-3 text-xs text-slate" data-testid="storage-demo-note">Preview environment: durable storage isn&rsquo;t connected, so links can&rsquo;t be shared between servers here.</p>}
        </div>
      </section>
    );
  }
  const initial = await publicState(BRAND, r, uploadMode());
  return <WalkthroughApp token={token} initial={JSON.parse(JSON.stringify(initial))} />;
}
