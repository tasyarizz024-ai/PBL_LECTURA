import React from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import theme from '../styles/theme';
import 'leaflet/dist/leaflet.css';

function RecenterMap({ position }) {
  const map = useMap();

  React.useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 17));
  }, [map, position]);

  return null;
}

export default function RealtimeLocationMap({ location, lecturerName }) {
  const position = [Number(location.latitude), Number(location.longitude)];

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      borderRadius: theme.borderRadius.default,
      border: `1px solid ${theme.colors.surfaceContainer}`,
    }}>
      <MapContainer center={position} zoom={17} style={{ height: '280px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap position={position} />
        <Marker position={position}>
          <Popup>
            Lokasi realtime {lecturerName}
            <br />
            Diperbarui {new Date(location.recorded_at).toLocaleTimeString('id-ID')}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
