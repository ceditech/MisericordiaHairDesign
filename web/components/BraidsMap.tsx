"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./Map.module.css";

// Brand-colored custom marker icon
const BRAND_COLOR = "#a319c5";

const brandMarkerSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="30" height="45">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${BRAND_COLOR}" filter="url(#shadow)"/>
  <circle cx="12" cy="12" r="5.5" fill="#fff"/>
  <circle cx="12" cy="12" r="3" fill="${BRAND_COLOR}"/>
</svg>
`);

const brandIcon = new L.Icon({
    iconUrl: `data:image/svg+xml,${brandMarkerSvg}`,
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -42],
});

interface MapProps {
    address: string;
    coordinates: [number, number];
}

export default function BraidsMap({ address, coordinates }: MapProps) {
    return (
        <div className={styles.mapContainer}>
            <MapContainer
                center={coordinates}
                zoom={15}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={coordinates} icon={brandIcon}>
                    <Popup>
                        <div className={styles.popup}>
                            <strong>Dede&apos;s Braids</strong>
                            <span>{address}</span>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Get Directions →
                            </a>
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
