import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import theme from '../styles/theme';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

/**
 * Peta statis (read-only) untuk menampilkan lokasi gedung dosen.
 * Tidak bisa diklik, drag, zoom, atau interaktif lainnya.
 */
export default function GedungStaticMap({ latitude, longitude, namaGedung }) {
  const position = [parseFloat(latitude), parseFloat(longitude)];
  return (
    <div
      style={{
        borderRadius: theme.borderRadius.default,
        overflow: 'hidden',
        border: `1px solid ${theme.colors.surfaceContainer}`,
        width: '100%',
        minWidth: 0,
      }}
    >
      <MapContainer
        center={position}
        zoom={18}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        touchZoom={false}
        style={{ height: '220px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          {namaGedung ? <Popup>{namaGedung}</Popup> : null}
        </Marker>
      </MapContainer>
    </div>
  );
}
