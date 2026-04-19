import { TrendingDown, AlertTriangle, ShoppingCart } from "lucide-react";
import { SavingsCalculator } from "@/components/savings-calculator";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="container mx-auto grid items-end gap-10 px-6 pb-12 pt-16 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-leaf-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf-500" />
            Australian grocery comparison
          </div>
          <h1 className="font-display text-[clamp(48px,8vw,96px)] leading-[0.92] tracking-tight text-ink-900">
            Know what your{" "}
            <em className="text-leaf-500">basket</em>
            <br />
            really costs.
          </h1>
          <p className="mt-5 max-w-[520px] text-lg leading-relaxed text-ink-700">
            Compare real prices across Woolworths, Coles, ALDI and IGA.
            See if &lsquo;specials&rsquo; are actually savings.
          </p>
          <div className="mt-6 flex flex-wrap gap-8 font-mono text-xs text-ink-500">
            <div>
              <strong className="block text-[22px] font-medium tabular-nums text-ink-900">
                4
              </strong>
              retailers tracked
            </div>
            <div>
              <strong className="block text-[22px] font-medium tabular-nums text-ink-900">
                82k
              </strong>
              products indexed
            </div>
            <div>
              <strong className="block text-[22px] font-medium tabular-nums text-ink-900">
                2.4m
              </strong>
              price points / week
            </div>
          </div>
          <a href="/search">
            <button className="mt-8 inline-flex items-center gap-2 rounded-lg bg-leaf-500 px-6 py-3 text-sm font-medium text-white bw-transition transition-colors hover:bg-leaf-600">
              Start comparing
            </button>
          </a>
        </div>

        {/* Basket summary card */}
        <div className="hidden rounded-lg border border-cream-200 bg-white p-5 shadow-md lg:block">
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-widest text-ink-500">
            // Basket summary - 12 items
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {[
                { store: "Woolworths", mark: "W", color: "bg-[var(--store-woolies)]", total: "$94.37", diff: "+$6.20" },
                { store: "Coles", mark: "C", color: "bg-[var(--store-coles)]", total: "$91.84", diff: "+$3.67" },
                { store: "ALDI", mark: "A", color: "bg-gradient-to-br from-[var(--store-aldi-blue)] from-55% via-[var(--store-aldi-yellow)] via-75% to-[var(--store-aldi-red)]", total: "$88.17", diff: null },
                { store: "IGA", mark: "I", color: "bg-[var(--store-iga)]", total: "$97.02", diff: "+$8.85" },
              ].map((row, i) => (
                <tr
                  key={row.store}
                  className={i < 3 ? "border-b border-cream-200" : ""}
                >
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                      <span
                        className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold text-white ${row.color}`}
                      >
                        {row.mark}
                      </span>
                      {row.store}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-price font-medium">
                    {row.total}
                  </td>
                  <td className="w-20 py-2.5 text-right">
                    {row.diff ? (
                      <span className="inline-flex items-center rounded-full border border-tomato-100 bg-tomato-100 px-2 py-0.5 text-[10.5px] font-medium text-tomato-500">
                        {row.diff}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-leaf-200 bg-leaf-50 px-2 py-0.5 text-[10.5px] font-medium text-leaf-700">
                        cheapest
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <a
              href="/basket"
              className="flex-1 rounded-lg bg-leaf-500 px-3 py-2 text-center text-xs font-medium text-white bw-transition transition-colors hover:bg-leaf-600"
            >
              View list
            </a>
            <button className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-xs font-medium text-ink-900 bw-transition transition-colors hover:bg-cream-100">
              Share
            </button>
          </div>
        </div>
      </section>

      {/* Savings calculator */}
      <section className="container mx-auto max-w-lg px-6 pb-16">
        <SavingsCalculator />
      </section>

      {/* Feature grid */}
      <section className="border-t border-cream-200 bg-cream-100/40 py-16">
        <div className="container mx-auto px-6">
          <h2 className="mb-8 text-center font-display text-3xl text-ink-900">
            Why BasketWise?
          </h2>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-cream-200 bg-white p-6">
              <ShoppingCart className="mb-3 h-8 w-8 text-leaf-500" />
              <h3 className="mb-2 text-lg font-medium text-ink-900">
                Real Prices
              </h3>
              <p className="text-sm text-ink-700">
                Live data from Coles, Woolworths, ALDI and IGA. No guessing, no
                estimates — actual shelf prices updated every 12 hours.
              </p>
            </div>

            <div className="rounded-lg border border-cream-200 bg-white p-6">
              <TrendingDown className="mb-3 h-8 w-8 text-leaf-500" />
              <h3 className="mb-2 text-lg font-medium text-ink-900">
                Basket Optimisation
              </h3>
              <p className="text-sm text-ink-700">
                Build your shopping list and let BasketWise split it across
                stores to minimise your total spend. Every dollar counts.
              </p>
            </div>

            <div className="rounded-lg border border-cream-200 bg-white p-6">
              <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" />
              <h3 className="mb-2 text-lg font-medium text-ink-900">
                Fake Special Detection
              </h3>
              <p className="text-sm text-ink-700">
                Powered by 60-day price history. We flag &ldquo;specials&rdquo;
                that are at or above their recent average price.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust line */}
      <section className="container mx-auto px-6 py-12 text-center">
        <p className="font-mono text-xs text-ink-500">
          Prices from Coles, Woolworths, ALDI &amp; IGA — updated every 12
          hours.
        </p>
      </section>
    </div>
  );
}
