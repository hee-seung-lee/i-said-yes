import { describe, expect, it } from 'vitest'
import { type Contract, type Quote, balance, fmt, missingQuestions, quoteTotal, summarize, taskCost } from './money'

const q = (over: Partial<Quote> = {}): Quote => ({
  id: 'q1',
  taskId: 'T09',
  vendorName: '샵',
  basePrice: 3000000,
  mandatoryExtras: 500000,
  optionalExtras: 300000,
  taxIncluded: true,
  extrasConfirmed: true,
  evidence: '견적서',
  checkedAt: '2026-10-26',
  ...over,
})

describe('money', () => {
  it('추가금까지 확인하면 확정 총액, 선택 옵션은 더하지 않는다', () => {
    expect(quoteTotal(q())).toEqual({ value: 3500000, complete: true, label: '총 350만 원' })
  })

  it('부가세 별도면 10% 더한다', () => {
    expect(quoteTotal(q({ taxIncluded: false })).value).toBe(3850000)
  })

  it('추가금 미확인이면 확인된 최소금액', () => {
    const t = quoteTotal(q({ extrasConfirmed: false, mandatoryExtras: null }))
    expect(t.complete).toBe(false)
    expect(t.value).toBe(3000000)
    expect(t.label).toContain('최소')
  })

  it('빠진 정보만 질문으로 만든다', () => {
    expect(missingQuestions(q())).toHaveLength(0)
    expect(missingQuestions(q({ taxIncluded: null, evidence: '' }))).toHaveLength(2)
  })

  it('PRD 수용 기준: 예산 100만/계약 90만/지급 30만 → 예상 90만, 잔금 60만', () => {
    const c: Contract = { taskId: 'T09', quoteId: null, agreedTotal: 900000, payments: [{ id: 'p', amount: 300000, paidAt: null }] }
    expect(taskCost(c, undefined, 1000000)).toEqual({ value: 900000, source: '계약액', minimum: false })
    expect(balance(c)).toEqual({ remaining: 600000, overpaid: false })
  })

  it('예상비용은 계약 > 고른 견적 > 업무 예산 중 하나만', () => {
    expect(taskCost(undefined, q(), 1000000).source).toBe('고른 견적')
    expect(taskCost(undefined, undefined, 1000000).source).toBe('업무 예산')
    expect(taskCost(undefined, undefined, null).value).toBeNull()
    expect(taskCost(undefined, undefined, 0).value).toBe(0) // 0 과 null 구분
  })

  it('초과 지급은 확인 대상', () => {
    expect(balance({ taskId: 'x', quoteId: null, agreedTotal: 500000, payments: [{ id: 'p', amount: 600000, paidAt: null }] }).overpaid).toBe(true)
  })

  it('총예산이 없으면 초과를 단정하지 않는다', () => {
    const costs = [{ value: 5000000, source: '업무 예산' as const, minimum: false }]
    expect(summarize(costs, [], null, null).verdict).toBe('unknown')
    expect(summarize(costs, [], 4000000, null).verdict).toBe('over')
    expect(summarize(costs, [], 10000000, 6000000).verdict).toBe('over') // 예비비를 뺀 가용액 400만
    expect(summarize([{ value: 3000000, source: '고른 견적', minimum: true }], [], 10000000, null).verdict).toBe('maybe')
  })

  it('원 표기', () => {
    expect(fmt(950000)).toBe('95만 원')
    expect(fmt(953000)).toBe('95만 3,000원')
    expect(fmt(5000)).toBe('5,000원')
  })
})
