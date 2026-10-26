import { describe, expect, it } from 'vitest'
import { buildPlans } from './recommend'
import { EMPTY_ANCHORS } from './schedule'
import { buildTodos, readiness, todayPicks } from './todo'

const answers = { 'q05.mood': ['garden'], 'q12.material': ['silk'], 'q04.region': ['gangnam'], 'q09.place': ['jeju'] }
const plan = buildPlans(answers)[0]

describe('todo', () => {
  it('고른 안의 업체가 해당 업무에 붙는다', () => {
    const items = buildTodos(answers, plan, EMPTY_ANCHORS, {}, '2026-10-26')
    expect(items.find((i) => i.task.id === 'T07')!.note).toContain('숲속가든홀')
    expect(items.find((i) => i.task.id === 'T23')!.next).toContain('실크라인 드레스')
  })

  it('이미 정한 예식장이면 T07 제목이 바뀐다', () => {
    const items = buildTodos({ ...answers, 'q05.mood': ['own'] }, plan, EMPTY_ANCHORS, {}, '2026-10-26')
    expect(items.find((i) => i.task.id === 'T07')!.title).toContain('정한 예식장')
  })

  it('본식 기록 조합에 없는 DVD 는 선택 업무가 되고 준비율 분모에서 빠진다', () => {
    const base = readiness(buildTodos(answers, plan, EMPTY_ANCHORS, {}, '2026-10-26'))
    const items = buildTodos({ ...answers, 'q18.combo': ['snap'] }, plan, EMPTY_ANCHORS, {}, '2026-10-26')
    expect(items.find((i) => i.task.id === 'T17')!.optional).toBe(true)
    expect(readiness(items).total).toBe(base.total - 2) // DVD, 아이폰 스냅
  })

  it('신혼집·여행은 본식 필수 준비율에 들지 않는다', () => {
    const r = readiness(buildTodos(answers, plan, EMPTY_ANCHORS, {}, '2026-10-26'))
    expect(r.total).toBe(56 - 9) // 신혼집 5 + 신혼여행 4
  })

  it('본식일이 없으면 가장 이른 단계 3개', () => {
    const items = buildTodos(answers, plan, EMPTY_ANCHORS, {}, '2026-10-26')
    expect(todayPicks(items, EMPTY_ANCHORS, '2026-10-26').map((p) => p.item.task.id)).toEqual(['T04', 'T05', 'T01'])
  })

  it('본식일이 있으면 기한 지난 일이 먼저', () => {
    const anchors = { ...EMPTY_ANCHORS, weddingDate: '2027-05-22' }
    const items = buildTodos(answers, plan, anchors, {}, '2026-10-26')
    const picks = todayPicks(items, anchors, '2026-10-26')
    expect(picks[0].reason).toContain('지났어요')
    expect(picks).toHaveLength(3)
  })
})
