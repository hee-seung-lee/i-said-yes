import { describe, expect, it } from 'vitest'
import { seedTasks } from '../data/tasks'
import { EMPTY_ANCHORS, blockers, compressPlan, conflicts, daysBetween, dLabel, isOverdue, lateTasks, minusDays, reschedulePreview, resolve, validDays, wouldCycle } from './schedule'

const tasks = seedTasks()
const task = (id: string) => tasks.find((t) => t.id === id)!
const W = { ...EMPTY_ANCHORS, wedding: '2027-05-22' }

describe('PRD 수용 기준', () => {
  it('원본 56개, 시작 전 52 / 진행 중 3 / 완료 1, 예산 입력 1개 950,000원', () => {
    const src = tasks.filter((t) => t.origin === 'source')
    expect(src).toHaveLength(56)
    const count = (s: string) => src.filter((t) => t.status === s).length
    expect([count('시작 전'), count('진행 중'), count('완료')]).toEqual([52, 3, 1])
    expect(src.filter((t) => t.budget !== null).map((t) => t.budget)).toEqual([950000])
  })

  it('원본 날짜 필드가 없다(스케줄에 쓰지 않음)', () => {
    expect(Object.keys(task('T01'))).not.toContain('originalStartDate')
  })

  it('본식 2027-05-22 에서 D-56 = 2027-03-27, D-32 = 2027-04-20', () => {
    expect(minusDays('2027-05-22', 56)).toBe('2027-03-27')
    expect(minusDays('2027-05-22', 32)).toBe('2027-04-20')
    expect(resolve(task('T36'), W).due).toBe('2027-04-20')
  })

  it('본식일 null 이면 실제 날짜·지연 판단 없이 상대 일정', () => {
    const r = resolve(task('T36'), EMPTY_ANCHORS)
    expect([r.start, r.due, r.dueDays]).toEqual([null, null, 32])
    expect(isOverdue(r, false, '2099-01-01')).toBe(false)
  })

  it('촬영일 입력 후 T22 는 촬영일 -30 ~ -7', () => {
    const r = resolve(task('T22'), { ...W, shoot: '2027-01-10' })
    expect([r.anchorLabel, r.start, r.due]).toEqual(['촬영', '2026-12-11', '2027-01-03'])
  })

  it('본식일 변경 시 확정 예약과 완료일 보존', () => {
    const ts = seedTasks()
    ts.find((t) => t.id === 'T19')!.fixedDue = '2026-12-01'
    const t20 = ts.find((t) => t.id === 'T20')!
    t20.status = '완료'
    t20.completedAt = '2026-10-01'
    const { changed, kept } = reschedulePreview(ts, W, { ...W, wedding: '2027-06-05' })
    expect(kept.map((t) => t.id)).toEqual(expect.arrayContaining(['T19', 'T20']))
    expect(changed.some((c) => c.task.id === 'T19' || c.task.id === 'T20')).toBe(false)
    expect(resolve(ts.find((t) => t.id === 'T19')!, { ...W, wedding: '2027-06-05' }).due).toBe('2026-12-01')
  })

  it('순환 의존 거부', () => {
    // 기본 제안: T34(드레스 가봉) ← T09(드레스 계약) ← T23(투어)
    expect(wouldCycle(tasks, 'T23', 'T34')).toBe(true)
    expect(wouldCycle(tasks, 'T34', 'T23')).toBe(false)
    expect(wouldCycle(tasks, 'T01', 'T01')).toBe(true)
  })

  it('신혼집·여행은 본식 필수가 아니다', () => {
    expect(['T14', 'T15', 'T25', 'T26', 'T27', 'T28', 'T29', 'T33', 'T39'].every((id) => !task(id).requiredForWedding)).toBe(true)
  })
})

describe('선행 관계', () => {
  it('확인한 hard 관계만 막는다', () => {
    const ts = seedTasks()
    const t09 = ts.find((t) => t.id === 'T09')!
    expect(blockers(t09, ts)).toHaveLength(0) // 제안은 미확인 상태
    t09.dependencies.find((d) => d.taskId === 'T07')!.confirmed = true
    expect(blockers(t09, ts).map((t) => t.id)).toEqual(['T07'])
  })

  it('촬영 날짜 확정 완료가 실제 촬영 완료로 번지지 않는다', () => {
    expect(task('T08').status).toBe('완료')
    expect(task('M01').status).toBe('시작 전')
  })

  it('선행 마감이 늦으면 자동 연기 없이 대체안만 낸다', () => {
    const ts = seedTasks()
    const t51 = ts.find((t) => t.id === 'T51')!
    t51.dependencies.find((d) => d.taskId === 'T44')!.confirmed = true
    ts.find((t) => t.id === 'T44')!.fixedDue = '2027-05-20'
    const c = conflicts(ts, W)
    expect(c[0].task.id).toBe('T51')
    expect(c[0].options).toHaveLength(3)
    expect(resolve(t51, W).due).toBe('2027-05-15') // 그대로
  })
})

describe('늦게 시작', () => {
  it('지난 단계만 고르고 압축 마감은 오늘~본식 사이', () => {
    const late = lateTasks(tasks, W, '2026-10-26')
    expect(late.length).toBeGreaterThan(0)
    expect(late.every((t) => t.status !== '완료')).toBe(true)
    const plan = compressPlan(late, W, '2026-10-26')
    expect(plan.every((p) => p.due > '2026-10-26' && p.due < '2027-05-22')).toBe(true)
  })
})

describe('표시', () => {
  it('검증과 표기', () => {
    expect(validDays(30, 60)).not.toBeNull()
    expect(validDays(60, 30)).toBeNull()
    expect(minusDays('2028-03-01', 1)).toBe('2028-02-29')
    expect(daysBetween('2027-12-31', '2028-01-01')).toBe(1)
    expect(dLabel(0)).toBe('D-day')
  })
})
