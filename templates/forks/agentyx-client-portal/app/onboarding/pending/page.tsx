"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function PendingOnboardingPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const sessionResponse = await authClient.getSession();
        if (active && sessionResponse?.data?.session) {
          // If membership already exists, dashboard will load.
          window.location.href = "/dashboard";
          return;
        }
      } catch {
        // Keep user in pending page; they can sign in again later.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    checkSession();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Approval pending</h1>
        <p className="text-sm text-muted-foreground">
          Your account has been created and is waiting for tenant admin approval.
        </p>
        <p className="text-sm text-muted-foreground">
          Once approved, you can sign in and access n8n, Flowise, Paperclip, and other protected apps.
        </p>
        {loading ? <p className="text-sm">Checking session status...</p> : null}
        <div className="flex gap-3 text-sm">
          <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
            Go to sign in
          </Link>
          <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
            Reset password
          </Link>
        </div>
      </div>
    </div>
  );
}
