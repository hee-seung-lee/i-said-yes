// 장소·거리. 거리는 직선거리(km)이고 실제 이동 시간이 아니다.

export interface Place {
  label: string // 화면에 보일 이름(검색 결과 요약 또는 '지도에서 찍은 위치')
  lat: number
  lng: number
}

// 우리 장소(대략). 주소 전체가 아니라 동 단위나 지도에서 찍은 대략 위치를 권한다.
export type MyPlaceKey = 'brideHome' | 'brideWork' | 'groomHome' | 'groomWork' | 'brideFamily' | 'groomFamily'

export const MY_PLACES: { key: MyPlaceKey; label: string; icon: string }[] = [
  { key: 'brideHome', label: '신부 집', icon: '🏠' },
  { key: 'brideWork', label: '신부 회사', icon: '🏢' },
  { key: 'groomHome', label: '신랑 집', icon: '🏠' },
  { key: 'groomWork', label: '신랑 회사', icon: '🏢' },
  { key: 'brideFamily', label: '신부 본가', icon: '👪' },
  { key: 'groomFamily', label: '신랑 본가', icon: '👪' },
]

export type MyPlaces = Record<MyPlaceKey, Place | null>

export const EMPTY_PLACES: MyPlaces = { brideHome: null, brideWork: null, groomHome: null, groomWork: null, brideFamily: null, groomFamily: null }

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function kmText(d: number): string {
  return d < 10 ? `${d.toFixed(1)}km` : `${Math.round(d)}km`
}

// 양가 본가까지 평균(하객 이동 부담을 대략 비교할 때). 등록 안 된 곳은 뺀다.
export function familyAverage(p: { lat: number; lng: number }, mine: MyPlaces): number | null {
  const fams = [mine.brideFamily, mine.groomFamily].filter((x): x is Place => !!x)
  return fams.length ? fams.reduce((s, f) => s + km(p, f), 0) / fams.length : null
}

export interface SearchHit extends Place {
  detail: string
}

// OpenStreetMap Nominatim 검색(키 불필요). 검색어가 외부로 나가므로 화면에서 미리 알린다.
export async function searchPlace(q: string): Promise<SearchHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(String(res.status))
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string; name?: string }[]
  return rows.map((r) => {
    const parts = r.display_name.split(',').map((s) => s.trim())
    return { lat: Number(r.lat), lng: Number(r.lon), label: r.name || parts[0], detail: parts.slice(0, 4).join(', ') }
  })
}
