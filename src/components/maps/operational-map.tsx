"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface ScaffoldPin {
  id: string;
  code: string;
  location: string;
  area: string;
  status: string;
  effectiveStatus: string;
  responsible: string;
  validity_date: string | null;
  latitude: number;
  longitude: number;
  lastInspection?: { date: string; result: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  liberado: "#10b981",
  pendente: "#f59e0b",
  reprovado: "#ef4444",
  vencido: "#374151",
  em_montagem: "#3b82f6",
};

const STATUS_LABEL: Record<string, string> = {
  liberado: "Liberado",
  pendente: "Pendente",
  reprovado: "Reprovado",
  vencido: "Vencido",
  em_montagem: "Em Montagem",
};

const RESULT_LABEL: Record<string, string> = {
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado c/ Ressalvas",
  reprovado: "Reprovado",
};

const RESULT_COLOR: Record<string, string> = {
  aprovado: "#10b981",
  aprovado_com_ressalvas: "#f59e0b",
  reprovado: "#ef4444",
};

function createPin(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
    html: `
      <div style="
        width:32px;height:40px;
        display:flex;flex-direction:column;align-items:center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      ">
        <div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          border:2.5px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
        "></div>
        <div style="width:2px;height:12px;background:${color};margin-top:-2px;border-radius:2px;opacity:0.9;"></div>
      </div>
    `,
  });
}

function buildPopup(s: ScaffoldPin): string {
  const color = STATUS_COLOR[s.effectiveStatus] ?? "#6b7280";
  const statusLabel = STATUS_LABEL[s.effectiveStatus] ?? s.effectiveStatus;
  const lastInspHtml = s.lastInspection
    ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:2px;">Última Inspeção</div>
        <span style="font-size:11px;font-weight:700;color:${RESULT_COLOR[s.lastInspection.result] ?? "#6b7280"};">
          ${RESULT_LABEL[s.lastInspection.result] ?? s.lastInspection.result}
        </span>
        <span style="font-size:10px;color:#6b7280;margin-left:4px;">${new Date(s.lastInspection.date).toLocaleDateString("pt-BR")}</span>
      </div>`
    : "";

  const validadeHtml = s.validity_date
    ? `<div style="margin-top:4px;font-size:10px;color:#6b7280;">Validade: <b style="color:#ea6a12;">${new Date(s.validity_date).toLocaleDateString("pt-BR")}</b></div>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;min-width:210px;max-width:240px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:18px;font-weight:900;font-family:monospace;color:#111827;letter-spacing:.03em;">${s.code}</div>
        <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}55;text-transform:uppercase;">${statusLabel}</span>
      </div>
      <div style="font-size:10px;color:#4b5563;margin-bottom:2px;"><b>Área:</b> ${s.area}</div>
      <div style="font-size:10px;color:#4b5563;margin-bottom:2px;"><b>Localização:</b> ${s.location}</div>
      <div style="font-size:10px;color:#4b5563;"><b>Responsável:</b> ${s.responsible}</div>
      ${validadeHtml}
      ${lastInspHtml}
      <div style="display:flex;gap:6px;margin-top:10px;">
        <a href="/andaimes/${s.id}" style="flex:1;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:5px;border-radius:4px;background:#f3f4f6;color:#374151;text-decoration:none;">Ver Detalhes</a>
        <a href="/qr/${s.id}" style="flex:1;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:5px;border-radius:4px;background:#f3f4f6;color:#374151;text-decoration:none;">QR Code</a>
        <a href="/andaimes/${s.id}?pdf=1" style="flex:1;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:5px;border-radius:4px;background:#ea6a12;color:#fff;text-decoration:none;">PDF</a>
      </div>
    </div>
  `;
}

interface Props {
  scaffolds: ScaffoldPin[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  interactive?: boolean;
}

export function OperationalMap({
  scaffolds,
  center,
  zoom = 16,
  height = "100%",
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Centro padrão: média dos pins ou Brasil
    const defaultCenter: [number, number] =
      scaffolds.length > 0
        ? [
            scaffolds.reduce((s, p) => s + p.latitude, 0) / scaffolds.length,
            scaffolds.reduce((s, p) => s + p.longitude, 0) / scaffolds.length,
          ]
        : [-15.7801, -47.9292];

    const map = L.map(containerRef.current, {
      center: center ?? defaultCenter,
      zoom,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
    });

    mapRef.current = map;

    // Camada satélite ESRI
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
        maxZoom: 20,
      },
    ).addTo(map);

    // Labels sobre a camada satélite
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { opacity: 0.7, maxZoom: 20 },
    ).addTo(map);

    // Pins
    scaffolds.forEach((s) => {
      const color = STATUS_COLOR[s.effectiveStatus] ?? "#6b7280";
      const marker = L.marker([s.latitude, s.longitude], {
        icon: createPin(color),
      });
      marker.bindPopup(buildPopup(s), { maxWidth: 260, minWidth: 210 });
      marker.addTo(map);
    });

    // Fit bounds se tiver múltiplos pins
    if (scaffolds.length > 1 && !center) {
      const bounds = L.latLngBounds(
        scaffolds.map((s) => [s.latitude, s.longitude]),
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ height, width: "100%" }} className="z-0" />
  );
}
