"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Power, Save } from "lucide-react";

import { ActiveStatusBadge } from "@/components/shared/active-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOperationalArea,
  setOperationalAreaActive,
  updateOperationalArea,
} from "@/lib/actions/workspace-actions";
import { surface, typography } from "@/lib/design-system";

type OperationalArea = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  _count: { scaffolds: number };
};

export function OperationalAreasManager({
  workspaceId,
  canManage,
  areas,
}: {
  workspaceId: string;
  canManage: boolean;
  areas: OperationalArea[];
}) {
  const [editingArea, setEditingArea] = useState<OperationalArea | null>(null);
  const tableGrid = canManage
    ? "lg:grid-cols-[minmax(160px,1.2fr)_100px_minmax(220px,1.4fr)_72px_82px_72px]"
    : "lg:grid-cols-[minmax(160px,1.2fr)_100px_minmax(220px,1.4fr)_72px_82px]";

  return (
    <div className="space-y-3">
      {canManage && (
        <form
          action={createOperationalArea}
          className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1.4fr)_auto]"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Input
            name="name"
            placeholder="Nome da área"
            required
            className="h-8 rounded-md text-xs"
          />
          <Input
            name="code"
            placeholder="Código"
            className="h-8 rounded-md text-xs"
          />
          <Input
            name="description"
            placeholder="Descrição"
            className="h-8 rounded-md text-xs"
          />
          <Button type="submit" size="sm" className="h-8">
            <Plus className="size-3.5" /> Adicionar
          </Button>
        </form>
      )}

      {areas.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma área operacional"
          description="Cadastre as áreas do workspace para padronizar o formulário de novos andaimes."
          className="border-dashed"
        />
      ) : (
        <div className="max-w-full overflow-hidden rounded-lg border border-border bg-card">
          <div
            className={`hidden gap-2 border-b lg:grid ${tableGrid} ${surface.tableHeader}`}
          >
            <span>Área</span>
            <span>Código</span>
            <span>Descrição</span>
            <span className="text-right">Andaimes</span>
            <span>Status</span>
            {canManage && <span className="text-right">Ações</span>}
          </div>
          {areas.map((area, index) => (
            <div
              key={area.id}
              className={`flex items-start gap-3 px-4 py-3 lg:grid ${tableGrid} lg:items-center lg:gap-2 lg:px-3 ${index % 2 ? "bg-muted/20" : "bg-card"}`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`break-words text-foreground lg:truncate ${typography.bodyStrong}`}
                >
                  {area.name}
                </p>
                <p
                  className={`mt-1 break-all text-muted-foreground lg:hidden ${typography.codeMuted}`}
                >
                  {area.code || "Sem código"}
                </p>
              </div>
              <p
                className={`hidden break-all text-muted-foreground lg:block ${typography.codeMuted}`}
              >
                {area.code || "-"}
              </p>
              <p
                className={`hidden truncate text-muted-foreground lg:block ${typography.sectionDescription}`}
              >
                {area.description || "Sem descrição"}
              </p>
              <p className={`hidden text-right lg:block ${typography.code}`}>
                {area._count.scaffolds}
              </p>
              <ActiveStatusBadge
                active={area.isActive}
                activeLabel="Ativa"
                inactiveLabel="Inativa"
                compact
              />
              {canManage && (
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Editar"
                    aria-label={`Editar área ${area.name}`}
                    onClick={() => setEditingArea(area)}
                  >
                    <Pencil />
                  </Button>
                  <form
                    action={setOperationalAreaActive.bind(
                      null,
                      area.id,
                      !area.isActive,
                    )}
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon-sm"
                      title={area.isActive ? "Desativar" : "Ativar"}
                      aria-label={
                        area.isActive
                          ? `Desativar área ${area.name}`
                          : `Ativar área ${area.name}`
                      }
                    >
                      <Power />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
          <div className={`border-t bg-muted/30 px-4 py-2 text-muted-foreground/50 ${typography.panelSubtitle}`}>
            {areas.length} registro(s) • Áreas operacionais
          </div>
        </div>
      )}

      <FormModal
        open={Boolean(editingArea)}
        title="Editar área operacional"
        description="Atualize os dados cadastrais da área deste workspace."
        onClose={() => setEditingArea(null)}
        maxWidth="max-w-xl"
      >
        {editingArea && (
          <form action={updateOperationalArea} className="grid gap-3">
            <input type="hidden" name="areaId" value={editingArea.id} />
            <Input
              name="name"
              defaultValue={editingArea.name}
              required
              className="h-9 rounded-md text-sm"
            />
            <Input
              name="code"
              defaultValue={editingArea.code ?? ""}
              placeholder="Código"
              className="h-9 rounded-md text-sm"
            />
            <Input
              name="description"
              defaultValue={editingArea.description ?? ""}
              placeholder="Descrição"
              className="h-9 rounded-md text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingArea(null)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <Save className="size-4" /> Salvar
              </Button>
            </div>
          </form>
        )}
      </FormModal>
    </div>
  );
}
