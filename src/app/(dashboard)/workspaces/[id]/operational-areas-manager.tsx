"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Save } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FormModal } from "@/components/shared/form-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOperationalArea,
  setOperationalAreaActive,
  updateOperationalArea,
} from "@/lib/actions/workspace-actions";

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

  return (
    <div className="space-y-3">
      {canManage && (
        <form
          action={createOperationalArea}
          className="grid gap-2 border border-border bg-muted/20 p-2 md:grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1.4fr)_auto]"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Input
            name="name"
            placeholder="Nome da área"
            required
            className="h-8 rounded-md text-xs"
          />
          <Input name="code" placeholder="Código" className="h-8 rounded-md text-xs" />
          <Input
            name="description"
            placeholder="Descrição"
            className="h-8 rounded-md text-xs"
          />
          <Button type="submit" size="sm" className="h-8 rounded-md text-xs">
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
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40">
              <tr className="border-b border-border text-left text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-right">Andaimes</th>
                <th className="px-3 py-2">Status</th>
                {canManage && <th className="px-3 py-2 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr
                  key={area.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-2 align-top font-medium">{area.name}</td>
                  <td className="px-3 py-2 align-top">
                    {area.code ? (
                      <span className="font-mono text-xs">{area.code}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="max-w-md px-3 py-2 align-top text-xs text-muted-foreground">
                    {area.description || "Sem descrição"}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-mono text-xs">
                    {area._count.scaffolds}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge
                      variant={area.isActive ? "default" : "secondary"}
                      className="rounded-md text-[9px]"
                    >
                      {area.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md text-xs"
                          onClick={() => setEditingArea(area)}
                        >
                          <Pencil className="size-3.5" /> Editar
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
                            size="sm"
                            className="h-8 rounded-md text-xs"
                          >
                            {area.isActive ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
