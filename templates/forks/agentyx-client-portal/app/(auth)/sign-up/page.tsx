import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="text-sm text-muted-foreground">Create your tenant account.</p>
        <Link href="/dashboard" className="block w-full rounded-md bg-primary px-4 py-2 text-center text-primary-foreground">
          Continue (placeholder)
        </Link>
      </div>
    </div>
  );
}
