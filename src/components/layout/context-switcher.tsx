"use client";

import { updateActiveContext } from "@/lib/actions/context-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  ChevronDown,
  Loader2,
  MapPin,
  Shield,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type ContextOption = {
  id: string;
  name: string;
};

type WorkspaceOption = ContextOption & {
  code: string;
};

export type ContextSwitcherData = {
  canSwitch: boolean;
  canSwitchCompany: boolean;
  canSwitchWorkspace: boolean;
  companies: ContextOption[];
  workspaces: WorkspaceOption[];
  selectedCompanyId: string;
  selectedWorkspaceId: string;
};

function shortWorkspaceName(name: string) {
  return name.split(/\s[-\u2013\u2014]\s/).at(-1)?.trim() || name;
}

function ContextField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function DesktopContextSwitcher({
  context,
}: {
  context: ContextSwitcherData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedCompany = context.companies.find(
    (company) => company.id === context.selectedCompanyId,
  );
  const selectedWorkspace = context.workspaces.find(
    (workspace) => workspace.id === context.selectedWorkspaceId,
  );

  function changeContext(next: { companyId?: string; workspaceId?: string }) {
    startTransition(async () => {
      try {
        await updateActiveContext({
          companyId: next.companyId ?? context.selectedCompanyId,
          workspaceId: next.workspaceId ?? context.selectedWorkspaceId,
        });
        router.refresh();
      } catch {
        toast.error("Nao foi possivel alterar o contexto.");
      }
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex shrink-0 items-center gap-2.5 border-r border-border pr-4">
        <div
          className="flex size-7 items-center justify-center bg-primary"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        >
          <Shield className="size-3.5 text-primary-foreground" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
          AndCheck
        </span>
      </div>

      {context.canSwitchCompany && context.companies.length > 1 ? (
        <Select
          value={context.selectedCompanyId}
          onValueChange={(companyId) => changeContext({ companyId })}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-48 border-0 bg-transparent px-2 shadow-none hover:bg-muted/60 focus-visible:ring-1">
            <Building2 className="size-3.5 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Empresa
              </p>
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {context.companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-48 px-2">
          <ContextField
            label="Empresa"
            value={selectedCompany?.name ?? "-"}
            icon={Building2}
          />
        </div>
      )}

      {context.canSwitchWorkspace && context.workspaces.length > 1 ? (
        <Select
          value={context.selectedWorkspaceId}
          onValueChange={(workspaceId) => changeContext({ workspaceId })}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-64 border-0 bg-transparent px-2 shadow-none hover:bg-muted/60 focus-visible:ring-1">
            <MapPin className="size-3.5 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Workspace
              </p>
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {context.workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-64 px-2">
          <ContextField
            label="Workspace"
            value={selectedWorkspace?.name ?? "-"}
            icon={MapPin}
          />
        </div>
      )}

      {isPending && <Loader2 className="size-3.5 animate-spin text-primary" />}
    </div>
  );
}

export function MobileContextSwitcher({
  context,
}: {
  context: ContextSwitcherData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedCompany = context.companies.find(
    (company) => company.id === context.selectedCompanyId,
  );
  const selectedWorkspace = context.workspaces.find(
    (workspace) => workspace.id === context.selectedWorkspaceId,
  );

  function changeContext(next: { companyId?: string; workspaceId?: string }) {
    startTransition(async () => {
      try {
        await updateActiveContext({
          companyId: next.companyId ?? context.selectedCompanyId,
          workspaceId: next.workspaceId ?? context.selectedWorkspaceId,
        });
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Nao foi possivel alterar o contexto.");
      }
    });
  }

  if (!context.canSwitch) {
    return (
      <div className="min-w-0 flex-1 px-3">
        <div className="min-w-0 rounded-md border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5 py-1.5">
          <p className="truncate text-[10px] font-semibold text-sidebar-foreground">
            {selectedCompany?.name ?? "-"}
          </p>
          <p className="truncate text-[9px] text-sidebar-foreground/45">
            {selectedWorkspace
              ? shortWorkspaceName(selectedWorkspace.name)
              : "-"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 flex-1 px-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5 py-1.5 text-left"
        aria-expanded={open}
        aria-label="Alterar contexto ativo"
      >
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-sidebar-foreground">
            {selectedCompany?.name ?? "-"}
          </p>
          <p className="truncate text-[9px] text-sidebar-foreground/45">
            {selectedWorkspace
              ? shortWorkspaceName(selectedWorkspace.name)
              : "-"}
          </p>
        </div>
        {isPending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-sidebar-foreground/60" />
        ) : open ? (
          <X className="size-3.5 shrink-0 text-sidebar-foreground/60" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-sidebar-foreground/60" />
        )}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-14 z-50 border-b border-border bg-background p-4 shadow-lg">
          <div className="mx-auto grid max-w-md gap-4">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Empresa
              </p>
              {context.canSwitchCompany && context.companies.length > 1 ? (
                <Select
                  value={context.selectedCompanyId}
                  onValueChange={(companyId) => changeContext({ companyId })}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {context.companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ContextField
                  label="Empresa ativa"
                  value={selectedCompany?.name ?? "-"}
                  icon={Building2}
                />
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Workspace
              </p>
              {context.canSwitchWorkspace && context.workspaces.length > 1 ? (
                <Select
                  value={context.selectedWorkspaceId}
                  onValueChange={(workspaceId) =>
                    changeContext({ workspaceId })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {context.workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ContextField
                  label="Workspace ativo"
                  value={selectedWorkspace?.name ?? "-"}
                  icon={MapPin}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
