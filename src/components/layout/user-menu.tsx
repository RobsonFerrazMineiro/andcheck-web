"use client";

import { Building2, LogOut, MapPin, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface UserMenuProps {
  name: string;
  email: string;
  roleLabel: string;
  companyName: string;
  workspaceName: string;
  sessionStatus: string;
}

export function UserMenu({
  name,
  email,
  roleLabel,
  companyName,
  workspaceName,
  sessionStatus,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2.5 rounded px-2 py-1 text-left transition-colors hover:bg-muted"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Abrir perfil do usuario"
      >
        <div className="hidden min-w-0 max-w-44 text-right xl:block">
          <p className="truncate text-xs font-medium leading-none">{name}</p>
          <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">
            {roleLabel}
          </p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <User className="size-4 text-primary" />
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Detalhes do perfil"
          className="absolute right-0 top-12 z-50 w-80 border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b bg-muted/25 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <User className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {email}
                </p>
                <span className="mt-2 inline-flex border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <ProfileRow icon={Building2} label="Empresa" value={companyName} />
            <ProfileRow icon={MapPin} label="Workspace atual" value={workspaceName} />
            <ProfileRow icon={ShieldCheck} label="Sessao" value={sessionStatus} status />
          </div>

          <div className="border-t p-2">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="size-3.5" />
              Meu Perfil
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sair do sistema
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  status = false,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  status?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold">
          {status && (
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />
          )}
          {value}
        </p>
      </div>
    </div>
  );
}
