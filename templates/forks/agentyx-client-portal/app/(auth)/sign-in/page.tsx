import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your Google Workspace account or email/password.
        </p>
        {/* Better Auth client SDK sign-in form will go here */}
        <Link href="/dashboard" className="block w-full rounded-md bg-primary px-4 py-2 text-center text-primary-foreground">
          Continue (placeholder)
        </Link>
      </div>
    </div>
  );
}
