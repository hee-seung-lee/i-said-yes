// 장소 입력(주소 검색·지도에서 찍기)과 우리 장소를 함께 그리는 지도·거리표
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MY_PLACES, type MyPlaces, type Place, type SearchHit, familyAverage, km, kmText, searchPlace } from '../logic/geo'

export interface MapPoint {
  id: string
  label: string
  lat: number
  lng: number
  color: string
  group?: string // 툴팁 앞에 붙는 구분(예: 드레스 계약)
}

const SEOUL: [number, number] = [37.55, 126.99]

function myIcon(icon: string) {
  return divIcon({ className: 'my-pin', html: `<span>${icon}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] })
}

function Fit({ pts }: { pts: { lat: number; lng: number }[] }) {
  const map = useMap()
  const key = pts.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')
  useEffect(() => {
    if (pts.length === 0) return
    if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 14)
    else map.fitBounds(latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

// 업체 점 + 우리 장소 아이콘을 한 지도에. 외부 이미지가 막힌 환경이면 안내만 한다.
export function PlacesMap({ points, mine, height = 260, onPick }: { points: MapPoint[]; mine: MyPlaces; height?: number; onPick?: (lat: number, lng: number) => void }) {
  const [blocked, setBlocked] = useState(false)
  const myPts = MY_PLACES.flatMap((m) => (mine[m.key] ? [{ ...m, ...mine[m.key]! }] : []))
  const all = [...points, ...myPts]
  return (
    <>
      <MapContainer className="map" style={{ height }} center={SEOUL} zoom={11} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setBlocked(true) }} />
        <Fit pts={all} />
        {onPick && <ClickToPick onPick={onPick} />}
        {myPts.map((m) => (
          <Marker key={m.key} position={[m.lat, m.lng]} icon={myIcon(m.icon)}>
            <Tooltip>{m.label}</Tooltip>
          </Marker>
        ))}
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 1 }}>
            <Tooltip>
              {p.group ? `${p.group} · ` : ''}
              {p.label}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {blocked && <div className="muted">이 화면에서는 지도 배경을 불러올 수 없어 위치 점만 보여요.</div>}
    </>
  )
}

// 업체 하나에서 우리 장소까지 직선거리. 양가 본가가 있으면 평균도.
export function DistanceChips({ at, mine }: { at: { lat: number; lng: number }; mine: MyPlaces }) {
  const list = MY_PLACES.filter((m) => mine[m.key])
  if (list.length === 0) return <span className="muted">우리 장소를 등록하면 거리가 보여요</span>
  const fam = familyAverage(at, mine)
  return (
    <span className="dist-chips">
      {list.map((m) => (
        <span key={m.key} className="tag">
          {m.icon} {m.label} {kmText(km(at, mine[m.key]!))}
        </span>
      ))}
      {fam !== null && <span className="tag cat">양가 평균 {kmText(fam)}</span>}
    </span>
  )
}

// 후보 여러 곳을 같은 기준으로 비교하는 거리표
export function DistanceTable({ points, mine }: { points: MapPoint[]; mine: MyPlaces }) {
  const cols = MY_PLACES.filter((m) => mine[m.key])
  if (points.length === 0 || cols.length === 0) return null
  const hasFam = !!(mine.brideFamily || mine.groomFamily)
  return (
    <div className="table-wrap">
      <table className="compare">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c.key}>
                {c.icon} {c.label}
              </th>
            ))}
            {hasFam && <th>양가 평균</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => {
            const ds = cols.map((c) => km(p, mine[c.key]!))
            const fam = familyAverage(p, mine)
            return (
              <tr key={p.id}>
                <th>{p.label}</th>
                {ds.map((d, i) => (
                  <td key={cols[i].key}>{kmText(d)}</td>
                ))}
                {hasFam && <td>{fam === null ? '-' : kmText(fam)}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="muted">직선거리예요. 실제 이동 시간은 길찾기로 확인해 주세요.</div>
    </div>
  )
}

// 위치 넣기: 주소·장소 이름 검색(OpenStreetMap) 또는 지도에서 찍기
export function LocationPicker({ id, value, onChange, mine, placeholder = '업체 이름이나 주소(동까지만도 돼요)' }: { id: string; value?: Place | null; onChange: (p: Place | null) => void; mine?: MyPlaces; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState(false)

  const search = async () => {
    if (!q.trim()) return setErr('검색어를 넣어 주세요')
    setBusy(true)
    setErr('')
    try {
      const r = await searchPlace(q.trim())
      setHits(r)
      if (r.length === 0) setErr('찾지 못했어요. 동 이름으로 바꿔 보거나 지도에서 찍어 주세요.')
    } catch {
      setErr('검색 서버에 닿지 못했어요. 지도에서 찍어 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="loc-picker">
      {value ? (
        <div className="dep-row">
          <span className="grow">📍 {value.label}</span>
          <button className="ghost" onClick={() => onChange(null)} aria-label="위치 지우기">
            ✕
          </button>
        </div>
      ) : null}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <input id={id} value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} style={{ flex: '1 1 160px' }} />
        <button onClick={search} disabled={busy}>
          {busy ? '찾는 중…' : '검색'}
        </button>
        <button onClick={() => setPick((v) => !v)}>{pick ? '지도 닫기' : '지도에서 찍기'}</button>
      </div>
      {err && <span className="err">{err}</span>}
      {hits && hits.length > 0 && (
        <div className="hits">
          {hits.map((h, i) => (
            <button
              key={i}
              className="hit"
              onClick={() => {
                onChange({ label: h.label, lat: h.lat, lng: h.lng })
                setHits(null)
                setQ('')
              }}
            >
              <b>{h.label}</b>
              <span className="muted">{h.detail}</span>
            </button>
          ))}
        </div>
      )}
      {pick && (
        <>
          <span className="muted">지도를 눌러 대략 위치를 찍어 주세요.</span>
          <PlacesMap
            points={value ? [{ id: 'cur', label: value.label, lat: value.lat, lng: value.lng, color: '#b0606f' }] : []}
            mine={mine ?? ({} as MyPlaces)}
            height={220}
            onPick={(lat, lng) => onChange({ label: '지도에서 찍은 위치', lat, lng })}
          />
        </>
      )}
      <span className="muted">검색어는 OpenStreetMap 검색으로 보내져요. 집은 동 이름이나 지도에서 대략 찍는 걸 권해요.</span>
    </div>
  )
}
