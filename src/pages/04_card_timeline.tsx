import { useState } from 'react'
import { DdayRun } from '../components/DdayRun'
import { Layout } from '../components/Layout'
import {
  AnchorInputs,
  CalendarView,
  ConflictPanel,
  LateStartPanel,
  MilestonePanel,
  NowMark,
  Readiness,
  TaskRow,
  TodayCard,
  useTodos,
} from '../components/Timeline'
import { AddTaskForm, CategoryFilter, GanttView, StatusBoard, byCategory } from '../components/Views'
import { useStore } from '../store'
import { PHASES, type PhaseId } from '../data/tasks'
import { currentPhase } from '../logic/todo'

type View = 'list' | 'board' | 'gantt' | 'calendar'
// 노션 보기(표·상태별·타임라인)와 맞춘 보기 전환. 달력은 본식일이 있을 때만.
const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: '단계별' },
  { id: 'board', label: '상태별' },
  { id: 'gantt', label: '타임라인' },
  { id: 'calendar', label: '달력' },
]

// PRD 화면: 오늘 할 일 + 전체 타임라인(본식일 미정이면 상대 일정, 있으면 날짜·달력)
export default function CardTimeline04() {
  const { plan, items, picks, ready: rd, today, anchors } = useTodos()
  const ceremonyTime = useStore((s) => s.dayof.ceremonyTime)
  const [phase, setPhase] = useState<PhaseId>(() => picks[0]?.item.phase ?? 'p1')
  const [view, setView] = useState<View>('list')
  const [showExcluded, setShowExcluded] = useState(false)
  const [cats, setCats] = useState<string[]>([])

  const filtered = byCategory(items, cats)
  const visible = filtered.filter((i) => showExcluded || !i.task.excluded)
  const inPhase = visible.filter((i) => i.phase === phase).sort((a, b) => b.r.startDays - a.r.startDays)
  const leftIn = (id: PhaseId) => filtered.filter((i) => i.phase === id && i.task.status !== '완료' && !i.task.excluded).length
  const views = VIEWS.filter((v) => v.id !== 'calendar' || anchors.wedding)
  const nowPhase = currentPhase(today, anchors.wedding)
  const excludedCount = items.filter((i) => i.task.excluded).length

  return (
    <Layout piece="04_card_timeline" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
        <DdayRun wedding={anchors.wedding} ceremonyTime={ceremonyTime} today={today} />
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
      </div>
      <div className="tabs view-tabs" role="tablist" aria-label="보기">
        {views.map((v) => (
          <span key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? 'chip on' : 'chip'} onClick={() => setView(v.id)}>
            {v.label}
          </span>
        ))}
      </div>
      <CategoryFilter value={cats} onChange={setCats} items={items} />

      {view === 'board' ? (
        <StatusBoard items={visible} />
      ) : view === 'gantt' ? (
        <GanttView items={visible} anchors={anchors} today={today} />
      ) : view === 'calendar' && anchors.wedding ? (
        <CalendarView items={visible} today={today} />
      ) : (
        <>
          <div className="tabs">
            {PHASES.map((p) => (
              <span key={p.id} className={p.id === phase ? 'chip on' : 'chip'} onClick={() => setPhase(p.id)}>
                {p.id === nowPhase && <NowMark />}
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

      <AddTaskForm defaultCategory={cats.length === 1 ? cats[0] : undefined} />
      <MilestonePanel />
    </Layout>
  )
}
