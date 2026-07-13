import React from "react";
import { MapContainer as LeafletMap, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix for default Leaflet icon resolution issues in bundlers
import "leaflet/dist/leaflet.css";

interface MapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  type: "donor" | "camp" | "hospital" | "request";
  details?: string;
}

interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
}

export const MapContainer: React.FC<MapProps> = ({
  center = [12.9716, 77.5946], // Bangalore center default
  zoom = 12,
  markers = [],
  height = "400px",
}) => {
  
  // Custom SVG Markers for Premium UI (avoids asset loader bugs)
  const createCustomIcon = (type: "donor" | "camp" | "hospital" | "request") => {
    let color = "#ef4444"; // red
    let svgIcon = "";

    if (type === "donor") {
      color = "#ef4444"; // Red for Donors
      svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      `;
    } else if (type === "camp") {
      color = "#f59e0b"; // Amber for Camps
      svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
      `;
    } else if (type === "hospital") {
      color = "#3b82f6"; // Blue for Hospitals
      svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">
          <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"/>
        </svg>
      `;
    } else {
      color = "#ec4899"; // Pink for Urgent requests
      svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;
    }

    return L.divIcon({
      html: `<div style="transform: translate(-10px, -20px); filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.25));">${svgIcon}</div>`,
      className: "custom-leaflet-icon",
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
  };

  return (
    <div style={{ height }} className="relative w-full rounded-xl overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800/40">
      <LeafletMap
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {markers.map((marker) => (
          <Marker
            key={`${marker.type}-${marker.id}`}
            position={[marker.latitude, marker.longitude]}
            icon={createCustomIcon(marker.type)}
          >
            <Popup>
              <div className="p-1 min-w-[150px]">
                <h5 className="font-bold text-xs text-slate-900 m-0 uppercase tracking-wide">
                  {marker.title}
                </h5>
                <span className="text-[10px] font-semibold text-slate-500 block leading-tight mt-0.5">
                  {marker.subtitle}
                </span>
                {marker.details && (
                  <p className="text-[11px] text-slate-700 mt-1 border-t border-slate-100 pt-1 leading-normal">
                    {marker.details}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                    marker.type === "donor" 
                      ? "bg-red-50 text-red-500" 
                      : marker.type === "camp" 
                      ? "bg-amber-50 text-amber-600" 
                      : "bg-blue-50 text-blue-500"
                  }`}>
                    {marker.type}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </LeafletMap>
    </div>
  );
};
export default MapContainer;
