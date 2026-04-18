"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AuthState = "idle" | "loading" | "success" | "error";

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<AuthState>("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;

      setState("loading");
      setErrorMessage("");

      try {
        const response = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const data: unknown = await response.json();
          const msg =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof (data as Record<string, unknown>)["error"] === "string"
              ? ((data as Record<string, unknown>)["error"] as string)
              : "Something went wrong";
          throw new Error(msg);
        }

        setState("success");
        // Trigger parent callback after short delay
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } catch (error) {
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong",
        );
      }
    },
    [email, onSuccess],
  );

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset state on close
        setEmail("");
        setState("idle");
        setErrorMessage("");
      }
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to BasketWise</DialogTitle>
          <DialogDescription>
            Enter your email to receive a magic sign-in link.
          </DialogDescription>
        </DialogHeader>

        {state === "success" ? (
          <div className="py-6 text-center">
            <div className="mb-2 text-2xl">Check your email</div>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to <strong>{email}</strong>.
              Click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={state === "loading"}
              />
            </div>
            {state === "error" && errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={state === "loading" || !email.trim()}
            >
              {state === "loading" ? "Sending..." : "Send magic link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
