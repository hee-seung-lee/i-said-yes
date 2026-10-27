import { describe, expect, it } from 'vitest'
import { EMPTY_INVITE, defaultMessage, inviteKindOf, kakaoText, mailHref, messageOf, smsHref, withLink } from './invite'

describe('청모·청첩장 보내기', () => {
  it('제목으로 보낼 종류를 고른다', () => {
    expect(inviteKindOf('청모 진행')).toBe('meet')
    expect(inviteKindOf('청모 인원 짜보기')).toBe('meet')
    expect(inviteKindOf('모바일 청첩장 제작')).toBe('card')
    expect(inviteKindOf('회의 및 제작')).toBeNull()
  })

  it('기본 문구에 본식 날짜와 시각을 넣고, 날짜가 없으면 그 줄을 뺀다', () => {
    expect(defaultMessage('card', '2027-05-15', '14:00')).toContain('2027.5.15 (토) 14:00')
    expect(defaultMessage('card', null, null).split('\n')).toHaveLength(2)
    expect(defaultMessage('meet', null, null)).not.toContain('식은')
  })

  it('고친 문구가 있으면 그것을, 없으면 기본 문구를 쓴다', () => {
    expect(messageOf('meet', { ...EMPTY_INVITE, meet: '밥 먹자' }, null, null)).toBe('밥 먹자')
    expect(messageOf('card', { ...EMPTY_INVITE, meet: '밥 먹자' }, null, null)).toBe(defaultMessage('card', null, null))
  })

  it('청첩장 주소는 있을 때만 끝에 붙인다', () => {
    expect(withLink('안녕', '  ')).toBe('안녕')
    expect(withLink('안녕', 'https://a.example/x')).toBe('안녕\n\nhttps://a.example/x')
  })

  it('문자·메일 주소는 본문을 인코딩한다', () => {
    expect(smsHref('a b\n&')).toBe('sms:?&body=a%20b%0A%26')
    expect(mailHref('제목', '본문')).toBe(`mailto:?subject=${encodeURIComponent('제목')}&body=${encodeURIComponent('본문')}`)
  })

  it('카카오톡 문구는 200자에서 자른다', () => {
    expect(kakaoText('가'.repeat(200))).toHaveLength(200)
    const cut = kakaoText('가'.repeat(250))
    expect(cut).toHaveLength(200)
    expect(cut.endsWith('…')).toBe(true)
  })
})
