"use client";

import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    void signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Encerrando sessao
      </div>
    </div>
  );
}
