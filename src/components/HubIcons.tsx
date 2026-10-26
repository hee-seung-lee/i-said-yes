// 아래쪽 메뉴 선화 아이콘. 모두 24×24, 선 굵기·끝 모양을 같게 그려 색은 CSS(currentColor)로 바꾼다.
// 돈 기호(₩·동전)는 쓰지 않고 결혼 준비 소재로 그렸다.
import type { ReactNode } from 'react'

export type HubIconName = 'todo' | 'quote' | 'decide' | 'budget' | 'place' | 'rings' | 'data'

const PATHS: Record<HubIconName, ReactNode> = {
  // 체크리스트(클립보드)
  todo: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />
      <path d="M9.5 4.5c0-1.4 1.1-2 2.5-2s2.5.6 2.5 2" />
      <path d="M8 11l1.4 1.4L12 9.8M14 11.2h2.5M8 16l1.4 1.4L12 14.8M14 16.2h2.5" />
    </>
  ),
  // 꽃 한 송이 꽂힌 견적서
  quote: (
    <>
      <path d="M6 3h8.5L19 7.5V21H6z" />
      <path d="M14.5 3v4.5H19M9 13h7M9 16.5h5" />
      <circle cx="9.6" cy="8.4" r="1" />
      <path d="M9.6 6.2v1.2M9.6 9.4v1.2M7.4 8.4h1.2M10.6 8.4h1.2" />
    </>
  ),
  // 하트
  decide: <path d="M12 20.2s-7.2-4.5-7.2-9.8A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7.2 2.2c0 5.3-7.2 9.8-7.2 9.8z" />,
  // 하트 실링 봉투(축의금 봉투)
  budget: (
    <>
      <rect x="3.5" y="6" width="17" height="12.5" rx="1.8" />
      <path d="M3.8 6.8L12 12.6l8.2-5.8" />
      <path d="M12 17.4s-2.1-1.3-2.1-2.8a1.05 1.05 0 0 1 2.1-.3 1.05 1.05 0 0 1 2.1.3c0 1.5-2.1 2.8-2.1 2.8z" />
    </>
  ),
  // 꽃 핀
  place: (
    <>
      <path d="M12 21.2s-6.3-5.8-6.3-10.9a6.3 6.3 0 0 1 12.6 0c0 5.1-6.3 10.9-6.3 10.9z" />
      <circle cx="12" cy="10.3" r="1.2" />
      <path d="M12 7.6v1.3M12 11.7v1.3M9.3 10.3h1.3M13.4 10.3h1.3" />
    </>
  ),
  // 반지 한 쌍
  rings: (
    <>
      <circle cx="9.4" cy="14.6" r="5" />
      <circle cx="14.6" cy="14.6" r="5" />
      <path d="M14.6 9.6l-1.5-2.1 1.5-2.1 1.5 2.1z" />
    </>
  ),
  // 리본 묶은 상자
  data: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <rect x="3.5" y="7.5" width="17" height="3.5" rx="1" />
      <path d="M12 7.5v13M12 7.5c-1.4-2.8-4.8-2.9-4.4-.7.3 1.3 4.4.7 4.4.7zM12 7.5c1.4-2.8 4.8-2.9 4.4-.7-.3 1.3-4.4.7-4.4.7z" />
    </>
  ),
}

export function HubIcon({ name }: { name: HubIconName }) {
  return (
    <svg className="hub-svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
