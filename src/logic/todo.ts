// 일정별 "무엇을 더 해야 하나". 체크리스트 답과 고른 안으로 업무를 맞춤하고, 오늘 할 일 3개를 고른다.
// 규칙 기반이다(AI 아님). 맞춤 근거는 note 에 남겨 사용자가 볼 수 있게 한다.
import { type Answers, get } from '../data/questions'
import { PHASES, type PhaseId, type Task, TASKS, type TaskStatus, phaseOf } from '../data/tasks'
import type { Plan } from './recommend'
import { hasOwnVenue } from './recommend'
import { type Anchors, type Resolved, daysBetween, dLabel, formatShort, isOverdue, resolve } from './schedule'

export interface TodoItem {
  task: Task
  title: string // 맞춤된 표시 제목
  r: Resolved
  phase: PhaseId
  status: TaskStatus
  optional: boolean // 답에 따라 필요 없을 수 있는 일(본식 필수 준비율에서 뺀다)
  note: string | null // 고른 업체·맞춤 이유
  next: string // 다음 행동 1개
  overdue: boolean
}

// 분류별 기본 다음 행동
const NEXT_BY_CATEGORY: Record<string, string> = {
  상견례: '양가에 가능한 날짜 3개씩 받기',
  '웨딩 스케치': '둘이 30분 앉아 기준 정하기',
  '홀 계약': '희망 날짜·예상 인원을 보내고 견적 받기',
  '스드메 계약': '후보 2~3곳에 같은 조건으로 견적 받기',
  '스튜디오 촬영': '원하는 컷 사진 10장 모으기',
  '드레스&예복': '투어 예약 2~3곳 잡기',
  '본식 준비': '할 사람·업체 후보 정하기',
  '청첩장 제작': '문구와 사진 고르기',
  신혼집: '둘의 조건(지역·예산·입주 시기) 맞추기',
  신혼여행: '후보지 3곳 기간·예산 비교하기',
}

function vendorOf(plan: Plan | undefined, cat: 'hall' | 'dress' | 'studio' | 'snap') {
  return plan?.picks.find((v) => v.category === cat)?.name.replace(' (예시)', '')
}

// 업무 하나를 답·안에 맞춘다.
function personalize(task: Task, answers: Answers, plan: Plan | undefined) {
  let title = task.title
  let note: string | null = null
  let optional = false
  let next = NEXT_BY_CATEGORY[task.category] ?? '첫 단계 정하기'
  const combo = get(answers, 'q18.combo')
  const skip = get(answers, 'q02.skip')
  const outfit = get(answers, 'q17.outfit')

  switch (task.id) {
    case 'T07': {
      if (hasOwnVenue(answers)) {
        title = '정한 예식장(교회 등)에 날짜 전달 및 예산 받기'
        note = '체크리스트: 이미 정한 곳'
      } else {
        const v = vendorOf(plan, 'hall')
        if (v) {
          note = `${plan!.letter}안 예식장 · ${v}`
          next = `${v}에 희망 날짜·인원 보내고 견적 받기`
        }
      }
      break
    }
    case 'T08':
    case 'T22': {
      const v = vendorOf(plan, 'studio')
      const snap = vendorOf(plan, 'snap')
      if (skip.includes('photo')) {
        optional = true
        note = '체크리스트: 사진은 생략 가능'
      } else if (v) note = `${plan!.letter}안 스튜디오 · ${v}${snap && task.id === 'T22' ? ` + ${snap}` : ''}`
      if (v && task.id === 'T08') next = `${v}에 촬영 가능 날짜 묻기`
      break
    }
    case 'T09':
    case 'T23': {
      const v = vendorOf(plan, 'dress')
      if (v) {
        note = `${plan!.letter}안 드레스샵 · ${v}`
        next = task.id === 'T23' ? `${v} 포함 투어 2~3곳 예약` : `${v} 견적의 추가금 확인 후 계약`
      }
      break
    }
    case 'T16':
    case 'T17':
    case 'T18': {
      const key = task.id === 'T16' ? 'snap' : task.id === 'T17' ? 'dvd' : 'iphone'
      if (combo.length > 0 && !combo.includes(key)) {
        optional = true
        note = '체크리스트: 본식 기록 조합에 없음'
      }
      break
    }
    case 'T40':
    case 'T55':
      if (outfit.length > 0 && !outfit.some((o) => o.startsWith('hanbok'))) {
        optional = true
        note = '체크리스트: 혼주 한복 없음'
      }
      break
    case 'T41':
      if (outfit.length > 0 && !outfit.some((o) => o.startsWith('suit'))) {
        optional = true
        note = '체크리스트: 혼주 정장 없음'
      }
      break
    case 'T54':
      if (get(answers, 'q07.style').includes('no-officiant')) {
        optional = true
        note = '체크리스트: 주례 없는 예식'
      }
      break
  }
  return { title, note, optional, next }
}

export function buildTodos(answers: Answers, plan: Plan | undefined, anchors: Anchors, statuses: Record<string, TaskStatus>, today: string): TodoItem[] {
  return TASKS.map((task) => {
    const r = resolve(task, anchors)
    const status = statuses[task.id] ?? '시작 전'
    const p = personalize(task, answers, plan)
    return { task, r, phase: phaseOf(task.dueDaysBefore), status, ...p, overdue: isOverdue(r, status === '완료', today) }
  })
}

// 본식 필수 준비율: 본식과 별개(신혼집·여행)와 선택 업무는 분모에서 뺀다.
export function readiness(items: TodoItem[]): { done: number; total: number } {
  const req = items.filter((i) => i.task.forWedding && !i.optional)
  return { done: req.filter((i) => i.status === '완료').length, total: req.length }
}

export interface Pick {
  item: TodoItem
  reason: string
}

// 오늘 할 일 최대 3개. 본식일이 있으면 기한 경과 → 지금 할 시기 → 곧 시작, 없으면 진행 중 → 가장 이른 단계.
export function todayPicks(items: TodoItem[], anchors: Anchors, today: string): Pick[] {
  const open = items.filter((i) => i.status !== '완료' && !i.optional)
  if (anchors.weddingDate) {
    const scored = open.map((i) => {
      const { start, due } = i.r
      if (i.overdue) return { i, rank: 0, key: due!, reason: `기한이 ${daysBetween(due!, today)}일 지났어요 (마감 ${formatShort(due!)})` }
      if (start! <= today) return { i, rank: 1, key: due!, reason: `지금 할 시기예요 · 마감 ${formatShort(due!)}, ${daysBetween(today, due!)}일 남음` }
      return { i, rank: 2, key: start!, reason: `${daysBetween(today, start!)}일 뒤 시작 (${formatShort(start!)})` }
    })
    scored.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key) || (a.i.status === '진행 중' ? -1 : 1))
    return scored.slice(0, 3).map((s) => ({ item: s.i, reason: s.reason }))
  }
  const sorted = [...open].sort(
    (a, b) => Number(b.status === '진행 중') - Number(a.status === '진행 중') || b.task.dueDaysBefore - a.task.dueDaysBefore || b.task.startDaysBefore - a.task.startDaysBefore,
  )
  return sorted.slice(0, 3).map((i) => ({
    item: i,
    reason: i.status === '진행 중' ? '진행 중인 일이에요' : `가장 먼저 할 단계예요 (${dLabel(i.r.startDays)}~${dLabel(i.r.dueDays)})`,
  }))
}

export function phaseLabel(id: PhaseId): string {
  return PHASES.find((p) => p.id === id)!.label
}

// 기간 표시: 날짜가 있으면 날짜, 없으면 D-day
export function rangeText(r: Resolved): string {
  if (r.start && r.due) return `${formatShort(r.start)} ~ ${formatShort(r.due)}`
  return `${dLabel(r.startDays, r.anchorLabel)} ~ ${dLabel(r.dueDays, r.anchorLabel)}`
}
