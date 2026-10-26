// 견적·계약·예산 계산. 금액은 원 단위 정수(PRD: 원화). 화면 입력은 만 원으로 받아 바꾼다.
// PRD 비용 규칙: null(모름)과 0 을 구분, 추가금 미확인이면 확정 총액 대신 확인된 최소금액,
// 업무 예상비용은 계약액 > 고른 견적 > 업무 예산 중 하나만, 지급액은 비용에 더하지 않는다.

export interface Quote {
  id: string
  taskId: string
  vendorName: string
  basePrice: number | null // 기본가
  mandatoryExtras: number | null // 필수 추가금(피팅비·헬퍼비 등). null = 아직 모름
  optionalExtras: number | null // 선택 옵션(합산하지 않고 보여만 준다)
  taxIncluded: boolean | null // 부가세 포함 여부. null = 모름
  extrasConfirmed: boolean // 필수 추가금까지 업체에 확인했는지
  evidence: string // 근거(견적서 사진 위치, 상담 메모 등)
  checkedAt: string | null // 확인일
  sample?: boolean // 예시 업체에서 가져온 값
}

export interface Payment {
  id: string
  amount: number
  paidAt: string | null
}

export interface Contract {
  taskId: string
  quoteId: string | null
  agreedTotal: number
  payments: Payment[]
}

const TAX = 0.1

export interface QuoteTotal {
  value: number | null // 비교에 쓰는 값(확정 총액 또는 확인된 최소금액)
  complete: boolean // 총액이 확정됐는지
  label: string
}

// 확정 총액: 기본가·필수 추가금·세금 여부를 모두 알고 추가금을 확인했을 때만.
export function quoteTotal(q: Quote): QuoteTotal {
  if (q.basePrice === null) return { value: null, complete: false, label: '기본가 미확인' }
  const extras = q.mandatoryExtras ?? 0
  const pre = q.basePrice + extras
  const complete = q.extrasConfirmed && q.mandatoryExtras !== null && q.taxIncluded !== null
  if (complete) {
    const total = q.taxIncluded ? pre : Math.round(pre * (1 + TAX))
    return { value: total, complete: true, label: `총 ${fmt(total)}` }
  }
  return { value: pre, complete: false, label: `확인된 최소 ${fmt(pre)}~` }
}

// 업체에 물어볼 것(빠진 정보만)
export function missingQuestions(q: Quote): string[] {
  const out: string[] = []
  if (q.basePrice === null) out.push('기본가가 얼마인가요?')
  if (!q.extrasConfirmed || q.mandatoryExtras === null) out.push('꼭 붙는 추가금(피팅비·헬퍼비·원본 등)이 있나요? 있다면 얼마인가요?')
  if (q.taxIncluded === null) out.push('부가세 포함 금액인가요?')
  if (!q.evidence.trim()) out.push('견적서를 문자나 메일로 받을 수 있을까요?')
  return out
}

export function inquiryText(vendorName: string, taskTitle: string, questions: string[]): string {
  return [`안녕하세요, ${taskTitle} 관련해 문의드립니다.`, ...questions.map((q, i) => `${i + 1}. ${q}`), '확인 부탁드립니다. 감사합니다.']
    .join('\n')
    .replace('안녕하세요,', `안녕하세요 ${vendorName} 담당자님,`)
}

export interface TaskCost {
  value: number | null
  source: '계약액' | '고른 견적' | '업무 예산' | null
  minimum: boolean // 확정이 아닌 최소금액인지
}

export function taskCost(contract: Contract | undefined, chosen: Quote | undefined, taskBudget: number | null | undefined): TaskCost {
  if (contract) return { value: contract.agreedTotal, source: '계약액', minimum: false }
  if (chosen) {
    const t = quoteTotal(chosen)
    if (t.value !== null) return { value: t.value, source: '고른 견적', minimum: !t.complete }
  }
  if (taskBudget !== null && taskBudget !== undefined) return { value: taskBudget, source: '업무 예산', minimum: false }
  return { value: null, source: null, minimum: false }
}

export function paidSum(c: Contract): number {
  return c.payments.reduce((s, p) => s + p.amount, 0)
}

// 잔금 = 계약액 - 지급 합계. 음수면 초과 지급(확인 대상).
export function balance(c: Contract): { remaining: number; overpaid: boolean } {
  const r = c.agreedTotal - paidSum(c)
  return { remaining: r, overpaid: r < 0 }
}

export interface BudgetSummary {
  expected: number // 업무 예상비용 합
  hasMinimum: boolean // 최소금액이 섞여 있음
  paid: number
  remaining: number
  totalBudget: number | null
  reserve: number | null
  usable: number | null // 총예산 - 예비비
  verdict: 'unknown' | 'within' | 'over' | 'over-min' | 'maybe'
}

// 총예산이 없으면 초과 여부를 단정하지 않는다. 최소금액만으로 넘으면 초과 확정.
export function summarize(costs: TaskCost[], contracts: Contract[], totalBudget: number | null, reserve: number | null): BudgetSummary {
  const known = costs.filter((c) => c.value !== null)
  const expected = known.reduce((s, c) => s + (c.value ?? 0), 0)
  const hasMinimum = known.some((c) => c.minimum)
  const paid = contracts.reduce((s, c) => s + paidSum(c), 0)
  const remaining = contracts.reduce((s, c) => s + balance(c).remaining, 0)
  const usable = totalBudget === null ? null : totalBudget - (reserve ?? 0)
  let verdict: BudgetSummary['verdict'] = 'unknown'
  if (usable !== null) {
    if (expected > usable) verdict = hasMinimum ? 'over-min' : 'over'
    else verdict = hasMinimum ? 'maybe' : 'within'
  }
  return { expected, hasMinimum, paid, remaining, totalBudget, reserve, usable, verdict }
}

// 950000 → "95만 원", 953000 → "95만 3,000원"
export function fmt(won: number): string {
  const sign = won < 0 ? '-' : ''
  const n = Math.abs(Math.round(won))
  const man = Math.floor(n / 10000)
  const rest = n % 10000
  if (man === 0) return `${sign}${rest.toLocaleString()}원`
  return rest === 0 ? `${sign}${man.toLocaleString()}만 원` : `${sign}${man.toLocaleString()}만 ${rest.toLocaleString()}원`
}

export const toWon = (man: number) => Math.round(man * 10000)
export const toMan = (won: number) => Math.round((won / 10000) * 100) / 100

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
