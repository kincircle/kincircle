"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "KC";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Header() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  return (
    <header className="app-header">
      <div className="container between">
        <Link href={session ? "/dashboard" : "/"} className="brand">
          Kin<span className="accent">Circle</span>
        </Link>
        <nav className="row">
          {isPending ? null : session ? (
            <>
              <Link href="/dashboard" className="btn ghost sm">
                Dashboard
              </Link>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
              >
                Sign out
              </button>
              <span className="avatar">
                {initials(session.user.name, session.user.email)}
              </span>
            </>
          ) : (
            <Link href="/login" className="btn sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
