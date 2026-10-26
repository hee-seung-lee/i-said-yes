import { useState } from 'react'
import { Layout } from '../components/Layout'
import {
  AnchorInputs,
  CalendarView,
  ConflictPanel,
  Dday,
  LateStartPanel,
  MilestonePanel,
  Readiness,
  TaskRow,
  TodayCard,
  useTodos,
} from '../components/Timeline'
import { PHASES, type PhaseId } from '../data/tasks'

// PRD 화면: 오늘 할 일 + 전체 타임라인(본식일 미정이면 상대 일정, 있으면 달력과 전환)
export default function CardTimeline04() {
  const { plan, items, picks, ready: rd, today, anchors } = useTodos()
  const [phase, setPhase] = useState<PhaseId>(() => picks[0]?.item.phase ?? 'p1')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showExcluded, setShowExcluded] = useState(false)

  const visible = items.filter((i) => showExcluded || !i.task.excluded)
  const inPhase = visible.filter((i) => i.phase === phase).sort((a, b) => b.r.startDays - a.r.startDays)
  const leftIn = (id: PhaseId) => items.filter((i) => i.phase === id && i.task.status !== '완료' && !i.task.excluded).length
  const excludedCount = items.filter((i) => i.task.excluded).length

  return (
    <Layout piece="04_card_timeline" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
        <Dday anchors={anchors} today={today} />
        <AnchorInputs only={['wedding']} />
        <details className="more-anchors">
          <summary>다른 기준일 넣기 (상견례·촬영·입주·출국)</summary>
          <AnchorInputs only={['familyMeeting', 'shoot', 'moveIn', 'departure']} />
        </details>
        <Readiness {...rd} />
        {plan && <div className="muted">{plan.letter}안({plan.title}) 업체를 해당 일에 붙였어요</div>}
      </section>

      <LateStartPanel />
      <ConflictPanel />

      <div className="section-title">
        <span className="num">Today</span>
        <h3>오늘 할 일</h3>
      </div>
      {picks.length === 0 ? (
        <div className="card sub">남은 일이 없어요. 식장까지 업고 뛸 일만 남았어요!</div>
      ) : (
        picks.map((p, i) => <TodayCard key={p.item.task.id} pick={p} index={i} />)
      )}

      <div className="section-title">
        <span className="num">Timeline</span>
        <h3 className="grow">전체 타임라인</h3>
        {anchors.wedding && (
          <span className="tabs">
            <span className={view === 'list' ? 'chip on' : 'chip'} onClick={() => setView('list')}>
              단계별
            </span>
            <span className={view === 'calendar' ? 'chip on' : 'chip'} onClick={() => setView('calendar')}>
              달력
            </span>
          </span>
        )}
      </div>

      {view === 'calendar' && anchors.wedding ? (
        <CalendarView items={visible} today={today} />
      ) : (
        <>
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
            {inPhase.length === 0 && <div className="muted" style={{ padding: 12 }}>이 단계에는 일이 없어요</div>}
          </div>
        </>
      )}
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span className="muted">동그라미: 시작 전 → 진행 중 → 완료 · 제목을 누르면 자세히 고칠 수 있어요</span>
        {excludedCount > 0 && (
          <span className="chip" onClick={() => setShowExcluded((v) => !v)}>
            제외한 일 {excludedCount}개 {showExcluded ? '숨기기' : '보기'}
          </span>
        )}
      </div>

      <MilestonePanel />
    </Layout>
  )
}
