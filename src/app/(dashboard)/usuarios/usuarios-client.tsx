"use client";

import {
  CheckCircle2,
  Filter,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUser,
  deleteUser,
  setUserActive,
  updateUser,
} from "@/lib/actions/user-actions";
import { typography } from "@/lib/design-system";

type UserRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  registration: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

type RoleOption = {
  id: string;
  code: string;
  name: string;
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  HSE_HYDRO: "bg-blue-100 text-blue-700 border-blue-200",
  HSE_GERENCIADORA: "bg-cyan-100 text-cyan-700 border-cyan-200",
  ADMIN_EMPRESA: "bg-violet-100 text-violet-700 border-violet-200",
  HSE_EMPRESA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PLANEJAMENTO: "bg-amber-100 text-amber-700 border-amber-200",
  SUPERVISOR: "bg-sky-100 text-sky-700 border-sky-200",
  ENCARREGADO: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SUPERVISOR_ENCARREGADO: "bg-sky-100 text-sky-700 border-sky-200",
  MONTADOR_LIDER: "bg-slate-100 text-slate-700 border-slate-200",
  AUDITOR: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function RoleBadge({ role }: { role?: { code: string; name: string } }) {
  if (!role) {
    return (
      <Badge variant="outline" className="rounded-md text-[9px] uppercase">
        Sem perfil
      </Badge>
    );
  }

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold " +
        "uppercase tracking-wide " +
        (ROLE_BADGE[role.code] ??
          "bg-muted text-muted-foreground border-border")
      }
    >
      <ShieldCheck className="w-3 h-3" />
      {role.name}
    </span>
  );
}

export function UsuariosClient({
  initialData,
  roles,
  currentUserId,
  canDeleteUsers,
}: {
  initialData: UserRow[];
  roles: RoleOption[];
  currentUserId: string | null;
  canDeleteUsers: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const users = initialData;
  const activeCount = users.filter((user) => user.is_active).length;
  const inspectorCount = users.filter((user) =>
    user.roles.some((role) => role.code.includes("HSE")),
  ).length;
  const adminCount = users.filter((user) =>
    user.roles.some(
      (role) => role.code === "SUPER_ADMIN" || role.code === "ADMIN_EMPRESA",
    ),
  ).length;

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const role = user.roles[0];
        const matchSearch =
          !search ||
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          (user.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (user.registration ?? "")
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && user.is_active) ||
          (statusFilter === "inactive" && !user.is_active) ||
          role?.code === statusFilter;

        return matchSearch && matchStatus;
      }),
    [search, statusFilter, users],
  );

  function handleCreateUser(formData: FormData) {
    startTransition(async () => {
      const toastId = toast.loading("Criando usuário...");
      try {
        await createUser(formData);
        toast.success("Usuário criado com senha temporária andcheck@2025.", {
          id: toastId,
        });
        setShowForm(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao criar usuário.",
          { id: toastId },
        );
      }
    });
  }

  function handleUpdateUser(formData: FormData) {
    startTransition(async () => {
      const toastId = toast.loading("Atualizando usuário...");
      try {
        await updateUser(formData);
        toast.success("Usuário atualizado.", { id: toastId });
        setEditingUser(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao atualizar usuário.",
          { id: toastId },
        );
      }
    });
  }

  function handleStatus(userId: string, isActive: boolean) {
    startTransition(async () => {
      try {
        await setUserActive(userId, isActive);
        toast.success(isActive ? "Usuário ativado." : "Usuário desativado.");
      } catch {
        toast.error("Não foi possível alterar o status.");
      }
    });
  }

  function handleDelete(user: UserRow) {
    const confirmed = window.confirm(
      `Excluir definitivamente o usuário ${user.name}?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteUser(user.id);
        toast.success("Usuário excluido.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível excluir.",
        );
      }
    });
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Users className="size-4" />
            AndCheck • Usuários
          </div>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Usuários
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeCount} ativos · {users.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setShowForm((current) => !current);
          }}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 text-[10px] font-bold uppercase tracking-widest text-accent-foreground hover:bg-accent/90"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Novo Usuário
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        {(
          [
            {
              label: "Total",
              value: users.length,
              icon: Users,
              iconClass: "text-slate-500",
              border: "border-l-4 border-l-slate-500",
              valueClass: "text-slate-700",
            },
            {
              label: "Ativos",
              value: activeCount,
              icon: CheckCircle2,
              iconClass: "text-green-600",
              border: "border-l-4 border-l-green-500",
              valueClass: "text-green-700",
            },
            {
              label: "HSE",
              value: inspectorCount,
              icon: ShieldCheck,
              iconClass: "text-blue-600",
              border: "border-l-4 border-l-blue-500",
              valueClass: "text-blue-700",
            },
            {
              label: "Admins",
              value: adminCount,
              icon: KeyRound,
              iconClass: "text-purple-600",
              border: "border-l-4 border-l-purple-500",
              valueClass: "text-purple-700",
            },
          ] as Array<{
            label: string;
            value: number;
            icon: React.ElementType;
            iconClass: string;
            border: string;
            valueClass: string;
          }>
        ).map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={
                "bg-card border border-border rounded-lg p-4 shadow-sm " +
                card.border
              }
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p
                  className={`${typography.sectionLabel} leading-tight text-muted-foreground`}
                >
                  {card.label}
                </p>
                <Icon className={"h-4 w-4 shrink-0 " + card.iconClass} />
              </div>
              <p
                className={`${typography.kpiValue} leading-none ${card.valueClass}`}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {(showForm || editingUser) && (
        <form
          key={editingUser?.id ?? "new-user"}
          action={editingUser ? handleUpdateUser : handleCreateUser}
          className="bg-card border border-border rounded-lg shadow-sm p-4 space-y-4"
        >
          {editingUser && (
            <input type="hidden" name="user_id" value={editingUser.id} />
          )}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Plus className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              {editingUser ? "Edição de Usuário" : "Cadastro de Usuário"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Nome *"
              name="name"
              placeholder="Nome completo"
              defaultValue={editingUser?.name}
            />
            <Field
              label="E-mail *"
              name="email"
              placeholder="email@empresa.com"
              defaultValue={editingUser?.email}
            />
            <Field
              label="Empresa"
              name="company"
              placeholder="Hydro Alunorte"
              defaultValue={editingUser?.company ?? undefined}
            />
            <Field
              label="Matrícula"
              name="registration"
              placeholder="SUP-0001"
              defaultValue={editingUser?.registration ?? undefined}
            />
            <Field
              label="Departamento"
              name="department"
              placeholder="SMS"
              defaultValue={editingUser?.department ?? undefined}
            />
            <Field
              label="Cargo"
              name="position"
              placeholder="Supervisor"
              defaultValue={editingUser?.position ?? undefined}
            />
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-bold">
                Perfil *
              </Label>
              <Select
                name="role_id"
                required
                defaultValue={editingUser?.roles[0]?.id}
              >
                <SelectTrigger className="h-8 text-[11px] rounded-md">
                  <SelectValue placeholder="Selecionar perfil" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-bold">
                Status
              </Label>
              {editingUser?.id === currentUserId && (
                <input type="hidden" name="status" value="active" />
              )}
              <Select
                name="status"
                disabled={editingUser?.id === currentUserId}
                defaultValue={
                  editingUser?.is_active === false ? "inactive" : "active"
                }
              >
                <SelectTrigger className="h-8 text-[11px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingUser(null);
              }}
              className="h-8 rounded-md px-4 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 h-8 rounded-md px-4 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingUser ? "Atualizar Usuário" : "Salvar Usuário"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg shadow-sm p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por nome, e-mail, matrícula ou empresa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 h-8 text-[11px] rounded-md border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 h-8 text-[11px] rounded-md">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
            <SelectValue placeholder="Filtro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.code}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg bg-card border border-border shadow-sm">
        <div className="hidden lg:grid grid-cols-[40px_minmax(160px,1.5fr)_minmax(100px,1fr)_80px_minmax(140px,1.2fr)_minmax(120px,1fr)_90px_112px] gap-4 px-4 py-2.5 bg-primary border-b border-border">
          {[
            "",
            "Nome",
            "Empresa",
            "Matrícula",
            "Perfil",
            "Departamento",
            "Status",
            "Ações",
          ].map((header) => (
            <p
              key={header}
              className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60"
            >
              {header}
            </p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
              Nenhum usuário encontrado
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((user, index) => {
              const primaryRole = user.roles[0];
              const isCurrentUser = user.id === currentUserId;
              const isProtectedAdmin = user.roles.some((role) =>
                ["SUPER_ADMIN", "ADMIN_EMPRESA"].includes(role.code),
              );
              const canDeleteThisUser =
                canDeleteUsers && !isCurrentUser && !isProtectedAdmin;
              return (
                <div
                  key={user.id}
                  className={
                    "flex lg:grid lg:grid-cols-[40px_minmax(160px,1.5fr)_minmax(100px,1fr)_80px_minmax(140px,1.2fr)_minmax(120px,1fr)_90px_112px] lg:gap-4 items-center px-4 py-3 " +
                    (index % 2 === 1 ? "bg-muted/20" : "bg-card")
                  }
                >
                  <div className="flex items-center gap-3 flex-1 lg:contents">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold">
                        {initials(user.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <p className="hidden lg:block text-[11px] text-muted-foreground truncate">
                      {user.company ?? "-"}
                    </p>
                    <p className="hidden lg:block text-[11px] text-muted-foreground font-mono">
                      {user.registration ?? "-"}
                    </p>
                    <div className="hidden lg:block min-w-0">
                      <RoleBadge role={primaryRole} />
                    </div>
                    <p className="hidden lg:block text-[11px] text-muted-foreground truncate">
                      {user.department ?? "-"}
                    </p>
                    <div className="hidden lg:flex">
                      <StatusPill active={user.is_active} />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <div className="lg:hidden">
                      <StatusPill active={user.is_active} />
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      title="Editar usuário"
                      aria-label={`Editar usuário ${user.name}`}
                      onClick={() => {
                        setShowForm(false);
                        setEditingUser(user);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending || isCurrentUser}
                      onClick={() => handleStatus(user.id, !user.is_active)}
                      aria-label={
                        user.is_active
                          ? `Desativar usuário ${user.name}`
                          : `Ativar usuário ${user.name}`
                      }
                      title={
                        isCurrentUser
                          ? "Não é permitido desativar o próprio usuário."
                          : user.is_active
                            ? "Desativar usuário"
                            : "Ativar usuário"
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !canDeleteThisUser}
                      onClick={() => handleDelete(user)}
                      aria-label={`Excluir usuário ${user.name}`}
                      title={
                        isCurrentUser
                          ? "Não é permitido excluir o próprio usuário."
                          : isProtectedAdmin
                            ? "Não é permitido excluir administradores."
                            : !canDeleteUsers
                              ? "Você não tem permissão para excluir usuários."
                              : undefined
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2 bg-muted/30 border-t border-border">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            {filtered.length} registro(s) · Módulo de usuários · AndCheck
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider font-bold">
        {label}
      </Label>
      <Input
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={label.includes("*")}
        className="h-8 text-[11px] rounded-md"
      />
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 border text-[10px] font-bold " +
        (active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-600 border-slate-200")
      }
    >
      {active ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}
