"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateNotificationPreferenceGroup,
  updateNotificationPreferenceValue,
} from "@/lib/actions/notification-actions";
import { Bell, Mail, ShieldAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { NotificationType } from "@prisma/client";

type Preference = {
  type: NotificationType;
  label: string;
  group: string;
  groupLabel: string;
  severity: string;
  severityLabel: string;
  internal: boolean;
  email: boolean;
  critical: boolean;
};

type EmailStatus = {
  status: string;
  label: string;
  available: boolean;
  detail: string;
};

export function NotificationPreferencesClient({
  preferences,
  emailStatus,
}: {
  preferences: Preference[];
  emailStatus: EmailStatus;
}) {
  const [items, setItems] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const grouped = new Map<string, Preference[]>();
    for (const preference of items) {
      grouped.set(preference.group, [
        ...(grouped.get(preference.group) ?? []),
        preference,
      ]);
    }
    return Array.from(grouped.entries()).map(([group, groupItems]) => ({
      group,
      label: groupItems[0]?.groupLabel ?? group,
      items: groupItems,
    }));
  }, [items]);

  function updateLocal(
    type: NotificationType,
    channel: "internal" | "email",
    enabled: boolean,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.type === type
          ? {
              ...item,
              [channel]: item.critical && channel === "internal" ? true : enabled,
            }
          : item,
      ),
    );
  }

  function savePreference(
    type: NotificationType,
    channel: "internal" | "email",
    enabled: boolean,
  ) {
    const previous = items;
    updateLocal(type, channel, enabled);
    startTransition(async () => {
      try {
        await updateNotificationPreferenceValue({ type, channel, enabled });
        toast.success("Preferencia atualizada.");
      } catch {
        setItems(previous);
        toast.error("Nao foi possivel salvar a preferencia.");
      }
    });
  }

  function saveGroup(
    group: string,
    channel: "internal" | "email",
    enabled: boolean,
  ) {
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.group === group
          ? {
              ...item,
              [channel]: item.critical && channel === "internal" ? true : enabled,
            }
          : item,
      ),
    );
    startTransition(async () => {
      try {
        await updateNotificationPreferenceGroup({ group, channel, enabled });
        toast.success("Preferencia atualizada.");
      } catch {
        setItems(previous);
        toast.error("Nao foi possivel salvar a preferencia.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <Mail className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Canal de e-mail: {emailStatus.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emailStatus.detail}
            </p>
          </div>
        </div>
        <Badge variant={emailStatus.available ? "outline" : "destructive"}>
          {emailStatus.status === "CONFIGURED" ? "Configurado" : emailStatus.label}
        </Badge>
      </div>

      {groups.map((group) => (
        <section key={group.group} className="border">
          <div className="flex flex-col gap-3 border-b bg-muted/25 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.items.length} tipo(s) de notificacao
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => saveGroup(group.group, "internal", true)}
              >
                <Bell className="size-4" />
                Todos internos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || !emailStatus.available}
                title={!emailStatus.available ? emailStatus.detail : undefined}
                onClick={() => saveGroup(group.group, "email", true)}
              >
                <Mail className="size-4" />
                Todos por e-mail
              </Button>
            </div>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {group.items.map((preference) => (
              <div
                key={preference.type}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {preference.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {preference.groupLabel}
                    </p>
                  </div>
                  <Badge
                    variant={preference.critical ? "destructive" : "outline"}
                    className="shrink-0"
                  >
                    {preference.critical && <ShieldAlert className="size-3" />}
                    {preference.severityLabel}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  <label className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-xs text-muted-foreground">
                    <span>{preference.critical ? "Interna fixa" : "Interna"}</span>
                    <input
                      type="checkbox"
                      checked={preference.internal}
                      disabled={isPending || preference.critical}
                      className="size-4"
                      onChange={(event) =>
                        savePreference(
                          preference.type,
                          "internal",
                          event.currentTarget.checked,
                        )
                      }
                    />
                  </label>
                  <label
                    className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-xs text-muted-foreground"
                    title={!emailStatus.available ? emailStatus.detail : undefined}
                  >
                    <span>E-mail opcional</span>
                    <input
                      type="checkbox"
                      checked={preference.email}
                      disabled={isPending || !emailStatus.available}
                      className="size-4"
                      onChange={(event) =>
                        savePreference(
                          preference.type,
                          "email",
                          event.currentTarget.checked,
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Tipo de notificacao</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Interna</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Criticidade</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((preference) => (
                  <tr key={preference.type} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {preference.label}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {preference.groupLabel}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={preference.internal}
                          disabled={isPending || preference.critical}
                          className="size-4"
                          onChange={(event) =>
                            savePreference(
                              preference.type,
                              "internal",
                              event.currentTarget.checked,
                            )
                          }
                        />
                        {preference.critical ? "Ativo fixo" : "Ativo"}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                        title={!emailStatus.available ? emailStatus.detail : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={preference.email}
                          disabled={isPending || !emailStatus.available}
                          className="size-4"
                          onChange={(event) =>
                            savePreference(
                              preference.type,
                              "email",
                              event.currentTarget.checked,
                            )
                          }
                        />
                        Opcional
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          preference.critical ? "destructive" : "outline"
                        }
                      >
                        {preference.critical && (
                          <ShieldAlert className="size-3" />
                        )}
                        {preference.severityLabel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
