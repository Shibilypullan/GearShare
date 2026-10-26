'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';

const pickerIcon = L.divIcon({
  className: 'custom-picker-icon',
  html: `<div class="bg-accent p-2 rounded-full rounded-bl-none shadow-2xl border-2 border-white ring-4 ring-accent/20 animate-bounce">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Helper component to center the map when external coordinates change
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function LocationMarker({ onLocationChange, lat, lng }: { onLocationChange: (lat: number, lng: number) => void, lat: number, lng: number }) {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);

  // Update marker position when external lat/lng changes (e.g. from search)
  useEffect(() => {
    setPosition([lat, lng]);
  }, [lat, lng]);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={pickerIcon} />
  );
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  return (
    <MapContainer 
      center={[lat, lng]} 
      zoom={17} 
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={[lat, lng]} />
      <LocationMarker lat={lat} lng={lng} onLocationChange={onLocationChange} />
    </MapContainer>
  );
}
