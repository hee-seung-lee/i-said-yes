import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BRAND } from '../brand'
import { HUB, pathFor } from '../pieces'
import { useStore } from '../store'
import { HubIcon } from './HubIcons'
import { RingsMark, Sprig } from './Ornaments'

interface Props {
  piece?: string // 단계_타입_기능
  wide?: boolean
  hub?: boolean // 04 이후 화면: 아래쪽 탭을 단다
  children: ReactNode
}

export function Layout({ piece, wide, hub, children }: Props) {
  const flow = useStore((s) => s.flow)
  return (
    <div className={`app ${wide ? 'wide' : ''} ${hub ? 'has-hub' : ''}`}>
      <Sprig className="corner bl" />
      <header className="top">
        <RingsMark size={26} />
        <span className="title-stack">
          <span className="name">{BRAND.name}</span>
          <span className="en">
            {BRAND.en}
            {piece && <span className="piece"> · {piece}</span>}
          </span>
        </span>
        <span className="spacer" />
        <Link to="/">조각 목록</Link>
      </header>
      <div className="notice">
        {hub
          ? '추천과 일정은 넣은 정보로 계산한 결과예요. 실제 업체 검색·Notion 동기화·AI 연결은 없고, 계약·결제·연락은 직접 하세요.'
          : '업체·가격·위치는 예시예요. 추천은 입력한 조건으로 계산한 결과이며 실제 업체 검색이나 AI 연결은 없어요.'}
      </div>
      <main className="page">{children}</main>
      {hub && (
        <nav className="hub" aria-label="결혼 준비 메뉴">
          {HUB.map((h) => (
            <NavLink key={h.stage} to={`/${pathFor(h.stage, flow[h.stage])}`} className={({ isActive }) => (isActive ? 'on' : '')}>
              <HubIcon name={h.icon} />
              {h.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
