// 04 일정 조각(대화형·카드형)이 같이 쓰는 부품.
import { useMemo } from 'react'
import type { TaskStatus } from '../data/tasks'
import { celebrateFrom } from '../effects/petals'
import { buildPlans, recommendedKey } from '../logic/recommend'
import { type Anchors, daysBetween, formatKDate, todaySeoul } from '../logic/schedule'
import { type Pick, type TodoItem, buildTodos, rangeText, readiness, todayPicks } from '../logic/todo'
import { useStore } from '../store'

export function useTodos() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const anchors = useStore((s) => s.anchors)
  const taskStatus = useStore((s) => s.taskStatus)
  const today = todaySeoul()
  return useMemo(() => {
    const plans = buildPlans(answers)
    const plan = plans.find((p) => p.key === (selectedPlan ?? recommendedKey(plans)))
    const items = buildTodos(answers, plan, anchors, taskStatus, today)
    return { plan, items, picks: todayPicks(items, anchors, today), ready: readiness(items), today, anchors }
  }, [answers, selectedPlan, anchors, taskStatus, today])
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { '시작 전': '진행 중', '진행 중': '완료', 완료: '시작 전' }

// 상태 동그라미. 누를 때마다 시작 전 → 진행 중 → 완료. 완료되면 작게 팡.
export function StatusDot({ item }: { item: TodoItem }) {
  const setTaskStatus = useStore((s) => s.setTaskStatus)
  const s = item.status
  return (
    <button
      className={`status-dot ${s === '완료' ? 'done' : s === '진행 중' ? 'doing' : ''}`}
      aria-label={`${item.title} 상태: ${s}. 눌러서 ${NEXT_STATUS[s]}`}
      title={`${s} → ${NEXT_STATUS[s]}`}
      onClick={(e) => {
        const next = NEXT_STATUS[s]
        setTaskStatus(item.task.id, next)
        if (next === '완료') celebrateFrom(e.currentTarget, 0.3)
      }}
    >
      {s === '완료' ? '✓' : s === '진행 중' ? '…' : ''}
    </button>
  )
}

export function TaskRow({ item }: { item: TodoItem }) {
  return (
    <div className={`task-row ${item.status === '완료' ? 'is-done' : ''} ${item.optional ? 'is-optional' : ''}`}>
      <StatusDot item={item} />
      <div className="grow">
        <div className="task-title">{item.title}</div>
        {item.note && <div className="task-note">{item.note}</div>}
        <div className="task-meta">
          <span>{rangeText(item.r)}</span>
          {item.r.anchorLabel !== '본식' && <span className="tag">{item.r.anchorLabel} 기준</span>}
          {item.overdue && <span className="tag warn">기한 지남</span>}
          {item.optional && <span className="tag">선택</span>}
          {!item.task.forWedding && <span className="tag">본식과 별개</span>}
        </div>
      </div>
    </div>
  )
}

export function TodayCard({ pick, index }: { pick: Pick; index: number }) {
  const { item, reason } = pick
  return (
    <div className="card today-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="today-no">{index + 1}</span>
        <div className="grow">
          <div className="task-title">{item.title}</div>
          <div className="task-note">{reason}</div>
          {item.note && <div className="muted">{item.note}</div>}
          <div className="next-action">다음 행동 · {item.next}</div>
        </div>
        <StatusDot item={item} />
      </div>
    </div>
  )
}

export function Readiness({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="readiness">
      <div className="row">
        <span className="grow sub">본식 필수 준비</span>
        <span className="sub">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Dday({ anchors, today }: { anchors: Anchors; today: string }) {
  if (!anchors.weddingDate) return <div className="dday-empty">본식일을 정하면 할 일마다 날짜가 붙어요</div>
  const d = daysBetween(today, anchors.weddingDate)
  return (
    <div className="dday">
      <span className="dday-num">{d > 0 ? `D-${d}` : d === 0 ? 'D-day' : `D+${-d}`}</span>
      <span className="sub">{formatKDate(anchors.weddingDate)} 본식</span>
    </div>
  )
}

const ANCHOR_FIELDS: { key: keyof Anchors; label: string; hint: string }[] = [
  { key: 'weddingDate', label: '본식일', hint: '모든 일정의 기준' },
  { key: 'familyMeetingDate', label: '상견례일', hint: '양가 선물 일정' },
  { key: 'shootDate', label: '촬영일', hint: '촬영 소품 일정' },
  { key: 'moveInDate', label: '입주일', hint: '혼수 구매 일정' },
  { key: 'departureDate', label: '신혼여행 출국일', hint: '항공·숙소 일정' },
]

export function AnchorInputs({ only }: { only?: (keyof Anchors)[] }) {
  const anchors = useStore((s) => s.anchors)
  const setAnchor = useStore((s) => s.setAnchor)
  return (
    <div className="anchor-grid">
      {ANCHOR_FIELDS.filter((f) => !only || only.includes(f.key)).map((f) => (
        <label key={f.key} className="field">
          <span className="field-label">
            {f.label} <span className="muted">· {f.hint}</span>
          </span>
          <input id={`anchor-${f.key}`} type="date" value={anchors[f.key] ?? ''} onChange={(e) => setAnchor(f.key, e.target.value || null)} />
        </label>
      ))}
    </div>
  )
}
