import { useState } from 'react'
import { Layout } from '../components/Layout'
import { NeedAnswers, useAnswersReady } from '../components/flow'
import { AnchorInputs, Dday, Readiness, TaskRow, TodayCard, useTodos } from '../components/Timeline'
import { PHASES, type PhaseId } from '../data/tasks'

export default function CardTimeline04() {
  const ready = useAnswersReady()
  const { plan, items, picks, ready: rd, today, anchors } = useTodos()
  const [phase, setPhase] = useState<PhaseId>(() => picks[0]?.item.phase ?? 'p1')

  if (!ready)
    return (
      <Layout piece="04_card_timeline">
        <NeedAnswers />
      </Layout>
    )

  const inPhase = items.filter((i) => i.phase === phase).sort((a, b) => b.task.startDaysBefore - a.task.startDaysBefore)
  const leftIn = (id: PhaseId) => items.filter((i) => i.phase === id && i.status !== '완료' && !i.optional).length

  return (
    <Layout piece="04_card_timeline">
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
        <Dday anchors={anchors} today={today} />
        <AnchorInputs only={['weddingDate']} />
        <details className="more-anchors">
          <summary>다른 기준일 넣기 (상견례·촬영·입주·출국)</summary>
          <AnchorInputs only={['familyMeetingDate', 'shootDate', 'moveInDate', 'departureDate']} />
        </details>
        <Readiness {...rd} />
        {plan && <div className="muted">{plan.letter}안({plan.title}) 업체를 할 일에 붙였어요</div>}
      </section>

      <div className="section-title">
        <span className="num">Today</span>
        <h3>오늘 할 일</h3>
      </div>
      {picks.length === 0 ? (
        <div className="card sub">남은 필수 준비가 없어요. 식장까지 업고 뛸 일만 남았어요!</div>
      ) : (
        picks.map((p, i) => <TodayCard key={p.item.task.id} pick={p} index={i} />)
      )}

      <div className="section-title">
        <span className="num">Timeline</span>
        <h3>단계별 할 일</h3>
      </div>
      <div className="tabs">
        {PHASES.map((p) => (
          <span key={p.id} className={p.id === phase ? 'chip on' : 'chip'} onClick={() => setPhase(p.id)}>
            {p.label}
            {leftIn(p.id) > 0 && <span className="count">{leftIn(p.id)}</span>}
          </span>
        ))}
      </div>
      <div className="card task-list">
        {inPhase.map((i) => (
          <TaskRow key={i.task.id} item={i} />
        ))}
      </div>
      <div className="muted" style={{ textAlign: 'center' }}>
        동그라미를 누르면 시작 전 → 진행 중 → 완료 순으로 바뀌어요
      </div>
    </Layout>
  )
}
