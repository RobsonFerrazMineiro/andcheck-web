"use client";

import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";

interface UserMenuProps {
  name: string;
  email: string;
  roleLabel: string;
}

export function UserMenu({ name, email, roleLabel }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden xl:block">
        <p className="text-xs font-medium leading-none">{name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{email}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <User className="w-3.5 h-3.5 text-primary" />
      </div>
      <span
        className="hidden xl:inline-block text-[9px] font-mono uppercase tracking-wider
                       text-muted-foreground/50 border border-border rounded px-1.5 py-0.5"
      >
        {roleLabel}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
        title="Sair"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
