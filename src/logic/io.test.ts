import { describe, expect, it } from 'vitest'
import { seedTasks } from '../data/tasks'
import { applyMerge, previewMerge } from './io'

describe('JSON 가져오기', () => {
  it('같은 내용을 다시 가져와도 중복이 생기지 않는다(PRD 수용 기준)', () => {
    const cur = seedTasks()
    const p = previewMerge(cur, JSON.parse(JSON.stringify(cur)))
    expect([p.added.length, p.changed.length, p.same]).toEqual([0, 0, cur.length])
    expect(applyMerge(cur, p)).toHaveLength(cur.length)
  })

  it('바뀐 필드를 미리 보여 주고 적용하면 반영', () => {
    const cur = seedTasks()
    const inc = JSON.parse(JSON.stringify(cur))
    inc[0].status = '완료'
    const p = previewMerge(cur, inc)
    expect(p.changed[0].fields).toEqual(['status'])
    expect(applyMerge(cur, p)[0].status).toBe('완료')
  })

  it('sourceUrl 이 같으면 id 가 달라도 같은 업무', () => {
    const cur = seedTasks()
    cur[0].sourceUrl = 'https://example.com/a'
    const inc = [{ ...cur[0], id: 'X99' }]
    const p = previewMerge(cur, inc)
    expect(p.added).toHaveLength(0)
  })

  it('형식이 아닌 항목은 거른다', () => {
    expect(previewMerge(seedTasks(), [{ foo: 1 }]).invalid).toHaveLength(1)
  })
})
