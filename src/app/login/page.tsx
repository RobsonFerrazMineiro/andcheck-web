import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">AndCheck</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão do ciclo de vida de andaimes industriais
            </p>
          </div>
        </div>
        <Suspense
          fallback={<div className="h-64 animate-pulse bg-muted rounded-xl" />}
        >
          <LoginForm />
        </Suspense>
        <div className="mt-4 text-center text-xs text-muted-foreground space-y-0.5">
          <p>admin@andcheck.com / andcheck@2025</p>
          <p>inspetor@andcheck.com / inspetor@2025</p>
        </div>
      </div>
    </main>
  );
}
