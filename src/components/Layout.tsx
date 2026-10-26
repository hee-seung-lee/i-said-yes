import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../brand'

interface Props {
  piece?: string // 단계_타입_기능
  wide?: boolean
  children: ReactNode
}

export function Layout({ piece, wide, children }: Props) {
  return (
    <div className={wide ? 'app wide' : 'app'}>
      <header className="top">
        <span className="name">{BRAND.name}</span>
        {piece && <span className="piece">{piece}</span>}
        <span className="spacer" />
        <Link to="/">조각 목록</Link>
      </header>
      <div className="notice">업체·가격·위치는 예시 데이터예요. 추천은 입력한 조건에 따른 규칙 계산이며 실제 업체 검색이나 AI 연결은 없어요.</div>
      <main className="page">{children}</main>
    </div>
  )
}
