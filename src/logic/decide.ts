// 결정 도우미. PRD "에이전트의 결정 지원" 흐름을 단계로 계산한다.
//  선행 조건 → (구매·예약이면) 후보 최대 3개 → 총액·추가금 확인 → 예산 → 추천 1개+대안+이유 → 사용자 결정 → 계약·예약 확인 → 완료 기준
// 실제 업체 가격을 만들거나 '바가지/최저가'로 단정하지 않는다. 사용자가 넣은 견적끼리만 비교한다.
import type { TaskRecord } from '../data/tasks'
import { type Contract, type Quote, fmt, missingQuestions, quoteTotal } from './money'

export const MAX_CANDIDATES = 3

// 구매·예약이 필요한 업무(견적 비교 대상)
export const PURCHASE_TASKS = new Set([
  'T07', 'T08', 'T09', 'T10', 'T11', 'T12', 'T13', 'T16', 'T17', 'T18', 'T19', 'T20', 'T21',
  'T28', 'T29', 'T40', 'T41', 'T42', 'T43', 'T47', 'T50',
])

export function needsPurchase(t: TaskRecord): boolean {
  return PURCHASE_TASKS.has(t.id)
}

export type Step = 'blocked' | 'setup' | 'collect' | 'confirm' | 'budget' | 'recommend' | 'hold' | 'contract' | 'criteria' | 'done'

export const STEP_LABEL: Record<Step, string> = {
  blocked: '먼저 할 일',
  setup: '담당자·마감·완료 기준',
  collect: '후보 모으기',
  confirm: '총액 확인',
  budget: '예산 맞추기',
  recommend: '추천 보기',
  hold: '보류 중',
  contract: '계약·예약 확인',
  criteria: '완료 기준 확인',
  done: '완료',
}

export interface Recommendation {
  pick: Quote
  alternatives: Quote[]
  reasons: string[]
  provisional: boolean // 확정 총액이 없어 잠정 추천
}

// 같은 조건(확정 총액 또는 확인된 최소금액)으로 비교해 추천 1개와 대안을 낸다.
export function recommend(quotes: Quote[], budget: number | null): Recommendation | null {
  const priced = quotes.map((q) => ({ q, t: quoteTotal(q) })).filter((x) => x.t.value !== null)
  if (priced.length === 0) return null
  const complete = priced.filter((x) => x.t.complete)
  const pool = complete.length ? complete : priced
  const within = budget === null ? pool : pool.filter((x) => x.t.value! <= budget)
  const ranked = [...(within.length ? within : pool)].sort((a, b) => a.t.value! - b.t.value!)
  const best = ranked[0]
  const reasons: string[] = []
  if (best.t.complete) reasons.push(`총액이 확정된 후보 중 ${ranked.length > 1 ? '가장 낮아요' : '하나뿐이에요'} (${fmt(best.t.value!)})`)
  else reasons.push(`확정 총액이 아직 없어 확인된 최소금액(${fmt(best.t.value!)})으로 비교했어요`)
  if (budget !== null) reasons.push(best.t.value! <= budget ? `업무 예산 ${fmt(budget)} 안이에요` : `모든 후보가 업무 예산 ${fmt(budget)}을 넘어요`)
  if (best.q.evidence.trim()) reasons.push('견적 근거가 있어요')
  const alternatives = priced.filter((x) => x.q.id !== best.q.id).sort((a, b) => a.t.value! - b.t.value!).map((x) => x.q)
  return { pick: best.q, alternatives, reasons, provisional: !best.t.complete }
}

export interface DecisionState {
  step: Step
  blockedBy: TaskRecord[]
  incomplete: { quote: Quote; questions: string[] }[]
  overBudget: boolean
  rec: Recommendation | null
}

export function decisionState(
  t: TaskRecord,
  blockedBy: TaskRecord[],
  quotes: Quote[],
  contract: Contract | undefined,
  budget: number | null,
): DecisionState {
  // 총액이 확정 안 된 후보(근거 누락은 질문에만 넣고 확정 여부는 금액 정보로만 본다)
  const incomplete = quotes.filter((q) => !quoteTotal(q).complete).map((q) => ({ quote: q, questions: missingQuestions(q) }))
  const rec = recommend(quotes, budget)
  const overBudget = budget !== null && rec !== null && quoteTotal(rec.pick).value! > budget
  const base = { blockedBy, incomplete, overBudget, rec }
  if (t.status === '완료') return { step: 'done', ...base }
  if (!needsPurchase(t)) return { step: t.completionCriteria.trim() ? 'criteria' : 'setup', ...base }
  if (t.decisionStatus === '보류') return { step: 'hold', ...base }
  if (contract || t.decisionStatus === '계약 확인') return { step: 'criteria', ...base }
  if (t.decisionStatus === '선택함') return { step: 'contract', ...base }
  // 선행 일이 남아 있어도 후보 조사는 할 수 있다(PRD). 그래서 막힘은 결정 단계에서만 건다.
  if (quotes.length === 0) return { step: blockedBy.length ? 'blocked' : 'collect', ...base }
  if (incomplete.length === quotes.length) return { step: 'confirm', ...base }
  if (overBudget) return { step: 'budget', ...base }
  return { step: blockedBy.length ? 'blocked' : 'recommend', ...base }
}
