import { describe, expect, it } from 'vitest'
import { TASKS } from '../data/tasks'
import { EMPTY_ANCHORS, daysBetween, dLabel, isOverdue, minusDays, resolve } from './schedule'

const task = (id: string) => TASKS.find((t) => t.id === id)!

describe('schedule', () => {
  it('업무 56개', () => {
    expect(TASKS).toHaveLength(56)
    expect(TASKS.every((t) => t.startDaysBefore >= t.dueDaysBefore)).toBe(true)
  })

  it('본식 2027-05-22 기준 D-56·D-32 (PRD 수용 기준)', () => {
    expect(minusDays('2027-05-22', 56)).toBe('2027-03-27')
    expect(minusDays('2027-05-22', 32)).toBe('2027-04-20')
    expect(minusDays('2027-05-22', -7)).toBe('2027-05-29')
  })

  it('본식일이 없으면 날짜 없이 상대 일정만', () => {
    const r = resolve(task('T36'), EMPTY_ANCHORS)
    expect(r.start).toBeNull()
    expect(r.due).toBeNull()
    expect(r.dueDays).toBe(32)
    expect(isOverdue(r, false, '2099-01-01')).toBe(false)
  })

  it('촬영일을 넣으면 T22 는 촬영 30~7일 전', () => {
    const r = resolve(task('T22'), { ...EMPTY_ANCHORS, weddingDate: '2027-05-22', shootDate: '2027-01-10' })
    expect(r.anchorLabel).toBe('촬영')
    expect(r.start).toBe('2026-12-11')
    expect(r.due).toBe('2027-01-03')
  })

  it('기한 경과는 실제 마감이 지났고 미완료일 때만', () => {
    const r = resolve(task('T51'), { ...EMPTY_ANCHORS, weddingDate: '2027-05-22' })
    expect(isOverdue(r, false, '2027-05-16')).toBe(true)
    expect(isOverdue(r, true, '2027-05-16')).toBe(false)
    expect(isOverdue(r, false, '2027-05-15')).toBe(false)
  })

  it('윤년·월말을 넘어도 하루가 밀리지 않는다', () => {
    expect(minusDays('2028-03-01', 1)).toBe('2028-02-29')
    expect(daysBetween('2027-12-31', '2028-01-01')).toBe(1)
    expect(dLabel(0)).toBe('D-day')
    expect(dLabel(30, '촬영')).toBe('촬영-30')
  })
})
