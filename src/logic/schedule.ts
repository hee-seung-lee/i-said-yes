// 본식일 역산 일정과 선행 관계. 날짜는 'YYYY-MM-DD' 문자열, 계산은 UTC 정오 기준이라 시간대 때문에 하루가 밀리지 않는다.
// PRD "세부 계산 규칙 > 일정".
import { ANCHOR_LABEL, type AnchorKey, type TaskRecord } from '../data/tasks'

export type Anchors = Record<AnchorKey, string | null>

export const EMPTY_ANCHORS: Anchors = { wedding: null, familyMeeting: null, shoot: null, moveIn: null, departure: null }

export interface Resolved {
  anchorLabel: string
  startDays: number
  dueDays: number
  start: string | null // 실제 날짜. 기준일이 없으면 null(상대 일정만)
  due: string | null
  fixed: boolean // 확정 날짜(fixedStart/fixedDue)를 쓰는지
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

// 날짜 = 기준일 - daysBefore 달력 일수. D+7 은 -7.
export function minusDays(date: string, daysBefore: number): string {
  return fromUtc(toUtcNoon(date) - daysBefore * DAY)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcNoon(to) - toUtcNoon(from)) / DAY)
}

export function todaySeoul(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function resolve(task: TaskRecord, anchors: Anchors): Resolved {
  const o = task.override
  const useOverride = o !== null && anchors[o.anchor] !== null
  const anchor: AnchorKey = useOverride ? o!.anchor : 'wedding'
  const startDays = useOverride ? o!.startDaysBefore : task.startDaysBefore
  const dueDays = useOverride ? o!.dueDaysBefore : task.dueDaysBefore
  const base = anchors[anchor]
  return {
    anchorLabel: ANCHOR_LABEL[anchor],
    startDays,
    dueDays,
    start: task.fixedStart ?? (base ? minusDays(base, startDays) : null),
    due: task.fixedDue ?? (base ? minusDays(base, dueDays) : null),
    fixed: task.fixedStart !== null || task.fixedDue !== null,
  }
}

// startDaysBefore >= dueDaysBefore (시작이 마감보다 앞서야 한다)
export function validDays(start: number, due: number): string | null {
  if (!Number.isFinite(start) || !Number.isFinite(due)) return '숫자로 넣어 주세요'
  if (start < due) return '시작은 마감보다 앞(더 큰 D-숫자)이어야 해요'
  return null
}

// 실제 마감이 있고 오늘 이전이며 미완료일 때만 기한 경과
export function isOverdue(r: Resolved, done: boolean, today: string): boolean {
  return !done && r.due !== null && r.due < today
}

// 기준일 변경 미리보기: 확정 날짜가 있거나 완료한 일은 그대로 두고, 나머지만 바뀌는 날짜를 보여 준다.
export interface Reschedule {
  task: TaskRecord
  before: Resolved
  after: Resolved
}

export function reschedulePreview(tasks: TaskRecord[], from: Anchors, to: Anchors): { changed: Reschedule[]; kept: TaskRecord[] } {
  const changed: Reschedule[] = []
  const kept: TaskRecord[] = []
  for (const t of tasks) {
    const before = resolve(t, from)
    const after = resolve(t, to)
    if (before.start === after.start && before.due === after.due) continue
    if (t.fixedStart || t.fixedDue || t.completedAt || t.status === '완료') kept.push(t)
    else changed.push({ task: t, before, after })
  }
  return { changed, kept }
}

// ---- 선행 관계 ----

// prereqId → taskId 관계를 더하면 순환이 생기는지(taskId 에서 출발해 prereq 를 따라가다 taskId 로 돌아오는지)
export function wouldCycle(tasks: TaskRecord[], taskId: string, prereqId: string): boolean {
  if (taskId === prereqId) return true
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const seen = new Set<string>()
  const stack = [prereqId]
  while (stack.length) {
    const id = stack.pop()!
    if (id === taskId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const d of byId.get(id)?.dependencies ?? []) stack.push(d.taskId)
  }
  return false
}

// 확인된 hard 관계 중 아직 안 끝난 선행 일. 채택 안 한 제안 마일스톤은 막지 않는다.
export function blockers(task: TaskRecord, tasks: TaskRecord[]): TaskRecord[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  return task.dependencies
    .filter((d) => d.confirmed && d.type === 'hard')
    .map((d) => byId.get(d.taskId))
    .filter((p): p is TaskRecord => !!p && p.adopted && !p.excluded && p.status !== '완료')
}

// 확인된 hard 관계인데 선행 일 마감이 이 일 마감보다 늦은 경우. 자동으로 미루지 않고 영향과 대체안만 보여 준다.
export interface Conflict {
  task: TaskRecord
  prereq: TaskRecord
  gapDays: number
  options: string[]
}

export function conflicts(tasks: TaskRecord[], anchors: Anchors): Conflict[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const out: Conflict[] = []
  for (const t of tasks) {
    if (!t.adopted || t.excluded) continue
    for (const d of t.dependencies) {
      if (!d.confirmed || d.type !== 'hard') continue
      const p = byId.get(d.taskId)
      if (!p || !p.adopted || p.excluded) continue
      const a = resolve(t, anchors)
      const b = resolve(p, anchors)
      const gap = a.due && b.due ? daysBetween(a.due, b.due) : b.dueDays < a.dueDays ? a.dueDays - b.dueDays : 0
      if (gap > 0)
        out.push({
          task: t,
          prereq: p,
          gapDays: gap,
          options: [`'${p.title}'을 ${gap}일 앞당기기`, `'${t.title}' 마감을 ${gap}일 늦추기`, '관계를 참고(soft)로 바꾸기'],
        })
    }
  }
  return out
}

// ---- 늦게 시작했을 때 압축 계획 ----

// 지난 단계(마감이 오늘 이전)이면서 아직 안 끝난 일. 자동 완료하지 않고 사용자가 '이미 완료/지금 진행/제외'를 고른다.
export function lateTasks(tasks: TaskRecord[], anchors: Anchors, today: string): TaskRecord[] {
  return tasks.filter((t) => t.adopted && !t.excluded && t.status !== '완료' && isOverdue(resolve(t, anchors), false, today))
}

// '지금 진행'으로 고른 일들의 새 마감 제안: 오늘부터 본식 전날까지를 원래 순서대로 나눠 2주 간격 이내로 배치
export function compressPlan(tasks: TaskRecord[], anchors: Anchors, today: string): { task: TaskRecord; due: string }[] {
  const wedding = anchors.wedding
  if (!wedding) return []
  const room = Math.max(1, daysBetween(today, wedding) - 1)
  const sorted = [...tasks].sort((a, b) => b.dueDaysBefore - a.dueDaysBefore)
  const step = Math.max(1, Math.min(14, Math.floor(room / Math.max(1, sorted.length))))
  return sorted.map((t, i) => ({ task: t, due: minusDays(today, -Math.min(room, step * (i + 1))) }))
}

// ---- 표시 ----

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
  const b = anchorLabel === '본식' ? 'D' : anchorLabel
  return days === 0 ? `${b}-day` : days > 0 ? `${b}-${days}` : `${b}+${-days}`
}

export function rangeText(r: Resolved): string {
  if (r.start && r.due) return `${formatShort(r.start)} ~ ${formatShort(r.due)}${r.fixed ? ' (확정)' : ''}`
  return `${dLabel(r.startDays, r.anchorLabel)} ~ ${dLabel(r.dueDays, r.anchorLabel)}`
}

// 달력: 해당 월의 날짜 칸(앞뒤 빈칸 포함)
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1, 12))
  const days = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}
