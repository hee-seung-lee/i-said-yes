import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Category, Vendor } from '../data/vendors'
import { categoryLabel } from '../logic/recommend'

export const CATEGORY_COLOR: Record<Category, string> = {
  hall: '#b0606f',
  dress: '#8a6fa8',
  studio: '#6f8f74',
  snap: '#b3955a',
}

function FitBounds({ vendors }: { vendors: Vendor[] }) {
  const map = useMap()
  useEffect(() => {
    if (vendors.length === 0) return
    map.fitBounds(latLngBounds(vendors.map((v) => [v.lat, v.lng])), { padding: [36, 36], maxZoom: 14 })
  }, [map, vendors])
  return null
}

// 지도 API 키가 필요 없는 OpenStreetMap 타일을 쓴다. 카카오·네이버맵으로 바꾸려면 이 컴포넌트만 교체.
export function PlanMap({ vendors, tall }: { vendors: Vendor[]; tall?: boolean }) {
  // 게시 환경(Artifact 등)이 외부 이미지를 막으면 타일이 안 뜬다. 점과 거리는 그대로 보이니 안내만 한다.
  const [tilesBlocked, setTilesBlocked] = useState(false)
  return (
    <>
    <MapContainer className={tall ? 'map tall' : 'map'} center={[37.53, 127.0]} zoom={11} scrollWheelZoom={false}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{ tileerror: () => setTilesBlocked(true) }}
      />
      <FitBounds vendors={vendors} />
      {vendors.map((v) => (
        <CircleMarker key={v.id} center={[v.lat, v.lng]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: CATEGORY_COLOR[v.category], fillOpacity: 1 }}>
          <Tooltip>
            {categoryLabel(v.category)} · {v.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
    {tilesBlocked && <div className="muted">이 화면에서는 지도 배경을 불러올 수 없어 위치 점만 보여요. 로컬에서 실행하면 지도가 함께 보여요.</div>}
    </>
  )
}

export function Legend({ vendors }: { vendors: Vendor[] }) {
  return (
    <div className="muted">
      {vendors.map((v) => (
        <span key={v.id} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
          <span className="legend-dot" style={{ background: CATEGORY_COLOR[v.category] }} />
          {categoryLabel(v.category)}
        </span>
      ))}
    </div>
  )
}
