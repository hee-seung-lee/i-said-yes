// 예시 데이터. 실제 업체·가격·위치가 아니다(PRD: 업체 검색·가격을 지어내 실제처럼 보이지 않게).
// 실제 업체 DB 나 지도 API 를 붙일 때 이 파일만 교체한다.
export type Category = 'hall' | 'dress' | 'studio' | 'snap'

export interface Vendor {
  id: string
  name: string
  category: Category
  region: string // q04.region 값, 촬영 업체는 q09.place 값
  tags: string[] // 예식장 분위기(q05.mood) / 드레스 소재(q12.material) 값
  features?: string[] // 예식장 시설(q06.must 값)
  priceMin: number // 만 원, 확인된 최소금액(예시)
  extrasConfirmed: boolean // 추가금 확인 여부
  manyDates: boolean // 빈 날짜가 많은지(예시)
  lat: number
  lng: number
}

export const CATEGORY_LABEL: Record<Category, string> = {
  hall: '예식장',
  dress: '드레스샵',
  studio: '스튜디오',
  snap: '별도 촬영',
}

export const VENDORS: Vendor[] = [
  { id: 'h1', name: '숲속가든홀 (예시)', category: 'hall', region: 'gangnam', tags: ['garden', 'park', 'bright'], features: ['parking', 'transit', 'rain'], priceMin: 1500, extrasConfirmed: true, manyDates: false, lat: 37.5172, lng: 127.0473 },
  { id: 'h2', name: '루미나 다크홀 (예시)', category: 'hall', region: 'gangnam', tags: ['dark'], features: ['solo', 'parking', 'food'], priceMin: 1300, extrasConfirmed: false, manyDates: true, lat: 37.5045, lng: 127.0249 },
  { id: 'h3', name: '한옥채플 (예시)', category: 'hall', region: 'gangbuk', tags: ['house', 'garden'], features: ['interval', 'bride-room'], priceMin: 900, extrasConfirmed: true, manyDates: true, lat: 37.5826, lng: 126.9831 },
  { id: 'h4', name: '그랜드호텔 볼룸 (예시)', category: 'hall', region: 'gangbuk', tags: ['hotel', 'dark'], features: ['food', 'parking', 'solo', 'bride-room', 'rain'], priceMin: 2400, extrasConfirmed: true, manyDates: false, lat: 37.5651, lng: 126.9895 },
  { id: 'h5', name: '파크뷰 웨딩 (예시)', category: 'hall', region: 'gyeonggi', tags: ['park', 'outdoor', 'bright'], features: ['parking', 'interval'], priceMin: 1000, extrasConfirmed: false, manyDates: true, lat: 37.3826, lng: 127.1188 },
  { id: 'h6', name: '화이트스퀘어홀 (예시)', category: 'hall', region: 'gyeonggi', tags: ['bright'], features: ['transit', 'food'], priceMin: 800, extrasConfirmed: true, manyDates: false, lat: 37.4005, lng: 127.1066 },

  { id: 'd1', name: '실크라인 드레스 (예시)', category: 'dress', region: 'gangnam', tags: ['silk'], priceMin: 450, extrasConfirmed: false, manyDates: false, lat: 37.5245, lng: 127.0396 },
  { id: 'd2', name: '스파클 비즈 (예시)', category: 'dress', region: 'gangnam', tags: ['beads'], priceMin: 380, extrasConfirmed: true, manyDates: true, lat: 37.5219, lng: 127.0281 },
  { id: 'd3', name: '레이스앤로즈 (예시)', category: 'dress', region: 'gangbuk', tags: ['lace', 'silk'], priceMin: 320, extrasConfirmed: true, manyDates: true, lat: 37.5559, lng: 126.9234 },
  { id: 'd4', name: '모던튤 (예시)', category: 'dress', region: 'gyeonggi', tags: ['tulle'], priceMin: 280, extrasConfirmed: true, manyDates: false, lat: 37.3947, lng: 127.1112 },

  { id: 's1', name: '라이트룸 스튜디오 (예시)', category: 'studio', region: 'gangnam', tags: ['bright'], priceMin: 250, extrasConfirmed: true, manyDates: false, lat: 37.5262, lng: 127.0363 },
  { id: 's2', name: '무드필름 스튜디오 (예시)', category: 'studio', region: 'gangbuk', tags: ['dark'], priceMin: 200, extrasConfirmed: false, manyDates: true, lat: 37.5446, lng: 127.0559 },

  { id: 'p1', name: '제주 오름 스냅 (예시)', category: 'snap', region: 'jeju', tags: [], priceMin: 180, extrasConfirmed: false, manyDates: true, lat: 33.4507, lng: 126.5706 },
  { id: 'p2', name: '해운대 노을 스냅 (예시)', category: 'snap', region: 'busan', tags: [], priceMin: 150, extrasConfirmed: true, manyDates: false, lat: 35.1587, lng: 129.1604 },
  { id: 'p3', name: '서울숲 야외 스냅 (예시)', category: 'snap', region: 'seoul', tags: [], priceMin: 90, extrasConfirmed: true, manyDates: true, lat: 37.5444, lng: 127.0374 },
]
