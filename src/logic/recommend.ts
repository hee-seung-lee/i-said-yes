// 규칙 기반 3안 추천. AI 가 아니다(PRD MVP: 명시적 규칙만).
// 체크리스트 20문항 중 업체 고르기에 쓰는 항목만 읽는다. 나머지는 저장만 하고 이후 기능(일정·견적)에서 쓴다.
import { type Answers, NONE, OWN_VENUE, UNKNOWN, get, getNumber, labelOf } from '../data/questions'
import { type Category, type Vendor, VENDORS, CATEGORY_LABEL } from '../data/vendors'
import { km } from './geo'

export type PlanKey = 'taste' | 'budget' | 'schedule'

export interface Plan {
  key: PlanKey
  letter: 'A' | 'B' | 'C'
  title: string
  picks: Vendor[]
  totalMin: number // 확인된 최소금액 합(만 원)
  extrasUnknown: boolean // 추가금 미확인 업체 포함
  matched: number
  conditions: number
  reasons: string[]
}

const PLAN_META: Record<PlanKey, { letter: Plan['letter']; title: string }> = {
  taste: { letter: 'A', title: '취향 우선' },
  budget: { letter: 'B', title: '예산 우선' },
  schedule: { letter: 'C', title: '일정 우선' },
}

// 추천에 쓰는 체크리스트 항목
export const K = {
  target: 'q01.target',
  max: 'q01.max',
  skip: 'q02.skip',
  region: 'q04.region',
  mood: 'q05.mood',
  must: 'q06.must',
  place: 'q09.place',
  material: 'q12.material',
  dressRegion: 'q13.region',
} as const

const real = (vals: string[]) => vals.filter((v) => v !== UNKNOWN && v !== OWN_VENUE && v !== NONE)

export function hasOwnVenue(answers: Answers): boolean {
  return get(answers, K.mood).includes(OWN_VENUE)
}

function skipsPhoto(answers: Answers): boolean {
  return get(answers, K.skip).includes('photo')
}

// 별도 촬영지: 고른 곳 중 첫 번째(해외 등 업체가 없으면 그대로 두고 이유에 적는다)
function shootPlace(answers: Answers): string | null {
  return real(get(answers, K.place))[0] ?? null
}

function tagScore(v: Vendor, answers: Answers): number {
  if (v.category === 'hall') {
    const mood = real(get(answers, K.mood))
    const must = get(answers, K.must)
    return v.tags.filter((t) => mood.includes(t)).length + (v.features ?? []).filter((f) => must.includes(f)).length
  }
  if (v.category === 'dress') return v.tags.filter((t) => real(get(answers, K.material)).includes(t)).length
  return 0
}

// 드레스샵은 방문 가능 지역(q13), 나머지는 예식 지역(q04)으로 좁힌다.
function wantedRegion(cat: Category, answers: Answers): string | null {
  const r = (cat === 'dress' ? get(answers, K.dressRegion)[0] : undefined) ?? get(answers, K.region)[0]
  return r && r !== UNKNOWN ? r : null
}

// 지역 안에 후보가 없으면 전체에서 고른다(값을 비워 두지 않으려고). outside 는 이유 표시용.
function candidates(cat: Category, answers: Answers): { list: Vendor[]; outside: boolean } {
  const all = VENDORS.filter((v) => v.category === cat)
  if (cat === 'snap') return { list: all.filter((v) => v.region === shootPlace(answers)), outside: false }
  const r = wantedRegion(cat, answers)
  const local = r ? all.filter((v) => v.region === r) : all
  return local.length > 0 ? { list: local, outside: false } : { list: all, outside: true }
}

type Cmp = (a: Vendor, b: Vendor) => number

function comparatorFor(key: PlanKey, answers: Answers): Cmp {
  const s = (v: Vendor) => tagScore(v, answers)
  if (key === 'taste') return (a, b) => s(b) - s(a) || a.priceMin - b.priceMin
  if (key === 'budget') return (a, b) => Number(s(b) > 0) - Number(s(a) > 0) || a.priceMin - b.priceMin
  return (a, b) => Number(b.manyDates) - Number(a.manyDates) || s(b) - s(a) || a.priceMin - b.priceMin
}

export function countConditions(answers: Answers): number {
  let n = 0
  if (!hasOwnVenue(answers) && real(get(answers, K.mood)).length) n++
  if (!hasOwnVenue(answers) && get(answers, K.must).length) n++
  if (real(get(answers, K.material)).length) n++
  if (shootPlace(answers)) n++
  return n
}

export function categoriesFor(answers: Answers): Category[] {
  const cats: Category[] = []
  if (!hasOwnVenue(answers)) cats.push('hall')
  cats.push('dress')
  if (!skipsPhoto(answers)) cats.push('studio')
  if (shootPlace(answers)) cats.push('snap')
  return cats
}

export function buildPlans(answers: Answers): Plan[] {
  const cats = categoriesFor(answers)
  const conditions = countConditions(answers)
  const mood = real(get(answers, K.mood))
  const must = get(answers, K.must)
  const material = real(get(answers, K.material))
  const place = shootPlace(answers)

  return (Object.keys(PLAN_META) as PlanKey[]).map((key) => {
    const cmp = comparatorFor(key, answers)
    const reasons: string[] = []
    const picks: Vendor[] = []
    for (const c of cats) {
      const { list, outside } = candidates(c, answers)
      const v = [...list].sort(cmp)[0]
      if (!v) continue
      picks.push(v)
      if (outside) reasons.push(`희망 지역에 ${CATEGORY_LABEL[c]} 후보가 없어 다른 지역에서 골랐어요`)
    }
    const hall = picks.find((v) => v.category === 'hall')
    const dress = picks.find((v) => v.category === 'dress')
    const snap = picks.find((v) => v.category === 'snap')

    let matched = 0
    if (hasOwnVenue(answers)) reasons.unshift('예식장은 이미 정한 곳 사용')
    else {
      if (mood.length) {
        const hit = hall ? hall.tags.filter((t) => mood.includes(t)) : []
        if (hit.length) {
          matched++
          reasons.push(`예식장 ${hit.map((t) => labelOf(K.mood, t)).join('·')} 일치`)
        } else reasons.push('예식장 분위기 불일치')
      }
      if (must.length) {
        const hit = hall ? (hall.features ?? []).filter((f) => must.includes(f)) : []
        if (hit.length === must.length) matched++
        reasons.push(`필수 조건 ${hit.length}/${must.length} 충족${hit.length < must.length ? ` (없음: ${must.filter((m) => !hit.includes(m)).map((m) => labelOf(K.must, m)).join('·')})` : ''}`)
      }
    }
    if (material.length) {
      const hit = dress ? dress.tags.filter((t) => material.includes(t)) : []
      if (hit.length) {
        matched++
        reasons.push(`드레스 ${hit.map((t) => labelOf(K.material, t)).join('·')} 특화`)
      } else reasons.push('드레스 소재 불일치')
    }
    if (place) {
      if (snap) {
        matched++
        reasons.push(`${labelOf(K.place, place)} 촬영 포함`)
      } else reasons.push(`${labelOf(K.place, place)} 촬영 업체 없음`)
    }
    if (skipsPhoto(answers)) reasons.push('사진은 생략 가능 항목이라 스튜디오 제외')
    if (key === 'schedule') reasons.push(`빈 날짜 많은 업체 ${picks.filter((v) => v.manyDates).length}/${picks.length}`)

    const totalMin = picks.reduce((sum, v) => sum + v.priceMin, 0)
    const extrasUnknown = picks.some((v) => !v.extrasConfirmed)
    // 총예산은 신혼집·여행이 들어 있을 수 있어 일부 항목으로 예산 안이라고 단정하지 않는다(PRD 비용 규칙).
    // 최소금액만으로도 최대 한도를 넘으면 초과는 확정이다.
    const max = getNumber(answers, K.max)
    const target = getNumber(answers, K.target)
    if (max !== null && totalMin > max) reasons.push(`확인된 최소금액만으로 최대 한도 ${formatManwon(max)} 초과`)
    else if (target !== null && target > 0) reasons.push(`확인된 최소금액이 목표 예산의 ${Math.round((totalMin / target) * 100)}%`)

    return { key, ...PLAN_META[key], picks, totalMin, extrasUnknown, matched, conditions, reasons }
  })
}

// 업체 구성이 같은 안이 있는지. 조건이 좁거나 후보가 적으면 세 안이 같아질 수 있다.
export function hasDuplicatePlans(plans: Plan[]): boolean {
  const keys = plans.map((p) => p.picks.map((v) => v.id).join(','))
  return new Set(keys).size < keys.length
}

// 추천 1개: 조건 일치가 가장 많은 안, 같으면 저렴한 안.
export function recommendedKey(plans: Plan[]): PlanKey {
  return [...plans].sort((a, b) => b.matched - a.matched || a.totalMin - b.totalMin)[0].key
}

export function formatManwon(n: number): string {
  return `${n.toLocaleString()}만 원`
}

export function categoryLabel(c: Category): string {
  return CATEGORY_LABEL[c]
}

// 직선거리(km). 실제 이동 시간이 아니다.
export function distanceKm(a: Vendor, b: Vendor): number {
  return km(a, b)
}
