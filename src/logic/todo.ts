// 일정별 "무엇을 더 해야 하나". 업무 기록 + 체크리스트 답 + 고른 안으로 표시용 항목을 만들고 오늘 할 일 3개를 고른다.
// 규칙 기반(AI 아님). 필수 여부는 사용자가 정한다(PRD) — 체크리스트 답은 "선택으로 바꿀까요?" 제안만 한다.
import { type Answers, get } from '../data/questions'
import { PHASES, type PhaseId, type TaskRecord, phaseOf } from '../data/tasks'
import type { Plan } from './recommend'
import { hasOwnVenue } from './recommend'
import { type Anchors, type Resolved, blockers, daysBetween, dLabel, formatShort, isOverdue, resolve } from './schedule'

export interface TodoItem {
  task: TaskRecord
  r: Resolved
  phase: PhaseId
  overdue: boolean
  blockedBy: TaskRecord[]
  onHold: boolean // 결정 보류 중이고 재검토일 전
  vendorNote: string | null // 고른 안 업체
  suggestion: string | null // 체크리스트 기준 "선택으로 바꿀까요?" 이유
  next: string // 다음 행동 1개
}

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
  본식: '당일 진행표 마지막으로 확인하기',
}

function vendorOf(plan: Plan | undefined, cat: 'hall' | 'dress' | 'studio' | 'snap') {
  return plan?.picks.find((v) => v.category === cat)?.name.replace(' (예시)', '')
}

function hints(t: TaskRecord, answers: Answers, plan: Plan | undefined) {
  let vendorNote: string | null = null
  let suggestion: string | null = null
  let next = NEXT_BY_CATEGORY[t.categories[0]] ?? '첫 단계 정하기'
  const combo = get(answers, 'q18.combo')
  const outfit = get(answers, 'q17.outfit')
  switch (t.id) {
    case 'T07':
      if (hasOwnVenue(answers)) {
        vendorNote = '체크리스트: 예식장은 이미 정한 곳(교회 등)'
        next = '정한 곳에 날짜 전달하고 비용 확인하기'
      } else if (vendorOf(plan, 'hall')) {
        vendorNote = `${plan!.letter}안 예식장 · ${vendorOf(plan, 'hall')}`
        next = `${vendorOf(plan, 'hall')}에 희망 날짜·인원 보내고 견적 받기`
      }
      break
    case 'T08':
    case 'T22':
      if (get(answers, 'q02.skip').includes('photo')) suggestion = '체크리스트에서 사진을 생략 가능 항목으로 골랐어요'
      else if (vendorOf(plan, 'studio')) {
        vendorNote = `${plan!.letter}안 스튜디오 · ${vendorOf(plan, 'studio')}${t.id === 'T22' && vendorOf(plan, 'snap') ? ` + ${vendorOf(plan, 'snap')}` : ''}`
        if (t.id === 'T08') next = `${vendorOf(plan, 'studio')}에 촬영 가능 날짜 묻기`
      }
      break
    case 'T09':
    case 'T23':
      if (vendorOf(plan, 'dress')) {
        vendorNote = `${plan!.letter}안 드레스샵 · ${vendorOf(plan, 'dress')}`
        next = t.id === 'T23' ? `${vendorOf(plan, 'dress')} 포함 투어 2~3곳 예약` : `${vendorOf(plan, 'dress')} 견적의 추가금 확인 후 결정`
      }
      break
    case 'T16':
    case 'T17':
    case 'T18': {
      const k = t.id === 'T16' ? 'snap' : t.id === 'T17' ? 'dvd' : 'iphone'
      if (combo.length > 0 && !combo.includes(k)) suggestion = '체크리스트의 본식 기록 조합에 없어요'
      break
    }
    case 'T40':
    case 'T55':
      if (outfit.length > 0 && !outfit.some((o) => o.startsWith('hanbok'))) suggestion = '체크리스트에서 혼주 한복을 고르지 않았어요'
      break
    case 'T41':
      if (outfit.length > 0 && !outfit.some((o) => o.startsWith('suit'))) suggestion = '체크리스트에서 혼주 정장을 고르지 않았어요'
      break
    case 'T54':
      if (get(answers, 'q07.style').includes('no-officiant')) suggestion = '체크리스트에서 주례 없는 예식을 골랐어요'
      break
  }
  // 이미 선택(필수 아님)이면 제안할 필요 없다
  if (!t.requiredForWedding) suggestion = null
  return { vendorNote, suggestion, next }
}

export function buildTodos(tasks: TaskRecord[], answers: Answers, plan: Plan | undefined, anchors: Anchors, today: string): TodoItem[] {
  return tasks
    .filter((t) => t.adopted)
    .map((t) => {
      const r = resolve(t, anchors)
      const blockedBy = blockers(t, tasks)
      const onHold = t.decisionStatus === '보류' && (!t.nextReviewDate || t.nextReviewDate > today)
      const h = hints(t, answers, plan)
      let next = h.next
      if (blockedBy.length) next = `먼저 '${blockedBy[0].title}' 끝내기 (후보 조사는 지금 해도 돼요)`
      else if (onHold) next = `${t.nextReviewDate ? formatShort(t.nextReviewDate) + '에 ' : ''}'${t.holdReason ?? '막힌 기준'}' 다시 보기`
      return {
        task: t,
        r,
        phase: phaseOf(r.dueDays),
        overdue: isOverdue(r, t.status === '완료', today),
        blockedBy,
        onHold,
        vendorNote: h.vendorNote,
        suggestion: h.suggestion,
        next,
      }
    })
}

// 본식 필수 준비율: 필수 여부가 켜진, 제외하지 않은 일만 분모에 넣는다(신혼집·여행은 기본이 필수 아님)
export function readiness(items: TodoItem[]): { done: number; total: number } {
  const req = items.filter((i) => i.task.requiredForWedding && !i.task.excluded)
  return { done: req.filter((i) => i.task.status === '완료').length, total: req.length }
}

export interface Pick {
  item: TodoItem
  reason: string
}

// 오늘 할 일 최대 3개.
//  본식일이 있으면: 기한 지남 → 지금 할 시기 → 곧 시작. 없으면: 진행 중 → 가장 이른 단계.
//  막힌 일·보류 중인 일은 뒤로 미룬다.
export function todayPicks(items: TodoItem[], anchors: Anchors, today: string): Pick[] {
  const open = items.filter((i) => i.task.status !== '완료' && !i.task.excluded)
  const penalty = (i: TodoItem) => (i.blockedBy.length || i.onHold ? 10 : 0)
  if (anchors.wedding) {
    const scored = open.map((i) => {
      const { start, due } = i.r
      if (!start || !due) return { i, rank: 5 + penalty(i), key: '', reason: '기준일을 넣으면 날짜가 생겨요' }
      if (i.overdue) return { i, rank: 0 + penalty(i), key: due, reason: `기한이 ${daysBetween(due, today)}일 지났어요 (마감 ${formatShort(due)})` }
      if (start <= today) return { i, rank: 1 + penalty(i), key: due, reason: `지금 할 시기예요 · 마감 ${formatShort(due)}, ${daysBetween(today, due)}일 남음` }
      return { i, rank: 2 + penalty(i), key: start, reason: `${daysBetween(today, start)}일 뒤 시작 (${formatShort(start)})` }
    })
    scored.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key) || Number(b.i.task.status === '진행 중') - Number(a.i.task.status === '진행 중'))
    return scored.slice(0, 3).map((s) => ({ item: s.i, reason: s.i.blockedBy.length ? `먼저 할 일이 있어요 · ${s.reason}` : s.reason }))
  }
  const sorted = [...open].sort(
    (a, b) =>
      penalty(a) - penalty(b) ||
      Number(b.task.status === '진행 중') - Number(a.task.status === '진행 중') ||
      b.r.dueDays - a.r.dueDays ||
      b.r.startDays - a.r.startDays,
  )
  return sorted.slice(0, 3).map((i) => ({
    item: i,
    reason: i.task.status === '진행 중' ? '진행 중인 일이에요' : `가장 먼저 할 단계예요 (${dLabel(i.r.startDays)}~${dLabel(i.r.dueDays)})`,
  }))
}

export function phaseLabel(id: PhaseId): string {
  return PHASES.find((p) => p.id === id)!.label
}

// 오늘이 속한 단계. 본식일이 없거나 이미 지났으면 알 수 없어 null
export function currentPhase(today: string, wedding: string | null): PhaseId | null {
  if (!wedding) return null
  const d = daysBetween(today, wedding)
  return d < 0 ? null : phaseOf(d)
}
