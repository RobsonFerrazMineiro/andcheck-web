"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Navigation2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Constantes de zoom / fallback ─────────────────────────────────────────────
const DEFAULT_PLANT = { lat: -1.536, lng: -48.752, zoom: 13 };
const SAVED_ZOOM = 17; // zoom ao carregar coords já salvas
const MAX_ZOOM = 20; // máximo suportado pelo tile ESRI

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  instruction?: string;
  currentLocationLabel?: string;
  height?: number;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  selectedZoom?: number;
  showCoordinates?: boolean;
}

type GeoState = "idle" | "loading" | "success" | "error" | "denied";
type MapGeoState = "detecting" | "detected" | "failed" | "manual";

const PIN_ICON = () =>
  L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    // Azul — corresponde ao status inicial "em_montagem"
    html: `<div style="width:28px;height:36px;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))"><div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#3b82f6;border:2.5px solid #fff;"></div><div style="width:2px;height:12px;background:#3b82f6;margin-top:-2px;border-radius:2px;"></div></div>`,
  });

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  instruction = "Arraste o pin ou clique no mapa para ajustar a posição exata do andaime.",
  currentLocationLabel = "Localização atual",
  height = 340,
  defaultCenter = DEFAULT_PLANT,
  defaultZoom = DEFAULT_PLANT.zoom,
  selectedZoom = SAVED_ZOOM,
  showCoordinates = true,
}: Props) {
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [mapGeoState, setMapGeoState] = useState<MapGeoState>("detecting");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const hasCoords = latitude !== null && longitude !== null;

  // ── Criar ou mover pin draggable ──────────────────────────────────────────
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
        setGeoState("success");
        setMapGeoState("manual");
      });
    }
  }

  // ── Centralizar mapa no pin atual ─────────────────────────────────────────
  function handleCenterOnPin() {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView(
        markerRef.current.getLatLng(),
        mapRef.current.getZoom(),
      );
    }
  }

  // ── Usar localização atual ────────────────────────────────────────────────
  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange(lat, lng);
        setGeoState("success");
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], selectedZoom);
          placeOrMoveMarker(mapRef.current, lat, lng);
          setMapGeoState("detected");
        }
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // ── Inicializar mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setMapGeoState("detecting");
    setGeoState("loading");

    const initLat = latitude ?? defaultCenter.lat;
    const initLng = longitude ?? defaultCenter.lng;
    const initZoom = latitude !== null ? selectedZoom : defaultZoom;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: MAX_ZOOM },
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { opacity: 0.7, maxZoom: MAX_ZOOM },
    ).addTo(map);

    if (latitude !== null && longitude !== null) {
      placeOrMoveMarker(map, latitude, longitude);
      setTimeout(() => {
        setGeoState("success");
        setMapGeoState("detected");
      }, 0);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          if (!mapRef.current) return;
          mapRef.current.setView([lat, lng], selectedZoom);
          placeOrMoveMarker(mapRef.current, lat, lng);
          onChange(lat, lng);
          setGeoState("success");
          setMapGeoState("detected");
        },
        () => {
          setMapGeoState("failed");
          setGeoState("error");
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setTimeout(() => {
        setMapGeoState("failed");
        setGeoState("error");
      }, 0);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeOrMoveMarker(map, lat, lng);
      onChange(lat, lng);
      setGeoState("success");
      setMapGeoState("manual");
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || latitude === null || longitude === null) return;
    placeOrMoveMarker(mapRef.current, latitude, longitude);
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    // onChange não participa desta sincronização externa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return (
    <div className="space-y-3">
      {/* Instrução + ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {instruction}
        </p>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 sm:shrink-0">
          {hasCoords && (
            <button
              type="button"
              onClick={handleCenterOnPin}
              title="Centralizar no pin"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
            >
              <MapPin className="w-3 h-3" />
              Centralizar no pin
            </button>
          )}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoState === "loading"}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-[10px] font-bold uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {geoState === "loading" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Crosshair className="w-3 h-3" />
            )}
            {currentLocationLabel}
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div
        className="border border-border rounded-md overflow-hidden relative"
        style={{ height }}
      >
        {mapGeoState === "detecting" && (
          <div className="absolute bottom-2 left-2 right-2 z-1000 flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg pointer-events-none sm:left-auto sm:right-2 sm:w-auto">
            <Loader2 className="w-3 h-3 animate-spin" />
            Obtendo localização...
          </div>
        )}
        {mapGeoState === "detected" && (
          <div className="absolute bottom-2 left-2 right-2 z-1000 flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg pointer-events-none sm:left-auto sm:right-2 sm:w-auto">
            <CheckCircle2 className="w-3 h-3" />
            Localização detectada
          </div>
        )}
        {mapGeoState === "failed" && (
          <div className="absolute bottom-2 left-2 right-2 z-1000 flex items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg pointer-events-none sm:left-auto sm:right-2 sm:w-auto">
            <Navigation2 className="w-3 h-3" />
            Ajuste o pin manualmente
          </div>
        )}
        {mapGeoState === "manual" && (
          <div className="absolute bottom-2 left-2 right-2 z-1000 flex items-center justify-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg pointer-events-none sm:left-auto sm:right-2 sm:w-auto">
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

      {/* Coordenadas em tempo real */}
      {showCoordinates && hasCoords ? (
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
      ) : showCoordinates && (geoState === "error" || geoState === "denied") ? (
        <div className="flex items-start gap-2 text-[11px] px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Não foi possível obter sua localização. Ajuste o pin manualmente no
            mapa.
          </span>
        </div>
      ) : null}
    </div>
  );
}
