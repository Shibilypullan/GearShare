
'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import Image from 'next/image';

// Custom Pin Icon
const customIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-primary p-2 rounded-full rounded-bl-none shadow-2xl border-2 border-white transform transition-all hover:scale-125 hover:bg-accent group">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-colors"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Center the map when items change or manual center is requested
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

interface MapViewProps {
  items: any[];
  onSelectPin: (item: any) => void;
  center?: [number, number];
}

export default function MapView({ items, onSelectPin, center }: MapViewProps) {
  // Default center set to CUSAT SOE Software Block if not provided
  const defaultCenter: [number, number] = center || [10.0274, 76.3288]; 

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer 
        center={defaultCenter} 
        zoom={18} 
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeView center={defaultCenter} />

        {items.map((item) => (
          (item.latitude !== 0 && item.longitude !== 0) && (
            <Marker 
              key={item.id} 
              position={[item.latitude, item.longitude]} 
              icon={customIcon}
              eventHandlers={{
                click: () => onSelectPin(item),
              }}
            >
              <Popup className="custom-popup" closeButton={false}>
                <div className="p-1 min-w-[140px] text-center">
                  <h3 className="font-black text-xs text-primary truncate mb-1">{item.name}</h3>
                  <p className="text-[10px] font-bold text-accent mb-2">₹{item.pricePerDay}/day</p>
                  <Link 
                    href={`/item/${item.id}`} 
                    className="text-[10px] font-black bg-primary text-white px-3 py-1.5 rounded-lg block hover:bg-accent transition-colors"
                  >
                    View Gear
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
