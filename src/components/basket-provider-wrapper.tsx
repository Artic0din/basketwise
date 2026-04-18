"use client";

import type { ReactNode } from "react";
import { BasketProvider } from "@/lib/basket-store";
import { BasketButton } from "@/components/basket-button";

/**
 * Client component wrapper that provides basket context and the floating basket button.
 * Used in the root layout (which is a server component) to wrap the entire app.
 */
export function BasketProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <BasketProvider>
      {children}
      <BasketButton />
    </BasketProvider>
  );
}
