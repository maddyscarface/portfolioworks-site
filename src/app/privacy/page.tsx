import { site } from "@/config/site";
import { Container } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy | PortfolioWorks",
  description: "How PortfolioWorks collects and uses information through this website and client portal. This draft is pending legal review before launch.",
  path: "/privacy",
});

export default function Page() {
  return (
    <section className="py-16 bg-white">
      <Container className="max-w-3xl prose-sm text-[0.95rem] leading-relaxed space-y-4">
        <p className="eyebrow">Draft — requires legal review before launch</p>
        <h1 className="text-4xl text-navy">Privacy Policy</h1>
        <p>This policy describes how {site.legalName} (&quot;PortfolioWorks&quot;) collects and uses information through this website and client portal.</p>
        <h2 className="text-2xl text-navy pt-4">Information we collect</h2>
        <p>Information you submit (name, email, phone, company, role, property addresses, unit details, photos or photo links, project descriptions); estimator inputs you choose to submit; technical data (IP address, browser, pages viewed); and advertising attribution data (UTM parameters, click identifiers such as gclid and fbclid) stored in your browser and attached to your request.</p>
        <h2 className="text-2xl text-navy pt-4">How we use it</h2>
        <p>To respond to and fulfill project requests; schedule walkthroughs; prepare estimates; manage projects; send project updates; measure which advertising and pages produce requests; and improve our services.</p>
        <h2 className="text-2xl text-navy pt-4">Cookies, analytics and advertising</h2>
        <p>With your consent we use Google Analytics, Google Ads and Meta (Facebook/Instagram) measurement tools. When you submit a request, we may send hashed (SHA-256) contact information to Google and Meta to measure ad performance (enhanced conversions / Conversions API). You can decline non-essential cookies in our consent banner.</p>
        <h2 className="text-2xl text-navy pt-4">Text messages</h2>
        <p>We send text messages only if you opt in. Message frequency varies; message and data rates may apply. Reply STOP to opt out or HELP for help. We do not sell or share mobile opt-in data with third parties for their marketing.</p>
        <h2 className="text-2xl text-navy pt-4">Sharing</h2>
        <p>We share information with service providers that help us operate (CRM, hosting, analytics, communications) and with subcontractors as needed to perform your project. We do not sell personal information.</p>
        <h2 className="text-2xl text-navy pt-4">Retention & security</h2>
        <p>We keep project records for as long as needed for warranty, accounting and legal purposes. Portal access is limited to the properties assigned to each user.</p>
        <h2 className="text-2xl text-navy pt-4">Contact</h2>
        <p>{site.email}</p>
      </Container>
    </section>
  );
}
