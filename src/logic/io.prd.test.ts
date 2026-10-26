import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { seedTasks } from '../data/tasks'
import { applyMerge, normalizeTask, previewMerge } from './io'

// docs/wedding-agent-flow.md 의 "초기 데이터" JSON 을 그대로 가져와 본다(PRD 수용 기준: 재가져오기로 중복 생성 안 됨)
const PRD = new URL('../../docs/wedding-agent-flow.md', import.meta.url)

function prdTasks(): Record<string, unknown>[] {
  const md = readFileSync(PRD, 'utf8')
  const json = md.slice(md.indexOf('```json') + 7, md.lastIndexOf('```'))
  return JSON.parse(json).tasks
}

// docs/ 에 PRD 원문이 없으면(저장소에서 뺀 경우) 건너뛴다
describe.skipIf(!existsSync(PRD))('PRD 초기 데이터 가져오기', () => {
  it('sourceUrl 이 있어도 같은 id 의 기존 업무와 합쳐지고 중복이 생기지 않는다', () => {
    const cur = seedTasks()
    const inc = prdTasks().map((t) => normalizeTask(t, seedTasks()))
    const p = previewMerge(cur, inc)
    expect(p.added).toHaveLength(0)
    const merged = applyMerge(cur, p)
    expect(merged).toHaveLength(cur.length)
    // 두 번째 가져오기는 바뀌는 것이 없다
    const p2 = previewMerge(merged, inc)
    expect([p2.added.length, p2.changed.length]).toEqual([0, 0])
  })

  it('원본 날짜는 버린다', () => {
    const inc = normalizeTask(prdTasks()[0], seedTasks())
    expect(inc).not.toHaveProperty('originalStartDate')
  })
})
