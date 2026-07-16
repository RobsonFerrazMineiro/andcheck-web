"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type {
  ChecklistCategory,
  ChecklistValue,
} from "@/lib/checklist-template";
import { fileToDataUrl } from "@/lib/offline/offline-file-client";
import { uploadFile } from "@/lib/upload-file";
import { toast } from "sonner";

interface Props {
  category: ChecklistCategory["category"];
  items: ChecklistCategory["items"];
  values: ChecklistValue[];
  onChange: (updated: ChecklistValue[]) => void;
}

const STATUSES: {
  value: ChecklistValue["status"];
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  hoverClass: string;
}[] = [
  {
    value: "conforme",
    label: "Conforme",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
    hoverClass: "hover:border-emerald-300",
  },
  {
    value: "nao_conforme",
    label: "Não Conforme",
    icon: <XCircle className="w-3.5 h-3.5" />,
    activeClass: "bg-red-100 text-red-700 border-red-300",
    hoverClass: "hover:border-red-300",
  },
  {
    value: "nao_aplicavel",
    label: "N/A",
    icon: <MinusCircle className="w-3.5 h-3.5" />,
    activeClass: "bg-slate-200 text-slate-700 border-slate-300",
    hoverClass: "hover:border-slate-300",
  },
];

export default function ChecklistSection({
  category,
  items,
  values,
  onChange,
}: Props) {
  const photoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (
    itemIndex: number,
    field: keyof ChecklistValue,
    value: string,
  ) => {
    const updated = [...values];
    updated[itemIndex] = { ...updated[itemIndex], [field]: value };
    onChange(updated);
  };

  const handlePhotoChange = async (
    itemIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { compressImageBlob } = await import("@/lib/compress-image");
      const compressed = await compressImageBlob(file);
      const photo = navigator.onLine
        ? (
            await uploadFile(compressed, {
              category: "checklist-photos",
              fileName: file.name,
            })
          ).reference
        : await fileToDataUrl(compressed);
      const updated = [...values];
      updated[itemIndex] = {
        ...updated[itemIndex],
        photo,
      };
      onChange(updated);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar a foto.",
      );
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="bg-primary/5 px-5 py-3 border-b border-border">
        <h3 className="font-bold text-[11px] text-foreground uppercase tracking-widest">
          {category}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, idx) => {
          const val = values[idx] ?? { status: "", observation: "" };
          return (
            <div
              key={idx}
              className={`p-4 md:p-5 space-y-3 ${val.status === "nao_conforme" ? "bg-red-50/50" : ""}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-[12px] flex-1 leading-relaxed text-foreground">
                  {item.item}
                </span>
                {item.critical && (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-600 border-red-200 text-[9px] shrink-0 uppercase tracking-wider"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Crítico
                  </Badge>
                )}
              </div>

              {/* Status toggle buttons */}
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleChange(idx, "status", s.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border cursor-pointer text-[10px] font-semibold uppercase tracking-wider transition-all ${
                      val.status === s.value
                        ? s.activeClass
                        : "bg-background text-muted-foreground border-border " +
                          s.hoverClass
                    }`}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Observation input — só aparece se não for "conforme" */}
              {val.status !== "" && val.status !== "conforme" && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Observação sobre este item..."
                    value={val.observation}
                    onChange={(e) =>
                      handleChange(idx, "observation", e.target.value)
                    }
                    className="text-[11px] h-8 rounded-md border-border flex-1"
                  />
                  {/* Input de arquivo oculto */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={(el) => {
                      photoInputRefs.current[idx] = el;
                    }}
                    onChange={(e) => handlePhotoChange(idx, e)}
                  />
                  <button
                    type="button"
                    title={val.photo ? "Foto adicionada" : "Adicionar foto"}
                    onClick={() => photoInputRefs.current[idx]?.click()}
                    className={`shrink-0 w-8 h-8 flex items-center justify-center border transition-colors ${
                      val.photo
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
