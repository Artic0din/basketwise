import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - BasketWise",
  description: "How BasketWise handles your data under the Australian Privacy Act.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: 18 April 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <p className="text-muted-foreground">
            BasketWise is committed to protecting your privacy in accordance with
            the Australian Privacy Act 1988 (Cth) and the Australian Privacy
            Principles (APPs). This policy explains what information we collect,
            how we use it, and your rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Information we collect
          </h2>
          <p className="text-muted-foreground mb-2">
            <strong>Anonymous users:</strong> We do not collect any personal
            information. Your basket and preferences are stored locally in your
            browser using localStorage. This data never leaves your device.
          </p>
          <p className="text-muted-foreground mb-2">
            <strong>Registered users:</strong> When you create an account, we
            collect your email address only. This is used for authentication via
            magic link and to sync your saved baskets across devices.
          </p>
          <p className="text-muted-foreground">
            <strong>Premium subscribers:</strong> Payment processing is handled
            entirely by Stripe. We do not store your card details. We retain only
            the Stripe subscription ID to manage your subscription status.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">How we use your data</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>To authenticate your account and enable basket syncing</li>
            <li>To manage your premium subscription</li>
            <li>To send price alerts you have explicitly opted into</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            We do not use your data for advertising, profiling, or any purpose
            beyond the features you directly use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Tracking and analytics
          </h2>
          <p className="text-muted-foreground">
            BasketWise does not use third-party tracking, cookies for advertising,
            or analytics platforms. We do not share, sell, or disclose your data
            to any third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Data storage</h2>
          <p className="text-muted-foreground">
            Your data is stored on servers within Australia or in regions
            compliant with the APPs. We use industry-standard encryption for data
            in transit (TLS) and at rest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Your rights</h2>
          <p className="text-muted-foreground">
            Under the Australian Privacy Act, you have the right to access,
            correct, or request deletion of your personal information at any
            time. To exercise these rights, contact us at the address below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about this privacy policy or wish to make a
            data request, contact us at{" "}
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
