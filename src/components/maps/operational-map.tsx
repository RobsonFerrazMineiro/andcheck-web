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
  companyId: string;
  companyName: string;
  locationDescription?: string | null;
  validity_date: string | null;
  latitude: number;
  longitude: number;
  lastInspection?: { date: string; result: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  liberado: "#10b981",
  em_montagem: "#3b82f6",
  pendente_liberacao: "#f59e0b",
  reprovado: "#ef4444",
  interditado: "#7f1d1d",
  vencido: "#374151",
  desmontado: "#9ca3af",
  pendente: "#f59e0b",
};

const STATUS_LABEL: Record<string, string> = {
  liberado: "Liberado",
  em_montagem: "Em montagem",
  pendente_liberacao: "Pendente",
  reprovado: "Reprovado",
  interditado: "Interditado",
  vencido: "Vencido",
  desmontado: "Desmontado",
  pendente: "Pendente",
};

const RESULT_LABEL: Record<string, string> = {
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado c/ ressalvas",
  reprovado: "Reprovado",
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR");
}

function infoRow(label: string, value: string, className = "") {
  if (!value.trim()) return "";
  return `
    <div class="andcheck-popup-row ${className}">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function requiredInfoRow(label: string, value: string) {
  return `
    <div class="andcheck-popup-row">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

const DETAILS_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 3h7v7" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
`;

const QR_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3h7v7H3z" />
    <path d="M14 3h7v7h-7z" />
    <path d="M3 14h7v7H3z" />
    <path d="M14 14h2v2h-2z" />
    <path d="M19 14h2v2h-2z" />
    <path d="M14 19h2v2h-2z" />
    <path d="M18 18h3v3" />
  </svg>
`;

const PDF_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h1.5a1.5 1.5 0 0 1 0 3H8v-5" />
    <path d="M13 11v5h1a2 2 0 0 0 0-4h-1" />
    <path d="M17 11h3" />
    <path d="M17 13.5h2" />
    <path d="M17 16v-5" />
  </svg>
`;

function isShortText(value: string | null | undefined) {
  return Boolean(value?.trim() && value.trim().length <= 52);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildCompactPopup(scaffold: ScaffoldPin, showCompanyName: boolean) {
  const color = STATUS_COLOR[scaffold.effectiveStatus] ?? "#6b7280";
  const statusLabel =
    STATUS_LABEL[scaffold.effectiveStatus] ?? scaffold.effectiveStatus;
  const location = isShortText(scaffold.locationDescription)
    ? scaffold.locationDescription
    : "";
  const validityDate = formatDate(scaffold.validity_date);
  const lastInspection = scaffold.lastInspection
    ? `${formatDate(scaffold.lastInspection.date)} - ${
        RESULT_LABEL[scaffold.lastInspection.result] ??
        scaffold.lastInspection.result
      }`
    : "";

  return `
    <div class="andcheck-popup andcheck-popup-compact">
      <div class="andcheck-popup-header">
        <strong>${escapeHtml(scaffold.code)}</strong>
        <span style="background:${color}1f;color:${color};border-color:${color}66;">
          ${escapeHtml(statusLabel)}
        </span>
      </div>
      <div class="andcheck-popup-body">
        ${
          showCompanyName
            ? infoRow("Empresa", scaffold.companyName)
            : ""
        }
        ${infoRow("Area", scaffold.area)}
        ${
          location
            ? infoRow(
                "Localizacao",
                truncateText(location, 34),
                "compact-location",
              )
            : ""
        }
        ${lastInspection ? infoRow("Ultima inspecao", lastInspection) : ""}
        ${validityDate ? infoRow("Validade", validityDate) : ""}
      </div>
      <div class="andcheck-popup-actions">
        <a href="/andaimes/${escapeHtml(scaffold.id)}" title="Detalhes" aria-label="Detalhes">${DETAILS_ICON}</a>
        <a href="/qr/${escapeHtml(scaffold.id)}" title="QR Code" aria-label="QR Code">${QR_ICON}</a>
        <a class="primary" href="/andaimes/${escapeHtml(scaffold.id)}?pdf=1" title="PDF" aria-label="PDF">${PDF_ICON}</a>
      </div>
    </div>
  `;
}

function buildFullPopup(scaffold: ScaffoldPin, showCompanyName: boolean) {
  const color = STATUS_COLOR[scaffold.effectiveStatus] ?? "#6b7280";
  const statusLabel =
    STATUS_LABEL[scaffold.effectiveStatus] ?? scaffold.effectiveStatus;
  const validityDate = formatDate(scaffold.validity_date);
  const lastInspection = scaffold.lastInspection
    ? `${formatDate(scaffold.lastInspection.date)} - ${
        RESULT_LABEL[scaffold.lastInspection.result] ??
        scaffold.lastInspection.result
      }`
    : "Sem inspecao registrada";

  return `
    <div class="andcheck-popup andcheck-popup-full">
      <div class="andcheck-popup-header">
        <strong>${escapeHtml(scaffold.code)}</strong>
        <span style="background:${color}1f;color:${color};border-color:${color}66;">
          ${escapeHtml(statusLabel)}
        </span>
      </div>
      <div class="andcheck-popup-body">
        ${
          showCompanyName
            ? infoRow("Empresa responsavel", scaffold.companyName)
            : ""
        }
        ${infoRow("Area", scaffold.area)}
        ${
          scaffold.locationDescription
            ? infoRow("Localizacao", scaffold.locationDescription)
            : ""
        }
        ${requiredInfoRow("Ultima inspecao", lastInspection)}
        ${requiredInfoRow("Validade", validityDate || "-")}
      </div>
      <div class="andcheck-popup-actions">
        <a href="/andaimes/${escapeHtml(scaffold.id)}">Ver detalhes</a>
        <a href="/qr/${escapeHtml(scaffold.id)}">QR Code</a>
        <a class="primary" href="/andaimes/${escapeHtml(scaffold.id)}?pdf=1">PDF</a>
      </div>
    </div>
  `;
}

function buildPopup(
  scaffold: ScaffoldPin,
  showCompanyName: boolean,
  variant: "compact" | "full",
) {
  return variant === "compact"
    ? buildCompactPopup(scaffold, showCompanyName)
    : buildFullPopup(scaffold, showCompanyName);
}

interface Props {
  scaffolds: ScaffoldPin[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  interactive?: boolean;
  showCompanyName?: boolean;
  variant?: "compact" | "full";
}

export function OperationalMap({
  scaffolds,
  center,
  zoom = 16,
  height = "100%",
  interactive = true,
  showCompanyName = true,
  variant = "full",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] =
      scaffolds.length > 0
        ? [
            scaffolds.reduce((sum, pin) => sum + pin.latitude, 0) /
              scaffolds.length,
            scaffolds.reduce((sum, pin) => sum + pin.longitude, 0) /
              scaffolds.length,
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

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles (c) Esri - Source: Esri, Maxar, Earthstar Geographics",
        maxZoom: 20,
      },
    ).addTo(map);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { opacity: 0.7, maxZoom: 20 },
    ).addTo(map);

    scaffolds.forEach((scaffold) => {
      const color = STATUS_COLOR[scaffold.effectiveStatus] ?? "#6b7280";
      const marker = L.marker([scaffold.latitude, scaffold.longitude], {
        icon: createPin(color),
      });
      marker.bindPopup(buildPopup(scaffold, showCompanyName, variant), {
        autoPanPadding: variant === "compact" ? [16, 16] : [28, 28],
        className: `andcheck-leaflet-popup-${variant}`,
        closeButton: true,
        maxWidth: variant === "compact" ? 220 : 316,
        minWidth: variant === "compact" ? 204 : 292,
      });
      marker.addTo(map);
    });

    if (scaffolds.length > 1 && !center) {
      const bounds = L.latLngBounds(
        scaffolds.map((scaffold) => [scaffold.latitude, scaffold.longitude]),
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, interactive, scaffolds, showCompanyName, variant, zoom]);

  return (
    <div ref={containerRef} style={{ height, width: "100%" }} className="z-0" />
  );
}
