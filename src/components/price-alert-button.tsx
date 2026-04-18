"use client";

import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthDialog } from "@/components/auth-dialog";

interface PriceAlertButtonProps {
  productId: number;
  currentPrice: number | null;
  storeId?: number;
}

interface Alert {
  id: number;
  targetPrice: string;
  isActive: boolean;
}

export function PriceAlertButton({
  productId,
  currentPrice,
  storeId,
}: PriceAlertButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [targetPrice, setTargetPrice] = React.useState("");
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Check auth on mount
  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        setIsAuthenticated(r.ok);
        return r.ok;
      })
      .then((ok) => {
        if (ok) {
          void loadAlerts();
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const loadAlerts = React.useCallback(async () => {
    try {
      const response = await fetch("/api/alerts");
      if (response.ok) {
        const data: unknown = await response.json();
        if (Array.isArray(data)) {
          const productAlerts = data.filter(
            (a: Record<string, unknown>) =>
              a["productId"] === productId && a["isActive"] === true,
          ) as Alert[];
          setAlerts(productAlerts);
        }
      }
    } catch {
      // Silently fail
    }
  }, [productId]);

  const handleClick = React.useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    setShowForm(true);
    // Pre-fill with 10% below current price
    if (currentPrice) {
      setTargetPrice((currentPrice * 0.9).toFixed(2));
    }
  }, [isAuthenticated, currentPrice]);

  const handleCreateAlert = React.useCallback(async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        productId,
        targetPrice: price,
      };
      if (storeId !== undefined) {
        body["storeId"] = storeId;
      }

      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setShowForm(false);
        await loadAlerts();
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [productId, storeId, targetPrice, loadAlerts]);

  const handleDeleteAlert = React.useCallback(
    async (alertId: number) => {
      try {
        const response = await fetch(`/api/alerts?id=${alertId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await loadAlerts();
        }
      } catch {
        // Silently fail
      }
    },
    [loadAlerts],
  );

  const hasActiveAlerts = alerts.length > 0;

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="gap-1"
        >
          {hasActiveAlerts ? (
            <BellRing className="h-4 w-4 text-yellow-500" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {hasActiveAlerts ? "Alert set" : "Set price alert"}
        </Button>

        {showForm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Alert below $</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="h-8 w-24"
            />
            <Button
              size="sm"
              onClick={handleCreateAlert}
              disabled={loading || !targetPrice}
            >
              {loading ? "..." : "Set"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <BellRing className="h-3 w-3 text-yellow-500" />
            <span>Alert when below ${alert.targetPrice}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleDeleteAlert(alert.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={() => {
          setShowAuthDialog(false);
          setIsAuthenticated(true);
        }}
      />
    </>
  );
}
