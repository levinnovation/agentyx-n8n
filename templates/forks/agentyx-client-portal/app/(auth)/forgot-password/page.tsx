"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSent(true);
    } catch (submitError) {
      setError((submitError as Error).message || "Unable to send reset email.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send you a password reset link.
        </p>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {sent ? <p className="text-sm text-green-700">Reset link sent. Check your inbox.</p> : null}
          <button type="submit" className="block w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Send reset link
          </button>
        </form>
        <Link href="/sign-in" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
