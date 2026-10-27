// 본식까지 남은 시간 카운터(개월·일·시간·분·초)와, 한 사람이 상대에게 달려가는 트랙.
// 트랙은 본식 1년 전을 출발점으로 잡아 남은 날만큼 다가가고, 당일에는 둘이 만난다.
import { useEffect, useRef, useState } from 'react'
import { celebrateFrom } from '../effects/petals'
import { daysBetween, formatKDate } from '../logic/schedule'

const TRACK_DAYS = 365
const RUNNER_KEY = 'i-said-yes:runner'

type Who = 'groom' | 'bride'

function targetMs(wedding: string, time: string | null): number {
  return Date.parse(`${wedding}T${time ?? '00:00'}:00+09:00`)
}

// 서울 시각 기준으로 달(달력 개월) → 일 → 시간 → 분 → 초 순으로 나눈다
function parts(now: number, target: number): [number, string][] {
  if (target <= now) return [[0, '개월'], [0, '일'], [0, '시간'], [0, '분'], [0, '초']]
  const KST = 9 * 3600 * 1000
  const from = new Date(now + KST)
  const addMonths = (n: number) => {
    const d = new Date(from)
    d.setUTCMonth(d.getUTCMonth() + n)
    // 1월 31일 + 1개월처럼 달 끝을 넘기면 그 달 마지막 날로 맞춘다
    if (d.getUTCDate() !== from.getUTCDate()) d.setUTCDate(0)
    return d.getTime() - KST
  }
  let months = 0
  while (addMonths(months + 1) <= target) months++
  let s = Math.floor((target - addMonths(months)) / 1000)
  const days = Math.floor(s / 86400)
  s -= days * 86400
  const hours = Math.floor(s / 3600)
  s -= hours * 3600
  const mins = Math.floor(s / 60)
  return [
    [months, '개월'],
    [days, '일'],
    [hours, '시간'],
    [mins, '분'],
    [s - mins * 60, '초'],
  ]
}

function readRunner(): Who {
  try {
    return localStorage.getItem(RUNNER_KEY) === 'bride' ? 'bride' : 'groom'
  } catch {
    return 'groom'
  }
}

// 초 단위 표시라 0.25초마다 갱신하면 넘어가는 순간을 놓치지 않는다
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [on])
  return now
}

function Groom() {
  return (
    <g>
      <circle cx="16" cy="7" r="4.6" className="skin" />
      <path d="M11.6 6.2c.6-3 2.4-4.2 4.6-4.2s4 1.4 4.4 4c-1.6-1-3.6-1.4-5.4-.9-1.4.4-2.6.8-3.6 1.1z" className="hair" />
      <path d="M10.4 14.2c0-2 1.6-3 5.6-3s5.6 1 5.6 3v8.6H10.4z" className="suit" />
      <path d="M14.2 11.4l1.8 3.4 1.8-3.4" className="shirt" />
      <path d="M14.8 12.4l1.2.9 1.2-.9-1.2-.5z" className="tie" />
      <g className="arm arm-a"><path d="M11.4 13.6l-3.4 5.4" className="limb suit-line" /></g>
      <g className="arm arm-b"><path d="M20.6 13.6l3.4 5.4" className="limb suit-line" /></g>
      <g className="leg leg-a"><path d="M13.6 22.4l-1 8.6" className="limb suit-line" /></g>
      <g className="leg leg-b"><path d="M18.4 22.4l1 8.6" className="limb suit-line" /></g>
    </g>
  )
}

function Bride() {
  return (
    <g>
      <path d="M11.2 5.4c1.6-4.8 8-4.8 9.6 0l2.4 14.6-3-1.4z" className="veil" />
      <circle cx="16" cy="7" r="4.6" className="skin" />
      <path d="M11.4 6.4c.4-3 2.4-4.4 4.6-4.4s4.2 1.4 4.6 4.4c-1.2-1.4-3-2.2-4.6-2.2s-3.4.8-4.6 2.2z" className="hair" />
      <circle cx="20.4" cy="4.2" r="1.2" className="flower" />
      <g className="arm arm-a"><path d="M12.6 13.4l-3.6 5" className="limb skin-line" /></g>
      <g className="arm arm-b"><path d="M19.4 13.4l3.6 5" className="limb skin-line" /></g>
      <g className="leg leg-a"><path d="M14.4 24l-.6 7" className="limb skin-line" /></g>
      <g className="leg leg-b"><path d="M17.6 24l.6 7" className="limb skin-line" /></g>
      <path d="M13 11.8h6l1.2 4.4 4.4 10.4c-5.4 1.6-11.8 1.6-17.2 0l4.4-10.4z" className="dress" />
    </g>
  )
}

function Person({ who }: { who: Who }) {
  return (
    <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
      {who === 'groom' ? <Groom /> : <Bride />}
    </svg>
  )
}

interface Props {
  wedding: string | null
  ceremonyTime: string | null
  today: string
}

export function DdayRun({ wedding, ceremonyTime, today }: Props) {
  const [runner, setRunner] = useState<Who>(readRunner)
  const [entered, setEntered] = useState(false)
  const met = useRef(false)
  const pairRef = useRef<HTMLDivElement>(null)
  const target = wedding ? targetMs(wedding, ceremonyTime) : null
  const now = useNow(target !== null)
  const days = wedding ? daysBetween(today, wedding) : null
  const together = days !== null && days <= 0
  const progress = days === null ? 0 : together ? 1 : Math.min(1, Math.max(0, 1 - days / TRACK_DAYS))
  const waiter: Who = runner === 'groom' ? 'bride' : 'groom'

  // 처음 그릴 때 출발점에서 지금 위치까지 달려 들어온다
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // 만나는 날에는 한 번 팡 터뜨린다
  useEffect(() => {
    if (!together || met.current) return
    met.current = true
    const id = window.setTimeout(() => celebrateFrom(pairRef.current, 1.2), 1300)
    return () => window.clearTimeout(id)
  }, [together])

  function swap() {
    const next: Who = runner === 'groom' ? 'bride' : 'groom'
    setRunner(next)
    try {
      localStorage.setItem(RUNNER_KEY, next)
    } catch {
      // 저장이 막힌 브라우저는 이번 화면에서만 바꾼다
    }
  }

  const label = days === null ? '' : days > 0 ? `D-${days}` : days === 0 ? 'D-day' : `D+${-days}`
  const pos = (entered ? progress : 0) * 100
  const running = entered && !together && progress > 0

  return (
    <div className={`ddrun ${together ? 'met' : ''}`}>
      <div className="ddrun-head">
        <span className="ddrun-title">우리 결혼식까지</span>
        <span className="ddrun-date">{wedding ? `${formatKDate(wedding)}${ceremonyTime ? ` ${ceremonyTime}` : ''} / ${label}` : '본식일 미정'}</span>
      </div>
      <div className={`ddrun-clock ${wedding ? '' : 'off'}`} aria-label={wedding ? `${label}` : '본식일 미정'}>
        {(target !== null ? parts(now, target) : parts(0, 0))
          .filter(([n, u]) => u !== '개월' || n > 0)
          .map(([n, u]) => (
            <span key={u} className="ddrun-cell">
              <b>{n}</b>
              <small>{u}</small>
            </span>
          ))}
      </div>

      <div className="ddrun-track">
        <div className="ddrun-road" />
        <div className="ddrun-trail" style={{ width: `calc((100% - 88px) * ${pos / 100} + 22px)` }} />
        <div className={`ddrun-runner ${running ? 'running' : ''} ${runner}`} style={{ left: `calc((100% - 88px) * ${pos / 100})` }}>
          <Person who={runner} />
        </div>
        <div className={`ddrun-waiter ${waiter}`} ref={pairRef}>
          <span className="ddrun-heart">♥</span>
          <Person who={waiter} />
        </div>
      </div>
      <div className="ddrun-foot">
        <span>1년 전</span>
        <span className="grow">
          {days === null
            ? '본식일을 정하면 달리기 시작해요'
            : together
              ? days === 0
                ? '드디어 만났어요!'
                : '함께 걷고 있어요'
              : days > TRACK_DAYS
                ? '출발선에서 기다리는 중'
                : `${runner === 'groom' ? '신랑이' : '신부가'} 달려가는 중`}
        </span>
        <button className="ddrun-swap" onClick={swap} type="button">
          {runner === 'groom' ? '신부가 달리기' : '신랑이 달리기'}
        </button>
      </div>
    </div>
  )
}
