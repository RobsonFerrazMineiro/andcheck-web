"use client";

import { Building2, LogOut, MapPin, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useExclusiveMenu } from "@/hooks/use-exclusive-menu";
import { typography } from "@/lib/design-system";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const { toggleMenu } = useExclusiveMenu(open, setOpen);

  useDialogFocus(panelRef, open, () => setOpen(false));

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
      <Button
        type="button"
        variant="ghost"
        onClick={toggleMenu}
        className="h-auto items-center gap-2.5 px-2 py-1 text-left"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="user-menu-panel"
        aria-label={open ? "Fechar perfil do usuário" : "Abrir perfil do usuário"}
      >
        <div className="hidden min-w-0 max-w-44 text-right xl:block">
          <p className={`truncate leading-none ${typography.bodyStrong}`}>{name}</p>
          <p className={`mt-1 truncate ${typography.bodyStrong} text-muted-foreground`}>
            {roleLabel}
          </p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <User className="size-4 text-primary" />
        </div>
      </Button>

      {open && (
        <div
          ref={panelRef}
          id="user-menu-panel"
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="user-menu-title"
          className="absolute right-0 top-12 z-50 w-80 border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b bg-muted/25 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <User className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p id="user-menu-title" className={`truncate ${typography.bodyStrong}`}>
                  {name}
                </p>
                <p className={`mt-0.5 truncate ${typography.sectionDescription} text-muted-foreground`}>
                  {email}
                </p>
                <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 ${typography.metaStrong} text-muted-foreground`}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <ProfileRow icon={Building2} label="Empresa" value={companyName} />
            <ProfileRow icon={MapPin} label="Workspace atual" value={workspaceName} />
            <ProfileRow icon={ShieldCheck} label="Sessão" value={sessionStatus} status />
          </div>

          <div className="border-t p-2">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className={`flex w-full items-center gap-2 px-3 py-2 ${typography.action} text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`}
            >
              <User className="size-3.5" />
              Meu Perfil
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`h-auto w-full justify-start gap-2 px-3 py-2 ${typography.action} text-muted-foreground hover:text-foreground`}
            >
              <LogOut className="size-3.5" />
              Sair do sistema
            </Button>
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
        <p className={`${typography.sectionLabel} text-muted-foreground/60`}>
          {label}
        </p>
        <p className={`mt-0.5 truncate ${typography.bodyStrong}`}>
          {status && (
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />
          )}
          {value}
        </p>
      </div>
    </div>
  );
}
