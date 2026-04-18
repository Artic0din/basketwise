import { ShoppingCart, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SavingsCalculator } from "@/components/savings-calculator";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="container mx-auto px-4 py-16 sm:py-24 text-center">
        <Badge variant="secondary" className="mb-4 text-sm">
          Australian Grocery Prices
        </Badge>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl max-w-3xl mx-auto">
          Stop overpaying for groceries
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Compare real prices across Coles, Woolworths, and Aldi. See if
          &lsquo;specials&rsquo; are actually savings.
        </p>
        <a href="/search">
          <Button size="lg" className="mt-8 text-base px-8">
            Start comparing
          </Button>
        </a>
      </section>

      {/* Savings calculator */}
      <section className="container mx-auto max-w-lg px-4 pb-16">
        <SavingsCalculator />
      </section>

      {/* Feature grid */}
      <section className="border-t bg-muted/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-2xl font-bold mb-8">
            Why BasketWise?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <ShoppingCart className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Real Prices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Live data from Coles, Woolworths, and Aldi. No guessing, no
                  estimates — actual shelf prices updated every 12 hours.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <TrendingDown className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle className="text-lg">Basket Optimisation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Build your shopping list and let BasketWise split it across
                  stores to minimise your total spend. Every dollar counts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <CardTitle className="text-lg">
                  Fake Special Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Powered by 60-day price history. We flag &ldquo;specials&rdquo;
                  that are at or above their recent average price.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="container mx-auto px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Prices from Coles, Woolworths &amp; Aldi — updated every 12 hours.
        </p>
      </section>
    </div>
  );
}
