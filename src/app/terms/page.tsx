import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - BasketWise",
  description: "Terms of service for using BasketWise.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: 18 April 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">Acceptance of terms</h2>
          <p className="text-muted-foreground">
            By using BasketWise, you agree to these terms. If you do not agree,
            please do not use the service. We may update these terms from time to
            time, and continued use constitutes acceptance of any changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Price data and accuracy
          </h2>
          <p className="text-muted-foreground">
            BasketWise provides grocery price data for comparison purposes only.
            Prices are scraped from publicly available sources and may not
            reflect current in-store prices. We make reasonable efforts to keep
            data accurate and up to date, but we do not guarantee the accuracy,
            completeness, or timeliness of any pricing information.
          </p>
          <p className="text-muted-foreground mt-2">
            Always confirm prices at the retailer before making purchasing
            decisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Service availability</h2>
          <p className="text-muted-foreground">
            BasketWise is provided on an &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; basis. We do not guarantee uninterrupted or
            error-free operation. We reserve the right to modify, suspend, or
            discontinue the service at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Premium subscriptions
          </h2>
          <p className="text-muted-foreground mb-2">
            Premium features are available via a paid subscription processed
            through Stripe. By subscribing, you authorise recurring charges at
            the rate displayed at checkout.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>
              You may cancel your subscription at any time. Access to premium
              features will continue until the end of the current billing period.
            </li>
            <li>
              We do not offer refunds for partial billing periods.
            </li>
            <li>
              We reserve the right to change pricing with 30 days&apos; notice to
              existing subscribers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">User accounts</h2>
          <p className="text-muted-foreground">
            You are responsible for maintaining the security of your account. Do
            not share your magic link with others. We reserve the right to
            suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Intellectual property
          </h2>
          <p className="text-muted-foreground">
            BasketWise and its content, features, and functionality are owned by
            BasketWise and are protected by Australian and international
            copyright laws. You may not reproduce, distribute, or create
            derivative works from this service without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Limitation of liability
          </h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by Australian law, BasketWise shall
            not be liable for any indirect, incidental, or consequential damages
            arising from your use of the service, including but not limited to
            purchasing decisions made based on price data displayed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Governing law</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of the State of Victoria,
            Australia. Any disputes shall be subject to the exclusive
            jurisdiction of the courts of Victoria.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:privacy@basketwise.com.au"
              className="underline hover:text-foreground"
            >
              privacy@basketwise.com.au
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
