"use client";

import dynamic from "next/dynamic";
import { FileText, QrCode, Wrench } from "lucide-react";
import type { ComponentType } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import type { ScaffoldActionsBarProps } from "@/components/scaffold/actions-bar";
import type { ScaffoldDocumentSectionProps } from "@/components/scaffold/document-section";
import type { ScaffoldQRCardProps } from "@/components/scaffold/qr-card";

export const LazyScaffoldActionsBar = dynamic(
  () =>
    import("@/components/scaffold/actions-bar").then(
      (module) => module.ScaffoldActionsBar,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-8 items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Wrench className="size-3.5" />
        Carregando ações
      </div>
    ),
  },
) as ComponentType<ScaffoldActionsBarProps>;

export const LazyScaffoldDocumentSection = dynamic(
  () =>
    import("@/components/scaffold/document-section").then(
      (module) => module.ScaffoldDocumentSection,
    ),
  {
    ssr: false,
    loading: () => (
      <EmptyState
        icon={FileText}
        title="Carregando documentos"
        description="Os anexos técnicos serão exibidos em instantes."
        className="border-dashed"
      />
    ),
  },
) as ComponentType<ScaffoldDocumentSectionProps>;

export const LazyScaffoldQRCard = dynamic(
  () =>
    import("@/components/scaffold/qr-card").then(
      (module) => module.ScaffoldQRCard,
    ),
  {
    ssr: false,
    loading: () => (
      <EmptyState
        icon={QrCode}
        title="Carregando QR Code"
        description="O QR Code público do andaime será gerado em instantes."
        className="border-dashed"
      />
    ),
  },
) as ComponentType<ScaffoldQRCardProps>;
