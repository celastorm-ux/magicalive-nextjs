'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type VenueMapVenue = {
  id: string
  name: string
  city: string | null
  state: string | null
  venue_type: string | null
  capacity: number | null
  latitude: number | null
  longitude: number | null
}

const goldIcon = new L.DivIcon({
  html: `
       <div style="
         width: 32px;
         height: 32px;
         background: #c9a84c;
         border: 2px solid #0d0b0e;
         border-radius: 50% 50% 50% 0;
         transform: rotate(-45deg);
         box-shadow: 0 2px 8px rgba(201,168,76,0.4);
         display: flex;
         align-items: center;
         justify-content: center;
       ">
         <span style="transform: rotate(45deg); font-size: 14px;">🎩</span>
       </div>
     `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const activeGoldIcon = new L.DivIcon({
  html: `
       <div style="
         width: 40px;
         height: 40px;
         background: #c9a84c;
         border: 3px solid #ffffff;
         border-radius: 50% 50% 50% 0;
         transform: rotate(-45deg);
         box-shadow: 0 4px 16px rgba(201,168,76,0.6);
         display: flex;
         align-items: center;
         justify-content: center;
       ">
         <span style="transform: rotate(45deg); font-size: 18px;">🎩</span>
       </div>
     `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

function FlyToActive({
  target,
}: {
  target: { lat: number; lng: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], 14, { animate: true, duration: 0.9 })
  }, [map, target])

  return null
}

export default function VenueMap({
  venues,
  activeVenueId,
  onVenueClick,
}: {
  venues: VenueMapVenue[]
  activeVenueId: string | null
  onVenueClick?: (id: string) => void
}) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    })
  }, [])

  const venuesWithCoords = useMemo(
    () =>
      venues.filter(
        (v) =>
          typeof v.latitude === 'number' &&
          typeof v.longitude === 'number' &&
          Number.isFinite(v.latitude) &&
          Number.isFinite(v.longitude),
      ) as Array<VenueMapVenue & { latitude: number; longitude: number }>,
    [venues],
  )

  const activeTarget = useMemo(() => {
    if (!activeVenueId) return null
    const v = venuesWithCoords.find((x) => x.id === activeVenueId)
    if (!v) return null
    return { lat: v.latitude, lng: v.longitude }
  }, [activeVenueId, venuesWithCoords])

  return (
    <div className="h-full w-full">
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #151217;
          border: 0.5px solid rgba(201, 168, 76, 0.4);
          border-radius: 3px;
          color: #f5f0e8;
        }
        .leaflet-popup-tip {
          background: #151217;
        }
        .leaflet-popup-close-button {
          color: #c9a84c;
        }
      `}</style>

      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CartoDB"
        />

        <FlyToActive target={activeTarget} />

        {venuesWithCoords.map((v) => {
          const isActive = v.id === activeVenueId
          const href = `/venues/${encodeURIComponent(v.id)}`
          return (
            <Marker
              key={v.id}
              position={[v.latitude, v.longitude]}
              icon={isActive ? activeGoldIcon : goldIcon}
              eventHandlers={{
                click: () => onVenueClick?.(v.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 220, paddingTop: 2 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-cormorant)',
                      color: '#c9a84c',
                      fontSize: 18,
                      lineHeight: 1.15,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {v.name}
                  </div>
                  <div style={{ color: 'rgba(245,240,232,0.72)', fontSize: 12, marginBottom: 6 }}>
                    {(v.city || '—') + (v.state ? `, ${v.state}` : '')} · {v.venue_type || 'Venue'}
                  </div>
                  <div style={{ color: 'rgba(245,240,232,0.6)', fontSize: 12 }}>
                    Capacity {(v.capacity ?? 0).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={href}
                      style={{
                        color: '#c9a84c',
                        fontSize: 13,
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      View venue →
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

