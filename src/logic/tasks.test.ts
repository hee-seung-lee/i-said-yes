import { describe, expect, it } from 'vitest'
import { CATEGORIES, newUserTask, seedTasks, withDefaults } from '../data/tasks'
import { EMPTY_ANCHORS, ganttSpan, resolve } from './schedule'

describe('업무 추가·기본값', () => {
  it('사용자 업무는 U 번호, origin=user, 노션 템플릿 필드는 비어 있다', () => {
    const t = newUserTask({ title: ' 축가 연습 ', categories: ['본식 준비'], startDaysBefore: 30, dueDaysBefore: 7, requiredForWedding: true }, seedTasks())
    expect(typeof t).toBe('object')
    const r = t as Exclude<typeof t, string>
    expect([r.id, r.title, r.origin, r.memo, r.actionItems.length, r.docs.length]).toEqual(['U62', '축가 연습', 'user', '', 0, 0])
  })

  it('이름이 없거나 시작이 마감보다 뒤면 거부', () => {
    expect(newUserTask({ title: ' ', categories: [], startDaysBefore: 10, dueDaysBefore: 5, requiredForWedding: true }, [])).toContain('이름')
    expect(newUserTask({ title: 'x', categories: [], startDaysBefore: 5, dueDaysBefore: 10, requiredForWedding: true }, [])).toContain('시작')
  })

  it('예전 저장본에 없는 필드를 채운다', () => {
    const { memo: _m, actionItems: _a, docs: _d, ...old } = seedTasks()[0]
    void _m
    void _a
    void _d
    const t = withDefaults(old as never)
    expect([t.memo, t.actionItems, t.docs]).toEqual(['', [], []])
  })

  it('노션 분류 10종을 모두 쓰고, 모든 업무 분류가 그 안에 있다', () => {
    expect(CATEGORIES).toHaveLength(10)
    expect(seedTasks().every((t) => t.categories.every((c) => CATEGORIES.includes(c)))).toBe(true)
  })
})

describe('간트', () => {
  it('본식일이 없으면 D-일수, 있으면 날짜로 같은 값', () => {
    const t = seedTasks().find((x) => x.id === 'T36')!
    expect(ganttSpan(t, resolve(t, EMPTY_ANCHORS), EMPTY_ANCHORS)).toEqual({ start: 56, end: 32 })
    const a = { ...EMPTY_ANCHORS, wedding: '2027-05-22' }
    expect(ganttSpan(t, resolve(t, a), a)).toEqual({ start: 56, end: 32 })
  })

  it('촬영일 기준 업무는 본식 축으로 환산', () => {
    const t = seedTasks().find((x) => x.id === 'T22')!
    const a = { ...EMPTY_ANCHORS, wedding: '2027-05-22', shoot: '2027-01-10' }
    expect(ganttSpan(t, resolve(t, a), a)).toEqual({ start: 162, end: 139 })
  })
})
