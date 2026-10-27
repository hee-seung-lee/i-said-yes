// 청모(청첩장 모임) 약속 문자와 청첩장 문구, 그리고 휴대폰의 문자·메일·공유창·카카오톡으로 넘기는 주소.
// 보내기 자체는 사용자의 휴대폰 앱이 한다. 이 앱은 서버가 없어 대신 보내지 않는다.
import { formatKDate } from './schedule'

export type InviteKind = 'meet' | 'card' // meet = 청모 약속 잡기, card = 청첩장 보내기

export interface InviteDraft {
  link: string // 모바일 청첩장 주소
  meet: string | null // null 이면 기본 문구
  card: string | null
}

export const EMPTY_INVITE: InviteDraft = { link: '', meet: null, card: null }

// 제목에 청모·청첩장이 들어간 일에만 보내기를 단다(청첩장 '제작 회의'처럼 보낼 게 없는 일은 빼려고 분류가 아닌 제목으로 본다)
export function inviteKindOf(title: string): InviteKind | null {
  if (title.includes('청모')) return 'meet'
  if (title.includes('청첩장')) return 'card'
  return null
}

export function whenText(wedding: string | null, time: string | null): string {
  if (!wedding) return ''
  return `${formatKDate(wedding)}${time ? ` ${time}` : ''}`
}

export function defaultMessage(kind: InviteKind, wedding: string | null, time: string | null): string {
  const when = whenText(wedding, time)
  if (kind === 'meet')
    return [
      '잘 지내시죠? 저희 결혼 소식 전하려고 연락드려요.',
      when && `식은 ${when}이에요.`,
      '청첩장 직접 드리고 싶어서요. 편하신 날 알려 주시면 밥 한 끼 대접할게요!',
    ]
      .filter(Boolean)
      .join('\n')
  return ['저희 결혼합니다.', when, '귀한 걸음 하시어 축복해 주시면 감사하겠습니다.'].filter(Boolean).join('\n')
}

export function messageOf(kind: InviteKind, draft: InviteDraft, wedding: string | null, time: string | null): string {
  return draft[kind] ?? defaultMessage(kind, wedding, time)
}

// 본문 끝에 청첩장 주소를 붙인다(문자·메일·복사용)
export function withLink(text: string, link: string): string {
  const l = link.trim()
  return l ? `${text}\n\n${l}` : text
}

// 받는 사람은 휴대폰에서 고른다. iOS 와 Android 가 둘 다 읽는 '?&body=' 형태로 쓴다
export function smsHref(body: string): string {
  return `sms:?&body=${encodeURIComponent(body)}`
}

export function mailHref(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function mailSubject(kind: InviteKind): string {
  return kind === 'meet' ? '결혼 소식 전해요' : '저희 결혼합니다'
}

// 카카오톡 텍스트 메시지는 200자까지라 넘으면 줄인다
export const KAKAO_TEXT_MAX = 200
export function kakaoText(text: string): string {
  return text.length <= KAKAO_TEXT_MAX ? text : `${text.slice(0, KAKAO_TEXT_MAX - 1)}…`
}
