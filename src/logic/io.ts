// JSON 내보내기·가져오기. PRD: sourceUrl 기준 중복 방지(없으면 id), 병합 미리보기 후 적용.
import type { TaskRecord } from '../data/tasks'

export interface ExportData {
  app: 'i-said-yes'
  schemaVersion: number
  exportedAt: string
  [k: string]: unknown
}

export function matchKey(t: Pick<TaskRecord, 'id' | 'sourceUrl'>): string {
  return t.sourceUrl ? `url:${t.sourceUrl}` : `id:${t.id}`
}

export interface MergePreview {
  added: TaskRecord[]
  changed: { before: TaskRecord; after: TaskRecord; fields: string[] }[]
  same: number
  invalid: string[]
}

const COMPARED: (keyof TaskRecord)[] = [
  'title', 'status', 'budget', 'startDaysBefore', 'dueDaysBefore', 'ownerIds', 'requiredForWedding',
  'completionCriteria', 'fixedStart', 'fixedDue', 'completedAt', 'decisionStatus', 'adopted', 'excluded', 'dependencies', 'override',
]

function looksLikeTask(x: unknown): x is TaskRecord {
  const t = x as TaskRecord
  return !!t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.startDaysBefore === 'number' && typeof t.dueDaysBefore === 'number'
}

// PRD 초기 데이터 JSON 처럼 필드가 덜 채워진 업무도 받는다. 빠진 필드는 같은 id 의 기본값(없으면 빈 값)으로 채우고,
// 원본 날짜(originalStartDate/EndDate)는 일정 계산에 쓰지 않으므로 버린다.
export function normalizeTask(x: Record<string, unknown>, defaults: TaskRecord[]): Record<string, unknown> {
  const { originalStartDate: _a, originalEndDate: _b, ...rest } = x
  void _a
  void _b
  const d = defaults.find((t) => t.id === rest.id) ?? defaults.find((t) => t.origin === 'source')
  if (!d) return rest
  const blank: Partial<TaskRecord> = defaults.some((t) => t.id === rest.id)
    ? {}
    : { status: '시작 전', budget: null, sourceUrl: null, origin: 'user', dependencies: [], override: null, fixedStart: null, fixedDue: null, completedAt: null }
  return { ...d, ...blank, ...rest }
}

// 가져올 업무 목록을 현재 목록과 비교한다. 같은 sourceUrl(없으면 id)이면 같은 업무로 본다.
export function previewMerge(current: TaskRecord[], incoming: unknown[]): MergePreview {
  const byUrl = new Map(current.filter((t) => t.sourceUrl).map((t) => [t.sourceUrl!, t]))
  const byId = new Map(current.map((t) => [t.id, t]))
  // 같은 sourceUrl 이면 같은 업무. 기존 업무에 링크가 없으면(이 앱 기본값) 같은 id 로 합친다.
  // 같은 id 라도 양쪽 링크가 다르면 다른 업무로 본다.
  const find = (x: TaskRecord) => {
    if (x.sourceUrl && byUrl.has(x.sourceUrl)) return byUrl.get(x.sourceUrl)
    const same = byId.get(x.id)
    if (same && (!same.sourceUrl || !x.sourceUrl || same.sourceUrl === x.sourceUrl)) return same
    return undefined
  }
  const out: MergePreview = { added: [], changed: [], same: 0, invalid: [] }
  const seen = new Set<string>()
  incoming.forEach((x, i) => {
    if (!looksLikeTask(x)) {
      out.invalid.push(`${i + 1}번째 항목: 업무 형식이 아니에요`)
      return
    }
    const k = matchKey(x)
    if (seen.has(k)) {
      out.invalid.push(`${x.title}: 같은 파일 안에 중복`)
      return
    }
    seen.add(k)
    const cur = find(x)
    if (!cur) {
      out.added.push(x)
      return
    }
    const fields = COMPARED.filter((f) => JSON.stringify(cur[f]) !== JSON.stringify(x[f] ?? cur[f]))
    if (fields.length) out.changed.push({ before: cur, after: { ...cur, ...x, id: cur.id }, fields })
    else out.same++
  })
  return out
}

export function applyMerge(current: TaskRecord[], p: MergePreview): TaskRecord[] {
  const changed = new Map(p.changed.map((c) => [c.before.id, c.after]))
  const ids = new Set(current.map((t) => t.id))
  // 새 업무 id 가 겹치면(다른 sourceUrl) 뒤에 표시를 붙여 덮어쓰지 않는다
  const added = p.added.map((t) => (ids.has(t.id) ? { ...t, id: `${t.id}-가져옴` } : t))
  return [...current.map((t) => changed.get(t.id) ?? t), ...added]
}
