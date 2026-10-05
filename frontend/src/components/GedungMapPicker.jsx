import React from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import theme from '../styles/theme';

const CAMPUS_CENTER = [-5.356974, 105.232167];
const DEFAULT_ZOOM = 17;
// maxBounds ±0.01° di sekitar titik tengah kampus
const MAX_BOUNDS = [
  [CAMPUS_CENTER[0] - 0.01, CAMPUS_CENTER[1] - 0.01],
  [CAMPUS_CENTER[0] + 0.01, CAMPUS_CENTER[1] + 0.01],
];

// Fix default marker icon paths (Vite tidak memproses asset default Leaflet)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

// Geser view saat koordinat awal (mode edit) berubah
function Recenter({ position }) {
  const map = useMap();
  React.useEffect(() => {
    if (position) map.setView(position, DEFAULT_ZOOM);
  }, [map, position]);
  return null;
}

/**
 * Peta interaktif untuk memilih titik pusat geofence gedung.
 * - Center default: kampus Polinela, zoom 17
 * - Klik peta → set latitude/longitude
 * - Circle overlay ber-radius radiusMeter (update real-time)
 * - Edit mode: view langsung ke koordinat gedung
 */
export default function GedungMapPicker({ latitude, longitude, radiusMeter, onChange }) {
  const hasPoint = latitude !== '' && longitude !== '' && !Number.isNaN(parseFloat(latitude)) && !Number.isNaN(parseFloat(longitude));
  const point = hasPoint ? [parseFloat(latitude), parseFloat(longitude)] : null;
  const radius = Number(radiusMeter) || 0;

  return (
    <div
      style={{
        borderRadius: theme.borderRadius.default,
        overflow: 'hidden',
        border: `1px solid ${theme.colors.surfaceContainer}`,
      }}
    >
      <MapContainer
        center={point || CAMPUS_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={14}
        maxZoom={19}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '260px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(latlng) => onChange(String(latlng.lat.toFixed(7)), String(latlng.lng.toFixed(7)))} />
        {point && <Recenter position={point} />}
        {point && <Marker position={point} />}
        {point && (
          <Circle
            center={point}
            radius={radius}
            pathOptions={{
              color: theme.colors.primary,
              fillColor: theme.colors.primary,
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        )}
      </MapContainer>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          backgroundColor: theme.colors.surfaceContainerLow,
          fontSize: '12px',
          fontFamily: 'monospace',
          color: theme.colors.onSurfaceVariant,
        }}
      >
        <span>{point ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}` : 'Klik peta untuk memilih titik'}</span>
        <span style={{ fontWeight: 700, color: theme.colors.primary }}>{radius} m</span>
      </div>
    </div>
  );
}
