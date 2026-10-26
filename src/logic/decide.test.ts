import { describe, expect, it } from 'vitest'
import { seedTasks } from '../data/tasks'
import { decisionState, recommend } from './decide'
import type { Quote } from './money'

const q = (id: string, base: number | null, over: Partial<Quote> = {}): Quote => ({
  id,
  taskId: 'T09',
  vendorName: id,
  basePrice: base,
  mandatoryExtras: 0,
  optionalExtras: null,
  taxIncluded: true,
  extrasConfirmed: true,
  evidence: '',
  checkedAt: null,
  ...over,
})
const t09 = () => seedTasks().find((t) => t.id === 'T09')!

describe('decide', () => {
  it('확정 총액이 있는 후보를 우선해 가장 낮은 것을 추천, 나머지는 대안', () => {
    const r = recommend([q('a', 3000000), q('b', 2500000, { extrasConfirmed: false, mandatoryExtras: null }), q('c', 2800000)], null)!
    expect(r.pick.id).toBe('c')
    expect(r.alternatives.map((x) => x.id)).toEqual(['b', 'a'])
    expect(r.provisional).toBe(false)
  })

  it('예산 안 후보를 우선', () => {
    expect(recommend([q('a', 3000000), q('c', 2800000)], 2900000)!.pick.id).toBe('c')
    expect(recommend([q('a', 3000000), q('c', 3200000)], 2900000)!.reasons.join()).toContain('넘어요')
  })

  it('후보가 없으면 모으기, 총액이 하나도 확정 안 되면 확인 단계', () => {
    expect(decisionState(t09(), [], [], undefined, null).step).toBe('collect')
    expect(decisionState(t09(), [], [q('a', null)], undefined, null).step).toBe('confirm')
  })

  it('예산 초과면 예산 단계, 아니면 추천', () => {
    expect(decisionState(t09(), [], [q('a', 3000000)], undefined, 2000000).step).toBe('budget')
    expect(decisionState(t09(), [], [q('a', 3000000)], undefined, null).step).toBe('recommend')
  })

  it('선택 뒤에도 계약 확인을 따로 받는다', () => {
    const t = { ...t09(), decisionStatus: '선택함' as const }
    expect(decisionState(t, [], [q('a', 3000000)], undefined, null).step).toBe('contract')
    expect(decisionState(t, [], [q('a', 3000000)], { taskId: 'T09', quoteId: 'a', agreedTotal: 3000000, payments: [] }, null).step).toBe('criteria')
  })

  it('보류면 보류 단계, 막혀도 후보 조사는 가능', () => {
    expect(decisionState({ ...t09(), decisionStatus: '보류' }, [], [], undefined, null).step).toBe('hold')
    const blocked = decisionState(t09(), [seedTasks()[6]], [], undefined, null)
    expect(blocked.step).toBe('blocked')
  })
})
