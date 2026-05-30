"use client";

import type { ScaffoldPin } from "@/components/maps/operational-map";
import dynamic from "next/dynamic";

const OperationalMap = dynamic(
  () =>
    import("@/components/maps/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest animate-pulse">
          Carregando mapa…
        </p>
      </div>
    ),
  },
);

interface Props {
  scaffolds: (Omit<ScaffoldPin, "latitude" | "longitude"> & {
    latitude: number | null;
    longitude: number | null;
  })[];
}

export function MapaClient({ scaffolds }: Props) {
  const pins: ScaffoldPin[] = scaffolds.filter(
    (s): s is ScaffoldPin & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null,
  ) as ScaffoldPin[];

  if (pins.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-muted/20">
        <p className="text-[13px] font-semibold text-muted-foreground">
          Nenhum andaime georreferenciado
        </p>
        <p className="text-[11px] text-muted-foreground/60 text-center max-w-xs">
          Cadastre ou edite andaimes informando a localização GPS para
          visualizá-los no mapa.
        </p>
      </div>
    );
  }

  return <OperationalMap scaffolds={pins} height="100%" />;
}
