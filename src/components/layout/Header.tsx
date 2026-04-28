"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={session ? "/dashboard" : "/"} className="text-xl font-bold tracking-tight">
          KinCircle
        </Link>
        <nav className="flex items-center gap-4">
          {isPending ? null : session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {session.user.email}
              </span>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
