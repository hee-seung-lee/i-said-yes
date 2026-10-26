// 노션 보기와 맞춘 부품: 분류 필터, 업무 추가, 상태별 보드, 간트 타임라인
import { useState } from 'react'
import { CATEGORIES, type TaskStatus, newUserTask } from '../data/tasks'
import { type Anchors, daysBetween, ganttSpan, minusDays } from '../logic/schedule'
import type { TodoItem } from '../logic/todo'
import { useStore } from '../store'
import { StatusDot, TaskDetail, Tags } from './Timeline'

// 분류 필터. 아무것도 안 고르면 전체.
export function CategoryFilter({ value, onChange, items }: { value: string[]; onChange: (v: string[]) => void; items: TodoItem[] }) {
  const count = (c: string) => items.filter((i) => i.task.categories.includes(c) && !i.task.excluded).length
  return (
    <div className="filter-row" role="group" aria-label="분류로 거르기">
      <span className={value.length === 0 ? 'chip on' : 'chip'} onClick={() => onChange([])}>
        전체
      </span>
      {CATEGORIES.filter((c) => count(c) > 0).map((c) => (
        <span key={c} className={value.includes(c) ? 'chip on' : 'chip'} onClick={() => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])}>
          {c}
          <span className="count">{count(c)}</span>
        </span>
      ))}
    </div>
  )
}

export function byCategory(items: TodoItem[], cats: string[]): TodoItem[] {
  return cats.length === 0 ? items : items.filter((i) => i.task.categories.some((c) => cats.includes(c)))
}

export function AddTaskForm({ defaultCategory }: { defaultCategory?: string }) {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [cats, setCats] = useState<string[]>(defaultCategory ? [defaultCategory] : [])
  const [start, setStart] = useState('60')
  const [due, setDue] = useState('30')
  const [required, setRequired] = useState(true)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')

  if (!open)
    return (
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button onClick={() => setOpen(true)}>+ 업무 추가</button>
        {done && <span className="sub">{done}</span>}
      </div>
    )
  return (
    <section className="qform" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <b style={{ fontFamily: 'var(--serif)' }}>새 업무</b>
      <label className="field">
        <span className="field-label">업무 이름</span>
        <input id="new-title" value={title} placeholder="축가 연습" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field">
        <span className="field-label">분류</span>
        <div>
          {CATEGORIES.map((c) => (
            <span key={c} className={cats.includes(c) ? 'chip on' : 'chip'} onClick={() => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}>
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">일정 (본식 며칠 전에 시작 ~ 마감)</span>
        <div className="row">
          <input id="new-start" type="number" value={start} onChange={(e) => setStart(e.target.value)} aria-label="시작 D-숫자" style={{ width: 90 }} />
          <span className="sub">~</span>
          <input id="new-due" type="number" value={due} onChange={(e) => setDue(e.target.value)} aria-label="마감 D-숫자" style={{ width: 90 }} />
          <span className="sub">일 전</span>
        </div>
      </div>
      <label className="field check">
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        <span>본식 필수 준비에 넣기</span>
      </label>
      {err && <span className="err">{err}</span>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button onClick={() => setOpen(false)}>취소</button>
        <button
          className="primary"
          onClick={() => {
            const t = newUserTask({ title, categories: cats, startDaysBefore: Number(start), dueDaysBefore: Number(due), requiredForWedding: required }, tasks)
            if (typeof t === 'string') return setErr(t)
            addTask(t)
            setDone(`'${t.title}'을 더했어요`)
            setTitle('')
            setErr('')
            setOpen(false)
          }}
        >
          추가
        </button>
      </div>
    </section>
  )
}

const COLUMNS: TaskStatus[] = ['시작 전', '진행 중', '완료']

// 노션 '상태별' 보기: 상태로 묶은 칸반. 카드의 ← → 로 옮긴다(휴대폰에서도 끌기 없이).
export function StatusBoard({ items }: { items: TodoItem[] }) {
  const setStatus = useStore((s) => s.setStatus)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="board">
      {COLUMNS.map((col, ci) => {
        const list = items.filter((i) => i.task.status === col && !i.task.excluded).sort((a, b) => b.r.dueDays - a.r.dueDays)
        return (
          <section key={col} className="board-col">
            <div className="row">
              <b className="grow" style={{ fontFamily: 'var(--serif)' }}>
                {col}
              </b>
              <span className="count">{list.length}</span>
            </div>
            {list.map((i) => (
              <div key={i.task.id} className="board-card">
                <button className="task-title link-like" onClick={() => setOpen(open === i.task.id ? null : i.task.id)}>
                  {i.task.title}
                </button>
                <div className="task-meta">
                  <Tags item={i} />
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <button className="ghost" disabled={ci === 0} aria-label={`${COLUMNS[ci - 1] ?? ''}로 옮기기`} onClick={() => setStatus(i.task.id, COLUMNS[ci - 1])}>
                    ←
                  </button>
                  <StatusDot item={i} />
                  <button
                    className="ghost"
                    disabled={ci === COLUMNS.length - 1 || (COLUMNS[ci + 1] === '완료' && i.blockedBy.length > 0)}
                    aria-label={`${COLUMNS[ci + 1] ?? ''}로 옮기기`}
                    title={COLUMNS[ci + 1] === '완료' && i.blockedBy.length ? `먼저 '${i.blockedBy[0].title}'을 끝내야 해요` : undefined}
                    onClick={() => setStatus(i.task.id, COLUMNS[ci + 1])}
                  >
                    →
                  </button>
                </div>
                {open === i.task.id && <TaskDetail item={i} />}
              </div>
            ))}
            {list.length === 0 && <div className="muted">없음</div>}
          </section>
        )
      })}
    </div>
  )
}

const PX = 2 // 하루 = 2px

// 노션 '타임라인' 보기: 시작~마감 막대. 분류별로 묶고, 본식일이 있으면 날짜 눈금과 오늘 선을 그린다.
export function GanttView({ items, anchors, today }: { items: TodoItem[]; anchors: Anchors; today: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const rows = items.filter((i) => !i.task.excluded).map((i) => ({ i, ...ganttSpan(i.task, i.r, anchors) }))
  if (rows.length === 0) return <div className="card muted">보여 줄 업무가 없어요</div>
  const max = Math.ceil(Math.max(...rows.map((r) => r.start)) / 30) * 30
  const min = Math.min(0, Math.floor(Math.min(...rows.map((r) => r.end)) / 30) * 30)
  const width = (max - min) * PX + 20
  const x = (daysBefore: number) => (max - daysBefore) * PX
  const ticks: number[] = []
  for (let d = max; d >= min; d -= 30) ticks.push(d)
  const todayBefore = anchors.wedding ? daysBetween(today, anchors.wedding) : null
  const label = (d: number) => {
    if (!anchors.wedding) return d === 0 ? 'D-day' : `D-${d}`
    const [y, m] = minusDays(anchors.wedding, d).split('-').map(Number)
    return `${String(y).slice(2)}.${m}`
  }
  const groups = CATEGORIES.map((c) => ({ c, list: rows.filter((r) => r.i.task.categories[0] === c).sort((a, b) => b.start - a.start || b.end - a.end) })).filter((g) => g.list.length)

  return (
    <div className="card gantt-wrap">
      <div className="gantt-scroll">
        <div className="gantt" style={{ width: width + 120 }}>
          <div className="gantt-axis" style={{ marginLeft: 120, width }}>
            {ticks.map((d) => (
              <span key={d} className="gantt-tick" style={{ left: x(d) }}>
                {label(d)}
              </span>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.c}>
              <div className="gantt-group">{g.c}</div>
              {g.list.map(({ i, start, end }) => (
                <div key={i.task.id}>
                  <div className="gantt-row">
                    <button className="gantt-name link-like" title={i.task.title} onClick={() => setOpen(open === i.task.id ? null : i.task.id)}>
                      {i.task.title}
                    </button>
                    <div className="gantt-lane" style={{ width }}>
                      {ticks.map((d) => (
                        <span key={d} className="gantt-grid" style={{ left: x(d) }} />
                      ))}
                      {todayBefore !== null && todayBefore <= max && todayBefore >= min && <span className="gantt-today" style={{ left: x(todayBefore) }} />}
                      <span className="gantt-wedding" style={{ left: x(0) }} />
                      <span
                        className={`gantt-bar ${i.task.status === '완료' ? 'done' : i.task.status === '진행 중' ? 'doing' : ''} ${i.overdue ? 'late' : ''}`}
                        style={{ left: x(start), width: Math.max(6, (start - end) * PX) }}
                        title={`${i.task.title} · D-${start} ~ D-${end}`}
                      />
                    </div>
                  </div>
                  {open === i.task.id && (
                    <div style={{ position: 'sticky', left: 0, maxWidth: 'min(100%, 420px)' }}>
                      <TaskDetail item={i} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="row muted" style={{ flexWrap: 'wrap', gap: 12 }}>
        <span>
          <i className="gantt-key" /> 시작 전
        </span>
        <span>
          <i className="gantt-key doing" /> 진행 중
        </span>
        <span>
          <i className="gantt-key done" /> 완료
        </span>
        {todayBefore !== null && <span>│ 금색 선: 오늘</span>}
        <span>│ 로즈 선: 본식</span>
      </div>
    </div>
  )
}
