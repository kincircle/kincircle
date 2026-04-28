import { Header } from "@/components/layout/Header";
import { LoginForm } from "@/components/auth/LoginForm";
import { isGoogleAuthEnabled } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <LoginForm googleAuthEnabled={isGoogleAuthEnabled} />
      </main>
    </div>
  );
}
