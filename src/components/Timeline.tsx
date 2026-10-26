// 일정·할 일 화면 부품. PRD: 오늘 할 일, 전체 타임라인, 업무 상세 편집, 기준일·재계산 미리보기, 압축 계획, 선행 관계.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ANCHOR_LABEL, type AnchorKey, CATEGORIES, type Owner, type TaskRecord, type TaskStatus } from '../data/tasks'
import { celebrateFrom } from '../effects/petals'
import { needsPurchase } from '../logic/decide'
import { fmt, newId, toMan, toWon } from '../logic/money'
import { buildPlans, recommendedKey } from '../logic/recommend'
import {
  type Anchors,
  compressPlan,
  conflicts,
  daysBetween,
  formatKDate,
  formatShort,
  lateTasks,
  minusDays,
  monthGrid,
  rangeText,
  reschedulePreview,
  resolve,
  todaySeoul,
  validDays,
  wouldCycle,
} from '../logic/schedule'
import { type Pick, type TodoItem, buildTodos, readiness, todayPicks } from '../logic/todo'
import { useStore } from '../store'

export function useTodos() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const tasks = useStore((s) => s.tasks)
  const anchors = useStore((s) => s.project.anchors)
  const today = todaySeoul()
  return useMemo(() => {
    const plans = buildPlans(answers)
    const plan = plans.find((p) => p.key === (selectedPlan ?? recommendedKey(plans)))
    const items = buildTodos(tasks, answers, plan, anchors, today)
    return { plan, items, tasks, picks: todayPicks(items, anchors, today), ready: readiness(items), today, anchors }
  }, [answers, selectedPlan, tasks, anchors, today])
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { '시작 전': '진행 중', '진행 중': '완료', 완료: '시작 전' }

// 상태 동그라미. 시작 전 → 진행 중 → 완료. 확인된 선행 일이 남았으면 완료를 막는다(PRD).
export function StatusDot({ item, onBlocked }: { item: TodoItem; onBlocked?: (msg: string) => void }) {
  const setStatus = useStore((s) => s.setStatus)
  const s = item.task.status
  const next = NEXT_STATUS[s]
  return (
    <button
      className={`status-dot ${s === '완료' ? 'done' : s === '진행 중' ? 'doing' : ''}`}
      aria-label={`${item.task.title} 상태: ${s}. 눌러서 ${next}`}
      title={`${s} → ${next}`}
      onClick={(e) => {
        if (next === '완료' && item.blockedBy.length) {
          onBlocked?.(`먼저 '${item.blockedBy.map((b) => b.title).join("', '")}'을 끝내야 완료할 수 있어요`)
          return
        }
        setStatus(item.task.id, next)
        if (next === '완료') celebrateFrom(e.currentTarget, 0.3)
      }}
    >
      {s === '완료' ? '✓' : s === '진행 중' ? '…' : ''}
    </button>
  )
}

export function Tags({ item }: { item: TodoItem }) {
  const t = item.task
  return (
    <>
      {t.categories.map((c) => (
        <span key={c} className="tag cat">
          {c}
        </span>
      ))}
      {item.r.anchorLabel !== '본식' && <span className="tag">{item.r.anchorLabel} 기준</span>}
      {item.overdue && <span className="tag warn">기한 지남</span>}
      {item.blockedBy.length > 0 && <span className="tag warn">막힘</span>}
      {item.onHold && <span className="tag">보류</span>}
      {!t.requiredForWedding && <span className="tag">선택</span>}
      {t.origin === 'proposed' && <span className="tag">제안</span>}
      {t.ownerIds.length > 0 && <span className="tag">{t.ownerIds.join('·')}</span>}
      {t.budget !== null && <span className="tag">예산 {fmt(t.budget)}</span>}
      {t.actionItems.length > 0 && (
        <span className="tag">
          ☑ {t.actionItems.filter((a) => a.done).length}/{t.actionItems.length}
        </span>
      )}
      {t.docs.length > 0 && <span className="tag">📎 {t.docs.length}</span>}
      {t.memo.trim() && <span className="tag">메모</span>}
    </>
  )
}

export function TaskRow({ item }: { item: TodoItem }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const t = item.task
  return (
    <div className={`task-row ${t.status === '완료' ? 'is-done' : ''} ${!t.requiredForWedding ? 'is-optional' : ''}`}>
      <StatusDot item={item} onBlocked={setMsg} />
      <div className="grow">
        <button className="task-title link-like" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {t.title}
        </button>
        {item.vendorNote && <div className="task-note">{item.vendorNote}</div>}
        <div className="task-meta">
          <span>{rangeText(item.r)}</span>
          <Tags item={item} />
        </div>
        {msg && (
          <div className="inline-msg" onClick={() => setMsg('')}>
            {msg}
          </div>
        )}
        {open && <TaskDetail item={item} />}
      </div>
    </div>
  )
}

const OWNERS: Owner[] = ['신랑', '신부', '둘이', '가족']
const STATUSES: TaskStatus[] = ['시작 전', '진행 중', '완료']

// 업무 상세 편집(PRD: 기한·기준일·담당자·필수 여부·상태·원본 링크·완료 기준)
export function TaskDetail({ item }: { item: TodoItem }) {
  const t = item.task
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const setStatus = useStore((s) => s.setStatus)
  const [startD, setStartD] = useState(String(t.startDaysBefore))
  const [dueD, setDueD] = useState(String(t.dueDaysBefore))
  const [depErr, setDepErr] = useState('')
  const daysErr = validDays(Number(startD), Number(dueD))
  const others = tasks.filter((x) => x.id !== t.id && x.adopted && !t.dependencies.some((d) => d.taskId === x.id))
  const byId = new Map(tasks.map((x) => [x.id, x]))

  return (
    <div className="task-detail">
      <TitleEditor task={t} />
      <div className="field">
        <span className="field-label">분류 (여러 개 고를 수 있어요)</span>
        <div>
          {CATEGORIES.map((c) => (
            <span
              key={c}
              className={t.categories.includes(c) ? 'chip on' : 'chip'}
              onClick={() => {
                const next = t.categories.includes(c) ? t.categories.filter((x) => x !== c) : [...t.categories, c]
                if (next.length) updateTask(t.id, { categories: next })
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      {item.suggestion && (
        <div className="suggest">
          {item.suggestion}. 이 일을 선택(본식 필수 아님)으로 바꿀까요?
          <button onClick={() => updateTask(t.id, { requiredForWedding: false })}>선택으로 바꾸기</button>
        </div>
      )}
      <div className="detail-grid">
        <label className="field">
          <span className="field-label">상태</span>
          <select id={`st-${t.id}`} value={t.status} onChange={(e) => setStatus(t.id, e.target.value as TaskStatus)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="field-label">담당자</span>
          <div>
            {OWNERS.map((o) => (
              <span
                key={o}
                className={t.ownerIds.includes(o) ? 'chip on' : 'chip'}
                onClick={() => updateTask(t.id, { ownerIds: t.ownerIds.includes(o) ? t.ownerIds.filter((x) => x !== o) : [...t.ownerIds, o] })}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
        <label className="field check">
          <input type="checkbox" checked={t.requiredForWedding} onChange={(e) => updateTask(t.id, { requiredForWedding: e.target.checked })} />
          <span>본식 필수 준비에 넣기</span>
        </label>
        <label className="field check">
          <input type="checkbox" checked={t.excluded} onChange={(e) => updateTask(t.id, { excluded: e.target.checked })} />
          <span>이 일 제외하기</span>
        </label>
        <div className="field">
          <span className="field-label">상대 일정 (본식 며칠 전)</span>
          <div className="row">
            <input id={`sd-${t.id}`} type="number" value={startD} onChange={(e) => setStartD(e.target.value)} aria-label="시작 D-숫자" />
            <span className="sub">~</span>
            <input id={`dd-${t.id}`} type="number" value={dueD} onChange={(e) => setDueD(e.target.value)} aria-label="마감 D-숫자" />
            <button disabled={!!daysErr} onClick={() => updateTask(t.id, { startDaysBefore: Number(startD), dueDaysBefore: Number(dueD), scheduleOrigin: 'user' })}>
              저장
            </button>
          </div>
          {daysErr && <span className="err">{daysErr}</span>}
          {t.override && (
            <span className="muted">
              {ANCHOR_LABEL[t.override.anchor]}일을 넣으면 {ANCHOR_LABEL[t.override.anchor]} {t.override.startDaysBefore}~{t.override.dueDaysBefore}일 전으로 계산해요
            </span>
          )}
        </div>
        <div className="field">
          <span className="field-label">확정 날짜 (예약이 잡혔으면) · 기준일이 바뀌어도 유지</span>
          <div className="row">
            <input id={`fs-${t.id}`} type="date" value={t.fixedStart ?? ''} onChange={(e) => updateTask(t.id, { fixedStart: e.target.value || null })} aria-label="확정 시작" />
            <input id={`fd-${t.id}`} type="date" value={t.fixedDue ?? ''} onChange={(e) => updateTask(t.id, { fixedDue: e.target.value || null })} aria-label="확정 마감" />
          </div>
        </div>
        <label className="field">
          <span className="field-label">업무 예산 (만 원 · 비우면 미정, 0 은 0원)</span>
          <input
            id={`bd-${t.id}`}
            type="number"
            step="0.1"
            value={t.budget === null ? '' : toMan(t.budget)}
            onChange={(e) => updateTask(t.id, { budget: e.target.value === '' ? null : toWon(Number(e.target.value)) })}
          />
        </label>
        <label className="field">
          <span className="field-label">완료 기준</span>
          <input id={`cc-${t.id}`} value={t.completionCriteria} placeholder="계약서 받고 계약금 입금" onChange={(e) => updateTask(t.id, { completionCriteria: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">원본 링크</span>
          <input id={`su-${t.id}`} value={t.sourceUrl ?? ''} placeholder="https://" onChange={(e) => updateTask(t.id, { sourceUrl: e.target.value || null })} />
        </label>
      </div>

      <div className="field">
        <span className="field-label">먼저 끝나야 하는 일 (확인한 '꼭'만 완료를 막아요. 후보 조사는 언제든 돼요)</span>
        {t.dependencies.length === 0 && <span className="muted">없음</span>}
        {t.dependencies.map((d) => {
          const p = byId.get(d.taskId)
          const set = (patch: Partial<typeof d>) =>
            updateTask(t.id, { dependencies: t.dependencies.map((x) => (x.taskId === d.taskId ? { ...x, ...patch } : x)) })
          return (
            <div key={d.taskId} className="dep-row">
              <span className="grow">
                {p?.title ?? d.taskId}
                {p && !p.adopted && <span className="muted"> (채택 안 한 제안)</span>}
              </span>
              <span className={d.type === 'hard' ? 'chip on' : 'chip'} onClick={() => set({ type: d.type === 'hard' ? 'soft' : 'hard' })}>
                {d.type === 'hard' ? '꼭' : '참고'}
              </span>
              <span className={d.confirmed ? 'chip on' : 'chip'} onClick={() => set({ confirmed: !d.confirmed })}>
                {d.confirmed ? '확인함' : '확인하기'}
              </span>
              <button className="ghost" aria-label="관계 지우기" onClick={() => updateTask(t.id, { dependencies: t.dependencies.filter((x) => x.taskId !== d.taskId) })}>
                ✕
              </button>
            </div>
          )
        })}
        <select
          id={`add-dep-${t.id}`}
          value=""
          onChange={(e) => {
            const id = e.target.value
            if (!id) return
            if (wouldCycle(tasks, t.id, id)) {
              setDepErr('서로가 서로를 기다리게 돼서 넣을 수 없어요(순환)')
              return
            }
            setDepErr('')
            updateTask(t.id, { dependencies: [...t.dependencies, { taskId: id, type: 'hard', confirmed: true }] })
          }}
        >
          <option value="">+ 먼저 할 일 추가</option>
          {others.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
        {depErr && <span className="err">{depErr}</span>}
      </div>

      <TaskPage task={t} />

      {needsPurchase(t) && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="sub grow">결정: {t.decisionStatus}</span>
          <Link to={`/05_card_quotes?task=${t.id}`}>견적 비교</Link>
          <Link to={`/06_card_decide?task=${t.id}`}>결정 도우미</Link>
        </div>
      )}
      <DeleteTask task={t} />
    </div>
  )
}

// 제목 고치기: 입력을 끝낼 때(Enter·포커스 이동) 저장. 비우면 원래대로 둔다.
function TitleEditor({ task }: { task: TaskRecord }) {
  const updateTask = useStore((s) => s.updateTask)
  const [title, setTitle] = useState(task.title)
  // 입력칸의 현재 값으로 저장한다(입력 직후 바로 포커스가 빠져도 이전 값이 저장되지 않게)
  const save = (value: string) => (value.trim() ? updateTask(task.id, { title: value.trim() }) : setTitle(task.title))
  return (
    <label className="field">
      <span className="field-label">업무 이름</span>
      <input
        id={`title-${task.id}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={(e) => save(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && save(e.currentTarget.value)}
      />
    </label>
  )
}

// 노션 업무 페이지 템플릿: 프로젝트 정보 / 액션 아이템 / 문서
function TaskPage({ task }: { task: TaskRecord }) {
  const updateTask = useStore((s) => s.updateTask)
  const [todo, setTodo] = useState('')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  // 최신 업무로 고친다(연달아 눌러도 앞 변경을 잃지 않게)
  const latest = () => useStore.getState().tasks.find((x) => x.id === task.id)!
  const addTodo = () => {
    if (!todo.trim()) return
    updateTask(task.id, { actionItems: [...latest().actionItems, { id: newId('a'), text: todo.trim(), done: false }] })
    setTodo('')
  }
  const addDoc = () => {
    const u = url.trim()
    if (!/^https?:\/\/\S+$/i.test(u)) return setErr('http:// 또는 https:// 로 시작하는 주소를 넣어 주세요')
    updateTask(task.id, { docs: [...latest().docs, { id: newId('d'), label: label.trim() || hostOf(u), url: u }] })
    setLabel('')
    setUrl('')
    setErr('')
  }
  const done = task.actionItems.filter((a) => a.done).length

  return (
    <div className="task-page">
      <label className="field">
        <span className="field-label">프로젝트 정보</span>
        <textarea
          id={`memo-${task.id}`}
          rows={3}
          value={task.memo}
          placeholder="이 일의 목표와 맥락, 상담 메모"
          onChange={(e) => updateTask(task.id, { memo: e.target.value })}
        />
      </label>

      <div className="field">
        <span className="field-label">
          액션 아이템 {task.actionItems.length > 0 && `${done}/${task.actionItems.length}`}
        </span>
        {task.actionItems.map((a) => (
          <div key={a.id} className="dep-row check">
            <input
              type="checkbox"
              checked={a.done}
              aria-label={a.text}
              onChange={() => updateTask(task.id, { actionItems: latest().actionItems.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) })}
            />
            <span className={`grow ${a.done ? 'is-checked' : ''}`}>{a.text}</span>
            <button className="ghost" aria-label="액션 아이템 지우기" onClick={() => updateTask(task.id, { actionItems: latest().actionItems.filter((x) => x.id !== a.id) })}>
              ✕
            </button>
          </div>
        ))}
        <div className="row">
          <input id={`todo-${task.id}`} className="grow" value={todo} placeholder="할 일 한 줄" onChange={(e) => setTodo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
          <button onClick={addTodo}>추가</button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">문서</span>
        {task.docs.map((d) => (
          <div key={d.id} className="dep-row">
            <a className="grow doc-link" href={d.url} target="_blank" rel="noopener noreferrer">
              📎 {d.label}
            </a>
            <span className="muted">{hostOf(d.url)}</span>
            <button className="ghost" aria-label="문서 지우기" onClick={() => updateTask(task.id, { docs: latest().docs.filter((x) => x.id !== d.id) })}>
              ✕
            </button>
          </div>
        ))}
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <input id={`doc-label-${task.id}`} value={label} placeholder="이름 (견적서, 계약서)" onChange={(e) => setLabel(e.target.value)} style={{ flex: '1 1 120px' }} />
          <input id={`doc-url-${task.id}`} value={url} placeholder="https:// 드라이브·PDF 링크" onChange={(e) => setUrl(e.target.value)} style={{ flex: '2 1 180px' }} />
          <button onClick={addDoc}>첨부</button>
        </div>
        {err && <span className="err">{err}</span>}
        <span className="muted">파일은 구글 드라이브 등에 올리고 링크를 붙여 주세요. 앱은 파일을 따로 저장하지 않아요.</span>
      </div>
    </div>
  )
}

function DeleteTask({ task }: { task: TaskRecord }) {
  const deleteTask = useStore((s) => s.deleteTask)
  const [ask, setAsk] = useState(false)
  if (!ask)
    return (
      <button className="ghost danger" onClick={() => setAsk(true)}>
        이 업무 삭제
      </button>
    )
  return (
    <div className="preview-box">
      <span className="sub">
        '{task.title}'을 지울까요? 이 일을 기다리던 관계와 견적·계약 기록도 함께 지워져요.
        {task.origin === 'source' && ' 원본 업무는 09 데이터에서 다시 가져오면 돌아와요.'}
      </span>
      <div className="row">
        <button onClick={() => setAsk(false)}>취소</button>
        <button className="primary" onClick={() => deleteTask(task.id)}>
          삭제
        </button>
      </div>
    </div>
  )
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

export function TodayCard({ pick, index }: { pick: Pick; index: number }) {
  const { item, reason } = pick
  const [msg, setMsg] = useState('')
  return (
    <div className="card today-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="today-no">{index + 1}</span>
        <div className="grow">
          <div className="task-title">{item.task.title}</div>
          <div className="task-note">{reason}</div>
          {item.vendorNote && <div className="muted">{item.vendorNote}</div>}
          <div className="next-action">다음 행동 · {item.next}</div>
          {msg && <div className="inline-msg">{msg}</div>}
        </div>
        <StatusDot item={item} onBlocked={setMsg} />
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
  if (!anchors.wedding) return <div className="dday-empty">본식일이 미정이에요. 일정은 D-숫자로만 보여요.</div>
  const d = daysBetween(today, anchors.wedding)
  return (
    <div className="dday">
      <span className="dday-num">{d > 0 ? `D-${d}` : d === 0 ? 'D-day' : `D+${-d}`}</span>
      <span className="sub">{formatKDate(anchors.wedding)} 본식</span>
    </div>
  )
}

const ANCHOR_FIELDS: { key: AnchorKey; hint: string }[] = [
  { key: 'wedding', hint: '모든 일정의 기준' },
  { key: 'familyMeeting', hint: '양가 선물 일정' },
  { key: 'shoot', hint: '촬영 소품 일정' },
  { key: 'moveIn', hint: '혼수 구매 일정' },
  { key: 'departure', hint: '항공·숙소 일정' },
]

// 기준일 입력. 이미 있던 날짜를 바꾸면 재계산 미리보기를 먼저 보여 준다(확정 예약·완료한 일은 유지).
export function AnchorInputs({ only }: { only?: AnchorKey[] }) {
  const anchors = useStore((s) => s.project.anchors)
  const tasks = useStore((s) => s.tasks)
  const setAnchor = useStore((s) => s.setAnchor)
  const [pending, setPending] = useState<{ key: AnchorKey; value: string | null } | null>(null)
  const preview = pending ? reschedulePreview(tasks.filter((t) => t.adopted), anchors, { ...anchors, [pending.key]: pending.value }) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="anchor-grid">
        {ANCHOR_FIELDS.filter((f) => !only || only.includes(f.key)).map((f) => (
          <label key={f.key} className="field">
            <span className="field-label">
              {ANCHOR_LABEL[f.key]}일 <span className="muted">· {f.hint}</span>
            </span>
            <input
              id={`anchor-${f.key}`}
              type="date"
              value={(pending?.key === f.key ? pending.value : anchors[f.key]) ?? ''}
              onChange={(e) => {
                const value = e.target.value || null
                if (anchors[f.key] === null) setAnchor(f.key, value)
                else setPending({ key: f.key, value })
              }}
            />
          </label>
        ))}
      </div>
      {pending && preview && (
        <div className="preview-box">
          <b>{ANCHOR_LABEL[pending.key]}일을 바꾸면</b>
          <div className="sub">
            일정이 바뀌는 일 {preview.changed.length}개
            {preview.kept.length > 0 && ` · 확정 예약·완료라 그대로 두는 일 ${preview.kept.length}개`}
          </div>
          <ul className="sub" style={{ margin: 0, paddingLeft: 18, maxHeight: 140, overflow: 'auto' }}>
            {preview.changed.slice(0, 8).map((c) => (
              <li key={c.task.id}>
                {c.task.title}: {c.before.due ? formatShort(c.before.due) : `D-${c.before.dueDays}`} → {c.after.due ? formatShort(c.after.due) : `D-${c.after.dueDays}`}
              </li>
            ))}
            {preview.changed.length > 8 && <li>외 {preview.changed.length - 8}개</li>}
          </ul>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button onClick={() => setPending(null)}>취소</button>
            <button
              className="primary"
              onClick={() => {
                setAnchor(pending.key, pending.value)
                setPending(null)
              }}
            >
              바꾸기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 늦게 시작했을 때: 지난 단계를 '이미 완료 / 지금 진행 / 제외'로 고르고, 지금 진행할 일은 압축 일정을 제안한다.
export function LateStartPanel() {
  const tasks = useStore((s) => s.tasks)
  const anchors = useStore((s) => s.project.anchors)
  const updateTask = useStore((s) => s.updateTask)
  const setStatus = useStore((s) => s.setStatus)
  const today = todaySeoul()
  const late = lateTasks(tasks, anchors, today)
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<Record<string, 'done' | 'now' | 'skip'>>({})
  if (!anchors.wedding || late.length === 0) return null
  const nowTasks = late.filter((t) => choice[t.id] === 'now')
  const plan = compressPlan(nowTasks, anchors, today)
  const decided = late.filter((t) => choice[t.id]).length

  return (
    <section className="card late-panel">
      <div className="row">
        <div className="grow">
          <b style={{ fontFamily: 'var(--serif)' }}>지난 단계 {late.length}개가 남아 있어요</b>
          <div className="sub">자동으로 완료 처리하지 않아요. 하나씩 이미 했는지, 지금 할지, 뺄지 골라 주세요.</div>
        </div>
        <button onClick={() => setOpen((v) => !v)}>{open ? '접기' : '정리하기'}</button>
      </div>
      {open && (
        <>
          {late.map((t) => (
            <div key={t.id} className="dep-row">
              <span className="grow">
                {t.title} <span className="muted">· 마감 {formatShort(resolve(t, anchors).due!)}</span>
              </span>
              {(['done', 'now', 'skip'] as const).map((c) => (
                <span key={c} className={choice[t.id] === c ? 'chip on' : 'chip'} onClick={() => setChoice((prev) => ({ ...prev, [t.id]: c }))}>
                  {c === 'done' ? '이미 완료' : c === 'now' ? '지금 진행' : '제외'}
                </span>
              ))}
            </div>
          ))}
          {plan.length > 0 && (
            <div className="preview-box">
              <b>지금 진행할 일의 압축 일정</b>
              <ul className="sub" style={{ margin: 0, paddingLeft: 18 }}>
                {plan.map((p) => (
                  <li key={p.task.id}>
                    {p.task.title}: {formatShort(p.due)}까지
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button
              className="primary"
              disabled={decided === 0}
              onClick={() => {
                for (const t of late) {
                  const c = choice[t.id]
                  if (c === 'done') setStatus(t.id, '완료')
                  if (c === 'skip') updateTask(t.id, { excluded: true })
                }
                for (const p of plan) updateTask(p.task.id, { status: '진행 중', fixedStart: today, fixedDue: p.due })
                setChoice({})
                setOpen(false)
              }}
            >
              고른 {decided}개 적용
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// 확인된 선행 관계와 일정이 부딪히면 영향과 대체안을 보여 준다(자동 연기 없음).
export function ConflictPanel() {
  const tasks = useStore((s) => s.tasks)
  const anchors = useStore((s) => s.project.anchors)
  const updateTask = useStore((s) => s.updateTask)
  const list = conflicts(tasks, anchors)
  if (list.length === 0) return null
  return (
    <section className="card late-panel">
      <b style={{ fontFamily: 'var(--serif)' }}>일정이 부딪히는 일 {list.length}개</b>
      {list.map((c) => {
        const a = resolve(c.task, anchors)
        const b = resolve(c.prereq, anchors)
        return (
          <div key={`${c.task.id}-${c.prereq.id}`} className="preview-box">
            <div className="sub">
              '{c.task.title}'은 '{c.prereq.title}'이 먼저 끝나야 하는데, 선행 일 마감이 {c.gapDays}일 늦어요.
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {a.due && b.due && (
                <>
                  <button onClick={() => updateTask(c.prereq.id, { fixedDue: minusDays(a.due!, 1) })}>{c.options[0]}</button>
                  <button onClick={() => updateTask(c.task.id, { fixedDue: minusDays(b.due!, -1) })}>{c.options[1]}</button>
                </>
              )}
              <button
                onClick={() =>
                  updateTask(c.task.id, { dependencies: c.task.dependencies.map((d) => (d.taskId === c.prereq.id ? { ...d, type: 'soft' } : d)) })
                }
              >
                {c.options[2]}
              </button>
            </div>
          </div>
        )
      })}
    </section>
  )
}

// 원본에 없는 제안 마일스톤. 채택해야 일정에 보인다.
export function MilestonePanel() {
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const proposed = tasks.filter((t) => t.origin === 'proposed')
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <b style={{ fontFamily: 'var(--serif)' }}>원본에 없는 제안 일정</b>
      <div className="sub">필요한 것만 채택하세요. '촬영 날짜 확정'을 끝내도 실제 촬영·보정본 수령은 따로 체크해요.</div>
      {proposed.map((t) => (
        <div key={t.id} className="dep-row">
          <span className="grow">
            {t.title} <span className="muted">· D-{t.startDaysBefore}~{t.dueDaysBefore}</span>
          </span>
          <span className={t.adopted ? 'chip on' : 'chip'} onClick={() => updateTask(t.id, { adopted: !t.adopted })}>
            {t.adopted ? '채택함' : '채택하기'}
          </span>
        </div>
      ))}
    </section>
  )
}

// 달력 보기(본식일이 있을 때). 마감일에 점을 찍는다.
export function CalendarView({ items, today }: { items: TodoItem[]; today: string }) {
  const [ym, setYm] = useState(() => today.slice(0, 7))
  const [y, m] = ym.split('-').map(Number)
  const cells = monthGrid(y, m)
  const byDue = new Map<string, TodoItem[]>()
  for (const i of items) if (i.r.due && !i.task.excluded) byDue.set(i.r.due, [...(byDue.get(i.r.due) ?? []), i])
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const [sel, setSel] = useState<string | null>(null)
  return (
    <div className="card calendar">
      <div className="row">
        <button className="ghost" onClick={() => shift(-1)} aria-label="이전 달">
          ‹
        </button>
        <b className="grow" style={{ textAlign: 'center', fontFamily: 'var(--serif)' }}>
          {y}년 {m}월
        </b>
        <button className="ghost" onClick={() => shift(1)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span key={d} className="cal-head">
            {d}
          </span>
        ))}
        {cells.map((c, i) => {
          const list = c ? (byDue.get(c) ?? []) : []
          return (
            <button
              key={i}
              className={`cal-cell ${c === today ? 'today' : ''} ${c === sel ? 'sel' : ''}`}
              disabled={!c}
              onClick={() => c && setSel(c)}
            >
              {c && <span className="cal-day">{Number(c.slice(8))}</span>}
              {list.length > 0 && <span className={`cal-dot ${list.every((x) => x.task.status === '완료') ? 'done' : ''}`}>{list.length}</span>}
            </button>
          )
        })}
      </div>
      {sel && (
        <div className="task-list">
          <div className="sub">{formatKDate(sel)} 마감</div>
          {(byDue.get(sel) ?? []).map((i) => (
            <TaskRow key={i.task.id} item={i} />
          ))}
          {(byDue.get(sel) ?? []).length === 0 && <div className="muted">이 날 마감인 일이 없어요</div>}
        </div>
      )}
    </div>
  )
}

export function taskTitle(tasks: TaskRecord[], id: string): string {
  return tasks.find((t) => t.id === id)?.title ?? id
}
