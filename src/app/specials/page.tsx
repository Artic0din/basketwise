import { Sparkles } from "lucide-react";
import { getCategories } from "@/lib/queries";
import { SpecialsClient } from "./specials-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Specials - BasketWise",
  description:
    "Browse current specials across Coles, Woolworths, and Aldi.",
};

export default async function SpecialsPage() {
  const categories = await getCategories();
  const categoryNames = categories.map((c) => c.name);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Specials</h1>
      </div>
      <SpecialsClient categories={categoryNames} />
    </div>
  );
}
