import { describe, expect, it } from 'vitest'
import { seedTasks } from '../data/tasks'
import { buildPlans } from './recommend'
import { EMPTY_ANCHORS } from './schedule'
import { buildTodos, currentPhase, readiness, todayPicks } from './todo'

const answers = { 'q05.mood': ['garden'], 'q12.material': ['silk'], 'q04.region': ['gangnam'], 'q09.place': ['jeju'] }
const plan = buildPlans(answers)[0]
const today = '2026-10-26'

describe('todo', () => {
  it('고른 안의 업체가 해당 업무에 붙는다', () => {
    const items = buildTodos(seedTasks(), answers, plan, EMPTY_ANCHORS, today)
    expect(items.find((i) => i.task.id === 'T07')!.vendorNote).toContain('숲속가든홀')
    expect(items.find((i) => i.task.id === 'T23')!.next).toContain('실크라인 드레스')
  })

  it('제안 마일스톤은 채택 전엔 보이지 않는다', () => {
    const ts = seedTasks()
    expect(buildTodos(ts, answers, plan, EMPTY_ANCHORS, today).some((i) => i.task.id === 'M01')).toBe(false)
    ts.find((t) => t.id === 'M01')!.adopted = true
    expect(buildTodos(ts, answers, plan, EMPTY_ANCHORS, today).some((i) => i.task.id === 'M01')).toBe(true)
  })

  it('체크리스트는 필수 여부를 바꾸지 않고 제안만 한다', () => {
    const items = buildTodos(seedTasks(), { ...answers, 'q18.combo': ['snap'] }, plan, EMPTY_ANCHORS, today)
    const dvd = items.find((i) => i.task.id === 'T17')!
    expect(dvd.task.requiredForWedding).toBe(true)
    expect(dvd.suggestion).toContain('조합에 없어요')
  })

  it('선택으로 바꾸거나 제외하면 준비율 분모에서 빠진다', () => {
    const ts = seedTasks()
    const base = readiness(buildTodos(ts, answers, plan, EMPTY_ANCHORS, today))
    expect(base).toEqual({ done: 1, total: 47 }) // 56 - 신혼집·여행 9, 완료는 T08
    ts.find((t) => t.id === 'T17')!.requiredForWedding = false
    ts.find((t) => t.id === 'T18')!.excluded = true
    expect(readiness(buildTodos(ts, answers, plan, EMPTY_ANCHORS, today)).total).toBe(45)
  })

  it('본식일이 없으면 진행 중 먼저, 그다음 가장 이른 단계', () => {
    const picks = todayPicks(buildTodos(seedTasks(), answers, plan, EMPTY_ANCHORS, today), EMPTY_ANCHORS, today)
    expect(picks.map((p) => p.item.task.id)).toEqual(['T04', 'T05', 'T13'])
  })

  it('본식일이 있으면 기한 지난 일이 먼저, 막힌 일은 뒤로', () => {
    const anchors = { ...EMPTY_ANCHORS, wedding: '2027-05-22' }
    const ts = seedTasks()
    const picks = todayPicks(buildTodos(ts, answers, plan, anchors, today), anchors, today)
    expect(picks[0].reason).toContain('지났어요')
    expect(picks).toHaveLength(3)
  })

  it('보류 중인 일은 재검토일 전까지 다음 행동이 재검토', () => {
    const ts = seedTasks()
    const t09 = ts.find((t) => t.id === 'T09')!
    Object.assign(t09, { decisionStatus: '보류', holdReason: '양가 의견', nextReviewDate: '2026-11-10' })
    const item = buildTodos(ts, answers, plan, EMPTY_ANCHORS, today).find((i) => i.task.id === 'T09')!
    expect(item.onHold).toBe(true)
    expect(item.next).toContain('양가 의견')
  })
})

describe('지금 시기', () => {
  it('본식까지 남은 날로 단계를 고른다', () => {
    expect(currentPhase('2026-10-28', '2027-05-15')).toBe('p2') // 199일
    expect(currentPhase('2027-05-01', '2027-05-15')).toBe('p5')
    expect(currentPhase('2027-05-15', '2027-05-15')).toBe('p5')
    expect(currentPhase('2026-01-01', '2027-05-15')).toBe('p1')
  })
  it('본식일이 없거나 지났으면 표시하지 않는다', () => {
    expect(currentPhase('2026-10-28', null)).toBeNull()
    expect(currentPhase('2027-05-16', '2027-05-15')).toBeNull()
  })
})
