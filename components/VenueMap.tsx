'use client'

import { useEffect, useMemo, useRef } from 'react'
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
  website: string | null
  address: string | null
  phone: string | null
  latitude: number | string | null
  longitude: number | string | null
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
  className: 'active-marker',
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
    map.flyTo([target.lat, target.lng], 14, { animate: true, duration: 1.5 })
  }, [map, target])

  return null
}

function FitBoundsOnLoad({
  bounds,
}: {
  bounds: L.LatLngBoundsExpression | null
}) {
  const map = useMap()
  const didFitRef = useRef(false)

  useEffect(() => {
    if (!bounds) return
    if (didFitRef.current) return
    didFitRef.current = true
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [bounds, map])

  return null
}

function ResetMapButton({
  bounds,
}: {
  bounds: L.LatLngBoundsExpression | null
}) {
  const map = useMap()
  if (!bounds) return null

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control">
        <button
          type="button"
          onClick={() => map.fitBounds(bounds, { padding: [40, 40] })}
          className="rounded-xl border border-white/10 bg-[#151217]/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ml-gold)] shadow-sm backdrop-blur transition hover:border-white/20 hover:bg-[#151217]"
        >
          Reset map
        </button>
      </div>
    </div>
  )
}

function VenueMarker({
  venue,
  isActive,
  onVenueClick,
}: {
  venue: VenueMapVenue & { latitude: number; longitude: number }
  isActive: boolean
  onVenueClick?: (id: string) => void
}) {
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!isActive) return
    const m = markerRef.current
    if (!m) return
    window.setTimeout(() => {
      try {
        m.openPopup()
      } catch {
        // no-op
      }
    }, 50)
  }, [isActive])

  const href = `/venues/${encodeURIComponent(venue.id)}`
  const web = venue.website?.trim()
  const webHref = web ? (web.startsWith('http') ? web : `https://${web}`) : null

  return (
    <Marker
      ref={(m) => {
        markerRef.current = (m as any) ?? null
      }}
      key={venue.id}
      position={[venue.latitude, venue.longitude]}
      icon={isActive ? activeGoldIcon : goldIcon}
      eventHandlers={{
        click: () => onVenueClick?.(venue.id),
      }}
    >
      <Popup>
        <div style={{ fontFamily: 'var(--font-geist-sans)', minWidth: 160 }}>
          <div
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 16,
              fontWeight: 600,
              color: '#c9a84c',
              marginBottom: 4,
              lineHeight: 1.15,
            }}
          >
            {venue.name}
          </div>
          <div style={{ fontSize: 12, color: '#6b6460', marginBottom: 8 }}>
            {(venue.city || '—') + (venue.state ? `, ${venue.state}` : '')} · {venue.venue_type || 'Venue'}
          </div>
          <a
            href={href}
            style={{
              fontSize: 11,
              color: '#c9a84c',
              textDecoration: 'none',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            View venue →
          </a>
          {webHref ? (
            <a
              href={webHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#c9a84c', display: 'block', marginTop: 4 }}
            >
              Visit website ↗
            </a>
          ) : null}
        </div>
      </Popup>
    </Marker>
  )
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
      venues
        .map((v) => {
          const lat = typeof v.latitude === 'number' ? v.latitude : v.latitude == null ? NaN : Number(v.latitude)
          const lng =
            typeof v.longitude === 'number' ? v.longitude : v.longitude == null ? NaN : Number(v.longitude)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          return { ...v, latitude: lat, longitude: lng }
        })
        .filter(Boolean) as Array<VenueMapVenue & { latitude: number; longitude: number }>,
    [venues],
  )

  const activeTarget = useMemo(() => {
    if (!activeVenueId) return null
    const v = venuesWithCoords.find((x) => x.id === activeVenueId)
    if (!v) return null
    return { lat: v.latitude, lng: v.longitude }
  }, [activeVenueId, venuesWithCoords])

  const allBounds = useMemo(() => {
    if (venuesWithCoords.length === 0) return null
    return L.latLngBounds(venuesWithCoords.map((v) => [v.latitude, v.longitude] as [number, number]))
  }, [venuesWithCoords])

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
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.6);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(201, 168, 76, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(201, 168, 76, 0);
          }
        }
        .active-marker > div {
          animation: pulse 1.5s infinite;
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

        <FitBoundsOnLoad bounds={allBounds} />
        <ResetMapButton bounds={allBounds} />
        <FlyToActive target={activeTarget} />

        {venuesWithCoords.map((v) => (
          <VenueMarker
            key={v.id}
            venue={v}
            isActive={v.id === activeVenueId}
            onVenueClick={onVenueClick}
          />
        ))}
      </MapContainer>
    </div>
  )
}

