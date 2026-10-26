import { describe, expect, it } from 'vitest'
import { buildPlans, countConditions, recommendedKey } from './recommend'

describe('buildPlans', () => {
  const answers = {
    'q09.place': ['jeju'],
    'q05.mood': ['garden'],
    'q12.material': ['silk'],
    'q04.region': ['gangnam'],
    'q01.target': ['3000'],
  }

  it('A·B·C 세 안을 만든다', () => {
    expect(buildPlans(answers).map((p) => p.letter)).toEqual(['A', 'B', 'C'])
  })

  it('취향 우선 안은 지역 안에서 조건을 모두 맞춘다', () => {
    const taste = buildPlans(answers)[0]
    expect(taste.picks.map((v) => v.id)).toEqual(['h1', 'd1', 's1', 'p1'])
    expect(taste.matched).toBe(3)
    expect(taste.conditions).toBe(3)
  })

  it('필수 조건을 모두 갖춘 예식장을 우선한다', () => {
    const taste = buildPlans({ ...answers, 'q05.mood': ['dark'], 'q06.must': ['solo', 'food'] })[0]
    expect(taste.picks[0].id).toBe('h2')
    expect(taste.reasons).toContain('필수 조건 2/2 충족')
  })

  it('별도 촬영을 안 하면 촬영 업체를 넣지 않는다', () => {
    const plans = buildPlans({ ...answers, 'q09.place': ['none'] })
    expect(plans.every((p) => p.picks.every((v) => v.category !== 'snap'))).toBe(true)
  })

  it('사진이 생략 가능 항목이면 스튜디오를 넣지 않는다', () => {
    const plans = buildPlans({ ...answers, 'q02.skip': ['photo'] })
    expect(plans.every((p) => p.picks.every((v) => v.category !== 'studio'))).toBe(true)
  })

  it('드레스샵은 방문 가능 지역(q13)으로 고른다', () => {
    const taste = buildPlans({ ...answers, 'q13.region': ['gangbuk'] })[0]
    expect(taste.picks.find((v) => v.category === 'dress')?.id).toBe('d3')
  })

  it('모르겠어요는 조건으로 세지 않는다', () => {
    expect(countConditions({ 'q05.mood': ['unknown'], 'q12.material': ['unknown'], 'q09.place': ['none'] })).toBe(0)
  })

  it('지역에 맞는 업체가 없으면 다른 지역에서 고르고 이유를 남긴다', () => {
    const taste = buildPlans({ ...answers, 'q04.region': ['busan'] })[0]
    expect(taste.picks.some((v) => v.category === 'studio')).toBe(true)
    expect(taste.reasons.some((r) => r.includes('다른 지역'))).toBe(true)
  })

  it('최소금액이 최대 한도를 넘으면 초과로 표시하고, 아니면 예산 안이라고 단정하지 않는다', () => {
    expect(buildPlans({ ...answers, 'q01.max': ['1000'] })[0].reasons.some((r) => r.includes('초과'))).toBe(true)
    expect(buildPlans(answers)[0].reasons.some((r) => r.includes('예산 안'))).toBe(false)
  })

  it('이미 정한 예식장(교회 등)이면 예식장을 추천하지 않는다', () => {
    const plans = buildPlans({ ...answers, 'q05.mood': ['own'] })
    expect(plans.every((p) => p.picks.every((v) => v.category !== 'hall'))).toBe(true)
    expect(plans[0].conditions).toBe(2)
  })

  it('추천은 조건 일치가 가장 많은 안', () => {
    expect(recommendedKey(buildPlans(answers))).toBe('taste')
  })
})
