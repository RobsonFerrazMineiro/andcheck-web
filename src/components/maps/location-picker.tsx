"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Fallback da planta (ajuste conforme necessidade) ──────────────────────────
const DEFAULT_PLANT = { lat: -1.536, lng: -48.752, zoom: 16 };

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

type GeoState = "idle" | "loading" | "success" | "error" | "denied";
type MapGeoState = "detecting" | "detected" | "failed" | "manual";

const PIN_ICON = () =>
  L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    html: `<div style="width:28px;height:36px;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))"><div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ea6a12;border:2.5px solid #fff;"></div><div style="width:2px;height:12px;background:#ea6a12;margin-top:-2px;border-radius:2px;"></div></div>`,
  });

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoMsg, setGeoMsg] = useState("");
  const [mapGeoState, setMapGeoState] = useState<MapGeoState>("detecting");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const hasCoords = latitude !== null && longitude !== null;

  // ── Helper: criar ou mover o pin ───────────────────────────────────────────
  function placeOrMoveMarker(map: L.Map, lat: number, lng: number) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const m = L.marker([lat, lng], {
        icon: PIN_ICON(),
        draggable: true,
      }).addTo(map);
      markerRef.current = m;
      m.on("dragend", () => {
        const pos = m.getLatLng();
        onChange(pos.lat, pos.lng);
        setGeoMsg(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
        setGeoState("success");
        setMapGeoState("manual");
      });
    }
  }

  // ── Botão: Usar localização atual ──────────────────────────────────────────
  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoState("error");
      setGeoMsg("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setGeoState("loading");
    setGeoMsg("Capturando localização...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange(lat, lng);
        setGeoState("success");
        setGeoMsg("Localização atual detectada");
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 17);
          placeOrMoveMarker(mapRef.current, lat, lng);
          setMapGeoState("detected");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState("denied");
          setGeoMsg("Permissão negada. Ajuste o pin manualmente no mapa.");
        } else {
          setGeoState("error");
          setGeoMsg("Não foi possível obter a localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // ── Inicializar mapa (sempre visível — sem toggle) ─────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setMapGeoState("detecting");
    setGeoState("loading");
    setGeoMsg("Obtendo localização...");

    // Centro provisório: coords já salvas ou fallback da planta
    const initLat = latitude ?? DEFAULT_PLANT.lat;
    const initLng = longitude ?? DEFAULT_PLANT.lng;
    const initZoom = latitude ? 17 : DEFAULT_PLANT.zoom;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
    });
    mapRef.current = map;

    // Satélite ESRI + labels
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 20 },
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { opacity: 0.7, maxZoom: 20 },
    ).addTo(map);

    // Pin inicial se já houver coords salvas
    if (latitude && longitude) {
      placeOrMoveMarker(map, latitude, longitude);
      setTimeout(() => {
        setGeoState("success");
        setGeoMsg("Localização confirmada");
        setMapGeoState("detected");
      }, 0);
    } else {
      // Auto-geolocalização ao carregar
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            if (!mapRef.current) return;
            mapRef.current.setView([lat, lng], 17);
            placeOrMoveMarker(mapRef.current, lat, lng);
            onChange(lat, lng);
            setGeoState("success");
            setGeoMsg("Localização atual detectada");
            setMapGeoState("detected");
          },
          () => {
            setMapGeoState("failed");
            setGeoState("error");
            setGeoMsg(
              "Não foi possível obter sua localização. Ajuste o pin manualmente no mapa.",
            );
          },
          { enableHighAccuracy: true, timeout: 8000 },
        );
      } else {
        setTimeout(() => {
          setMapGeoState("failed");
          setGeoState("error");
          setGeoMsg(
            "Geolocalização não suportada. Ajuste o pin manualmente no mapa.",
          );
        }, 0);
      }
    }

    // Clique no mapa move/cria pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeOrMoveMarker(map, lat, lng);
      onChange(lat, lng);
      setGeoState("success");
      setGeoMsg(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setMapGeoState("manual");
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {/* Instrução + botão recentralizar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Confirme a localização do andaime no mapa.
        </p>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geoState === "loading"}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold uppercase tracking-widest bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors shrink-0"
        >
          {geoState === "loading" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Crosshair className="w-3 h-3" />
          )}
          Usar localização atual
        </button>
      </div>

      {/* Mapa sempre visível */}
      <div
        className="border border-border rounded-md overflow-hidden relative"
        style={{ height: 320 }}
      >
        {/* Banner de status */}
        {mapGeoState === "detecting" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-1000 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none">
            <Loader2 className="w-3 h-3 animate-spin" />
            Obtendo localização...
          </div>
        )}
        {mapGeoState === "detected" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-1000 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none">
            <CheckCircle2 className="w-3 h-3" />
            Localização detectada
          </div>
        )}
        {mapGeoState === "failed" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-1000 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none whitespace-nowrap">
            <MapPin className="w-3 h-3" />
            Ajuste o pin manualmente
          </div>
        )}
        {mapGeoState === "manual" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-1000 bg-orange-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            Localização ajustada
          </div>
        )}
        <div
          ref={containerRef}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        />
      </div>

      {/* Coordenadas capturadas */}
      {hasCoords ? (
        <div className="flex gap-3">
          <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Latitude
            </p>
            <p className="text-[12px] font-mono text-foreground">
              {latitude!.toFixed(6)}
            </p>
          </div>
          <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Longitude
            </p>
            <p className="text-[12px] font-mono text-foreground">
              {longitude!.toFixed(6)}
            </p>
          </div>
        </div>
      ) : geoState === "error" || geoState === "denied" ? (
        <div className="flex items-start gap-2 text-[11px] px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{geoMsg}</span>
        </div>
      ) : null}
    </div>
  );
}
