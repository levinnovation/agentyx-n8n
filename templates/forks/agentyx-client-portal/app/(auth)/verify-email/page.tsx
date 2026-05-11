"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!token) {
        setStatus("error");
        setError("Missing verification token.");
        return;
      }

      try {
        await authClient.verifyEmail({ token });
        if (active) {
          setStatus("success");
        }
      } catch (verifyError) {
        if (active) {
          setStatus("error");
          setError((verifyError as Error).message || "Email verification failed.");
        }
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Verify email</h1>
        {status === "idle" ? <p className="text-sm">Verifying your email...</p> : null}
        {status === "success" ? (
          <p className="text-sm text-green-700">Your email is verified. You can continue to onboarding.</p>
        ) : null}
        {status === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
        <Link href="/onboarding/pending" className="text-sm text-primary underline-offset-4 hover:underline">
          Continue
        </Link>
      </div>
    </div>
  );
}
