import { useState } from 'react'
import { Layout } from '../components/Layout'
import { AnchorInputs, CalendarView, LateStartPanel, NowMark, Readiness, TaskRow, TodayCard, useTodos } from '../components/Timeline'
import { PHASES } from '../data/tasks'
import { daysBetween, formatKDate } from '../logic/schedule'
import { currentPhase, phaseLabel } from '../logic/todo'

export default function ChatTimeline04() {
  const { plan, items, picks, ready: rd, today, anchors } = useTodos()
  const [dateAnswered, setDateAnswered] = useState(() => anchors.wedding !== null)
  const [more, setMore] = useState<'none' | 'calendar' | 'list'>('none')
  const toggle = (v: 'calendar' | 'list') => setMore((m) => (m === v ? 'none' : v))

  const currentIdx = PHASES.findIndex((p) => p.id === (picks[0]?.item.phase ?? 'p1'))
  const nextPhase = PHASES[currentIdx + 1]
  const upcoming = nextPhase ? items.filter((i) => i.phase === nextPhase.id && i.task.status !== '완료' && !i.task.excluded).slice(0, 4) : []
  const nowPhase = currentPhase(today, anchors.wedding)
  const d = anchors.wedding ? daysBetween(today, anchors.wedding) : null

  return (
    <Layout piece="04_chat_timeline" hub>
      <div className="chat">
        <p className="bot-tag">준비 도우미</p>
        <div className="bubble">
          {plan ? `${plan.letter}안(${plan.title})으로 할 일을 정리할게요. ` : ''}본식 날짜가 정해졌나요? 정하면 할 일마다 날짜를 붙여 드려요.
        </div>
        {!dateAnswered ? (
          <div className="qform">
            <AnchorInputs only={['wedding']} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => setDateAnswered(true)}>아직 미정이에요</button>
              <button className="primary" disabled={!anchors.wedding} onClick={() => setDateAnswered(true)}>
                이 날짜로 할게요
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bubble me" onClick={() => setDateAnswered(false)} style={{ cursor: 'pointer' }} title="눌러서 고치기">
              {anchors.wedding ? `${formatKDate(anchors.wedding)}에 해요` : '아직 미정이에요'}
            </div>
            <div className="bubble">
              {d !== null
                ? `본식까지 ${d}일 남았어요. 지금 시기에 맞춰 오늘 할 일 3가지를 골랐어요.`
                : '날짜가 없으니 진행 중인 일과 먼저 해야 하는 단계부터 3가지를 골랐어요.'}
            </div>
            <LateStartPanel />
            <Readiness {...rd} />
            {picks.map((p, i) => (
              <TodayCard key={p.item.task.id} pick={p} index={i} />
            ))}
            <div className="bubble">동그라미를 누르면 진행 중, 한 번 더 누르면 완료예요. 완료하면 다음 할 일이 올라와요.</div>
            {upcoming.length > 0 && (
              <div className="bubble">
                그다음 <b style={{ fontFamily: 'var(--serif)' }}>{phaseLabel(nextPhase!.id)}</b>에는 이런 일이 기다려요.
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {upcoming.map((i) => (
                    <li key={i.task.id}>{i.task.title}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className={more === 'calendar' ? 'on' : ''} onClick={() => toggle('calendar')}>
                {more === 'calendar' ? '달력 접기' : '달력으로 보기'}
              </button>
              <button className={more === 'list' ? 'on' : ''} onClick={() => toggle('list')}>
                {more === 'list' ? '전체 일정 접기' : '전체 일정 펼치기'}
              </button>
            </div>
            {more === 'calendar' &&
              (anchors.wedding ? (
                <>
                  <div className="bubble">달력 숫자는 그날 마감인 일 수예요. 날짜를 누르면 그날 할 일이 나와요.</div>
                  <CalendarView items={items} today={today} />
                </>
              ) : (
                <div className="bubble">본식 날짜를 정하면 할 일 마감을 달력에 찍어 드려요. 위의 날짜 답을 눌러 정해 주세요.</div>
              ))}
            {more === 'list' &&
              PHASES.map((p) => (
                <div key={p.id} className="card task-list">
                  <div className="section-title" style={{ margin: '10px 0 0' }}>
                    <h3 style={{ fontSize: 15 }}>
                      {p.id === nowPhase && <NowMark />}
                      {p.label}
                    </h3>
                  </div>
                  {items
                    .filter((i) => i.phase === p.id && !i.task.excluded)
                    .map((i) => (
                      <TaskRow key={i.task.id} item={i} />
                    ))}
                </div>
              ))}
          </>
        )}
      </div>
    </Layout>
  )
}
