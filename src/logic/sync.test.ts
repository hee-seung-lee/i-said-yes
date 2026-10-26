import { describe, expect, it } from 'vitest'
import { photoReceiptPatch } from './sync'

describe('수령 희망일 → 보정본 수령 일정', () => {
  it('본식 N일 전을 고르면 채택하고 마감 N일 전·시작 N+30일 전', () => {
    expect(photoReceiptPatch({ 'q11.due': ['60'] })).toMatchObject({ adopted: true, dueDaysBefore: 60, startDaysBefore: 90, fixedDue: null })
  })

  it('날짜를 넣으면 날짜가 우선, 시작은 30일 전', () => {
    expect(photoReceiptPatch({ 'q11.due': ['60'], 'q11.dueDate': ['2027-03-01'] })).toEqual({ adopted: true, fixedDue: '2027-03-01', fixedStart: '2027-01-30' })
  })

  it('답이 없거나 예전 글자 답이면 바꾸지 않는다', () => {
    expect(photoReceiptPatch({})).toBeNull()
    expect(photoReceiptPatch({ 'q11.due': ['본식 2개월 전'] })).toBeNull()
  })
})
