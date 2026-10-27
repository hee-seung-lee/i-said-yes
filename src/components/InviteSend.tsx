// 청모·청첩장 일의 '보내기'. 문구를 고쳐 카카오톡·문자·메일·휴대폰 공유창으로 넘긴다.
// 받는 사람은 각 앱에서 직접 고르고, 보내기도 그 앱에서 한다.
import { useState } from 'react'
import {
  EMPTY_INVITE,
  type InviteKind,
  defaultMessage,
  kakaoText,
  mailHref,
  mailSubject,
  messageOf,
  smsHref,
  withLink,
} from '../logic/invite'
import { useStore } from '../store'

// 카카오 개발자 사이트에서 받은 JavaScript 키. 게시 때 저장소 변수(KAKAO_JS_KEY)로 넣는다
const KAKAO_KEY: string = import.meta.env.VITE_KAKAO_JS_KEY ?? ''
const KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js'
const KAKAO_SRI = 'sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w'

interface KakaoSdk {
  isInitialized(): boolean
  init(key: string): void
  Share: { sendDefault(settings: object): void }
}

let kakaoLoading: Promise<KakaoSdk> | null = null
function loadKakao(): Promise<KakaoSdk> {
  kakaoLoading ??= new Promise<KakaoSdk>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = KAKAO_SDK
    s.integrity = KAKAO_SRI
    s.crossOrigin = 'anonymous'
    s.onload = () => {
      const k = (window as unknown as { Kakao?: KakaoSdk }).Kakao
      if (!k) return reject(new Error('no Kakao'))
      if (!k.isInitialized()) k.init(KAKAO_KEY)
      resolve(k)
    }
    s.onerror = () => {
      kakaoLoading = null
      reject(new Error('load failed'))
    }
    document.head.appendChild(s)
  })
  return kakaoLoading
}

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export function InviteSend({ kind }: { kind: InviteKind }) {
  const draft = useStore((s) => s.project.invite) ?? EMPTY_INVITE
  const setProject = useStore((s) => s.setProject)
  const wedding = useStore((s) => s.project.anchors.wedding)
  const time = useStore((s) => s.dayof.ceremonyTime)
  const [msg, setMsg] = useState('')
  const text = messageOf(kind, draft, wedding, time)
  const link = draft.link.trim()
  const full = withLink(text, link)
  // 최신 값에 덧붙인다(연달아 고쳐도 앞 변경을 잃지 않게)
  const save = (patch: Partial<typeof draft>) => setProject({ invite: { ...(useStore.getState().project.invite ?? EMPTY_INVITE), ...patch } })

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      setMsg('문구를 복사했어요. 보내실 곳에 붙여 넣으세요.')
    } catch {
      setMsg('복사가 막혀 있어요. 문구를 길게 눌러 복사해 주세요.')
    }
  }

  async function share() {
    try {
      await navigator.share({ text, ...(link ? { url: link } : {}) })
    } catch (e) {
      // 공유창을 닫은 건 실패가 아니다
      if ((e as Error).name !== 'AbortError') await copy()
    }
  }

  async function kakao() {
    // 카카오 키가 아직 없으면 휴대폰 공유창(카카오톡이 목록에 있다)으로, 그것도 없으면 복사로 대신한다
    if (!KAKAO_KEY) return canShare ? share() : copy()
    try {
      const k = await loadKakao()
      k.Share.sendDefault({
        objectType: 'text',
        text: kakaoText(text),
        link: link ? { mobileWebUrl: link, webUrl: link } : {},
        ...(link ? { buttonTitle: kind === 'meet' ? '청첩장 미리 보기' : '청첩장 보기' } : {}),
      })
    } catch {
      setMsg('카카오톡을 열지 못했어요. 다른 방법으로 보내 주세요.')
    }
  }

  return (
    <div className="invite-send">
      <span className="field-label">{kind === 'meet' ? '청모 약속 잡기' : '청첩장 보내기'}</span>
      <textarea
        id={`invite-${kind}`}
        rows={kind === 'meet' ? 6 : 3}
        value={text}
        onChange={(e) => save({ [kind]: e.target.value })}
        aria-label="보낼 문구"
      />
      <div className="row invite-meta">
        <input
          id="invite-link"
          className="grow"
          value={draft.link}
          placeholder="모바일 청첩장 주소 (있으면)"
          inputMode="url"
          onChange={(e) => save({ link: e.target.value })}
        />
        {draft[kind] !== null && (
          <button type="button" className="ghost" onClick={() => save({ [kind]: null })} title={defaultMessage(kind, wedding, time)}>
            기본 문구로
          </button>
        )}
      </div>
      <div className="invite-buttons">
        <button type="button" className="kakao" onClick={kakao}>
          카카오톡
        </button>
        <a className="button-like" href={smsHref(full)}>
          문자
        </a>
        <a className="button-like" href={mailHref(mailSubject(kind), full)}>
          메일
        </a>
        {canShare ? (
          <button type="button" onClick={share}>
            다른 앱
          </button>
        ) : (
          <button type="button" onClick={copy}>
            복사
          </button>
        )}
      </div>
      <span className="muted">받는 사람은 열리는 앱에서 골라요.</span>
      {msg && (
        <div className="inline-msg" onClick={() => setMsg('')}>
          {msg}
        </div>
      )}
    </div>
  )
}
