// 본식일 역산 일정. 날짜는 'YYYY-MM-DD' 문자열로만 다루고, 계산은 UTC 정오 기준이라 시간대 때문에 하루가 밀리지 않는다.
import type { Task } from '../data/tasks'

export interface Anchors {
  weddingDate: string | null
  familyMeetingDate: string | null // 상견례일 → T03
  shootDate: string | null // 실제 촬영일 → T22
  moveInDate: string | null // 입주일 → T33
  departureDate: string | null // 신혼여행 출국일 → T28·T29
}

export const EMPTY_ANCHORS: Anchors = {
  weddingDate: null,
  familyMeetingDate: null,
  shootDate: null,
  moveInDate: null,
  departureDate: null,
}

// 별도 기준일이 있으면 본식 대신 그 날로 계산한다(PRD 별도 기준일 규칙).
const OVERRIDES: Record<string, { anchor: keyof Anchors; label: string; start: number; due: number }> = {
  T03: { anchor: 'familyMeetingDate', label: '상견례', start: 21, due: 7 },
  T22: { anchor: 'shootDate', label: '촬영', start: 30, due: 7 },
  T33: { anchor: 'moveInDate', label: '입주', start: 60, due: 14 },
  T28: { anchor: 'departureDate', label: '출국', start: 210, due: 180 },
  T29: { anchor: 'departureDate', label: '출국', start: 180, due: 150 },
}

export interface Resolved {
  anchorLabel: string // '본식' 또는 별도 기준
  startDays: number
  dueDays: number
  start: string | null
  due: string | null
}

const DAY = 86400000

function toUtcNoon(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 12)
}

function fromUtc(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

// daysBefore 만큼 앞 날짜. 음수면 뒤(D+7 → -7).
export function minusDays(date: string, daysBefore: number): string {
  return fromUtc(toUtcNoon(date) - daysBefore * DAY)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcNoon(to) - toUtcNoon(from)) / DAY)
}

export function todaySeoul(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function resolve(task: Task, anchors: Anchors): Resolved {
  const o = OVERRIDES[task.id]
  if (o && anchors[o.anchor]) {
    const base = anchors[o.anchor]!
    return { anchorLabel: o.label, startDays: o.start, dueDays: o.due, start: minusDays(base, o.start), due: minusDays(base, o.due) }
  }
  const w = anchors.weddingDate
  return {
    anchorLabel: '본식',
    startDays: task.startDaysBefore,
    dueDays: task.dueDaysBefore,
    start: w ? minusDays(w, task.startDaysBefore) : null,
    due: w ? minusDays(w, task.dueDaysBefore) : null,
  }
}

// 실제 마감이 있고 오늘 이전이며 미완료일 때만 기한 경과(PRD).
export function isOverdue(r: Resolved, done: boolean, today: string): boolean {
  return !done && r.due !== null && r.due < today
}

export function formatKDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(toUtcNoon(date)).getUTCDay()]
  return `${y}.${m}.${d} (${wd})`
}

// 올해면 M/D, 다른 해면 'YY.M/D (본식이 해를 넘기면 같은 5/22 가 두 번 나와 헷갈린다)
export function formatShort(date: string, today = todaySeoul()): string {
  const [y, m, d] = date.split('-').map(Number)
  return y === Number(today.slice(0, 4)) ? `${m}/${d}` : `'${String(y).slice(2)}.${m}/${d}`
}

export function dLabel(days: number, anchorLabel = '본식'): string {
  const base = anchorLabel === '본식' ? 'D' : anchorLabel
  return days === 0 ? `${base}-day` : days > 0 ? `${base}-${days}` : `${base}+${-days}`
}
