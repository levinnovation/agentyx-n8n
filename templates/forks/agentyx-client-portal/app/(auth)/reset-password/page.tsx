"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await authClient.resetPassword({
        token,
        newPassword: password,
      });
      setDone(true);
    } catch (submitError) {
      setError((submitError as Error).message || "Unable to reset password.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter a new password for your account.</p>
        {!token ? (
          <p className="text-sm text-red-600">Invalid reset link. Missing token.</p>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {done ? <p className="text-sm text-green-700">Password updated successfully.</p> : null}
            <button type="submit" className="block w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Reset password
            </button>
          </form>
        )}
        <Link href="/sign-in" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
