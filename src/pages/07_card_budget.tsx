import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ManInput } from '../components/Money'
import { getNumber } from '../data/questions'
import type { TaskRecord } from '../data/tasks'
import { balance, fmt, newId, paidSum, quoteTotal, summarize, taskCost, toWon } from '../logic/money'
import { formatShort, todaySeoul } from '../logic/schedule'
import { useStore } from '../store'

const SCOPE: { key: 'house' | 'goods' | 'trip'; label: string; categories: string[]; titles?: string[] }[] = [
  { key: 'house', label: '신혼집', categories: ['신혼집'] },
  { key: 'goods', label: '혼수', categories: [], titles: ['혼수 구매', '혼수 리스트 작성'] },
  { key: 'trip', label: '신혼여행', categories: ['신혼여행'] },
]

// 총예산 범위에 들어가는 업무인지. 범위를 아직 안 정했으면(null) 넣지 않는다.
function inScope(t: TaskRecord, scope: Record<'house' | 'goods' | 'trip', boolean | null>): boolean {
  for (const s of SCOPE) {
    const hit = s.titles ? s.titles.includes(t.title) : t.categories.some((c) => s.categories.includes(c))
    if (hit) return scope[s.key] === true
  }
  return true
}

const VERDICT: Record<string, string> = {
  unknown: '총예산을 정하면 초과 여부를 알려 드려요. 지금은 단정하지 않아요.',
  within: '예상 비용이 쓸 수 있는 예산 안이에요.',
  maybe: '확인된 금액 기준으로는 예산 안이지만, 추가금이 확인 안 된 견적이 있어 더 나올 수 있어요.',
  over: '예상 비용이 쓸 수 있는 예산을 넘어요.',
  'over-min': '확인된 최소금액만으로도 쓸 수 있는 예산을 넘어요.',
}

// PRD 화면: 예산. 업무 예상비용 = 계약액 > 고른 견적 > 업무 예산 중 하나, 지급은 비용에 더하지 않음, 잔금 = 계약 - 지급
export default function CardBudget07() {
  const tasks = useStore((s) => s.tasks)
  const project = useStore((s) => s.project)
  const setProject = useStore((s) => s.setProject)
  const quotes = useStore((s) => s.quotes)
  const chosen = useStore((s) => s.chosen)
  const contracts = useStore((s) => s.contracts)
  const answers = useStore((s) => s.answers)
  const [open, setOpen] = useState<string | null>(null)

  const scopeSet = project.budgetScope.house !== null && project.budgetScope.goods !== null && project.budgetScope.trip !== null
  const rows = tasks
    .filter((t) => t.adopted && !t.excluded)
    .map((t) => ({ t, cost: taskCost(contracts[t.id], quotes.find((q) => q.id === chosen[t.id]), t.budget), c: contracts[t.id] }))
    .filter((r) => r.cost.value !== null || r.c)
  const counted = rows.filter((r) => inScope(r.t, project.budgetScope))
  const sum = summarize(
    counted.map((r) => r.cost),
    counted.map((r) => r.c).filter((c): c is NonNullable<typeof c> => !!c),
    project.totalBudget,
    project.reserveBudget,
  )
  const fromChecklist = { total: getNumber(answers, 'q01.max') ?? getNumber(answers, 'q01.target'), reserve: getNumber(answers, 'q01.reserve') }

  return (
    <Layout piece="07_card_budget" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
        <h3 style={{ margin: 0 }}>먼저 정할 것</h3>
        <div className="detail-grid">
          <label className="field">
            <span className="field-label">총예산</span>
            <ManInput id="total-budget" value={project.totalBudget} onChange={(v) => setProject({ totalBudget: v })} placeholder="미정" />
          </label>
          <label className="field">
            <span className="field-label">예비비</span>
            <ManInput id="reserve-budget" value={project.reserveBudget} onChange={(v) => setProject({ reserveBudget: v })} placeholder="미정" />
          </label>
        </div>
        {(fromChecklist.total !== null || fromChecklist.reserve !== null) && project.totalBudget === null && (
          <button
            onClick={() =>
              setProject({
                totalBudget: fromChecklist.total === null ? null : toWon(fromChecklist.total),
                reserveBudget: fromChecklist.reserve === null ? null : toWon(fromChecklist.reserve),
              })
            }
          >
            체크리스트 값 가져오기 ({fromChecklist.total ?? '-'}만 원 / 예비비 {fromChecklist.reserve ?? '-'}만 원)
          </button>
        )}
        <div className="field">
          <span className="field-label">총예산에 포함할까요?</span>
          {SCOPE.map((s) => (
            <div key={s.key} className="dep-row">
              <span className="grow">{s.label}</span>
              {[true, false].map((v) => (
                <span
                  key={String(v)}
                  className={project.budgetScope[s.key] === v ? 'chip on' : 'chip'}
                  onClick={() => setProject({ budgetScope: { ...project.budgetScope, [s.key]: v } })}
                >
                  {v ? '포함' : '따로'}
                </span>
              ))}
            </div>
          ))}
          {!scopeSet && <span className="muted">정하지 않은 항목은 합계에서 빼 두었어요.</span>}
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat">
          <span className="muted">예상 비용</span>
          <b>{fmt(sum.expected)}{sum.hasMinimum ? '~' : ''}</b>
        </div>
        <div className="stat">
          <span className="muted">쓸 수 있는 예산</span>
          <b>{sum.usable === null ? '미정' : fmt(sum.usable)}</b>
        </div>
        <div className="stat">
          <span className="muted">지급한 돈</span>
          <b>{fmt(sum.paid)}</b>
        </div>
        <div className="stat">
          <span className="muted">남은 잔금</span>
          <b>{fmt(sum.remaining)}</b>
        </div>
      </div>
      <div className={`card verdict ${sum.verdict.startsWith('over') ? 'warn' : ''}`}>{VERDICT[sum.verdict]}</div>

      <div className="section-title">
        <span className="num">Items</span>
        <h3>일별 비용</h3>
      </div>
      {rows.length === 0 && (
        <div className="card sub">
          아직 비용이 잡힌 일이 없어요. <Link to="/05_card_quotes">견적</Link>을 넣거나 일정에서 업무 예산을 적어 주세요.
        </div>
      )}
      <div className="card task-list">
        {rows.map(({ t, cost, c }) => {
          const b = c ? balance(c) : null
          return (
            <div key={t.id} className="task-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="row">
                <button className="task-title link-like grow" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  {t.title}
                </button>
                <b>
                  {cost.value === null ? '-' : fmt(cost.value)}
                  {cost.minimum ? '~' : ''}
                </b>
              </div>
              <div className="task-meta">
                <span>{cost.source ?? '금액 없음'}</span>
                {!inScope(t, project.budgetScope) && <span className="tag">합계 제외</span>}
                {c && <span>지급 {fmt(paidSum(c))}</span>}
                {b && <span>잔금 {fmt(b.remaining)}</span>}
                {b?.overpaid && <span className="tag warn">초과 지급 · 확인 필요</span>}
              </div>
              {open === t.id && <ContractEditor taskId={t.id} />}
            </div>
          )
        })}
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>
        업무 예산은 계획 금액이고, 실제 지출이나 총예산이 아니에요. 지급한 돈은 비용에 다시 더하지 않아요.
      </p>
    </Layout>
  )
}

function ContractEditor({ taskId }: { taskId: string }) {
  const contract = useStore((s) => s.contracts[taskId])
  const quotes = useStore((s) => s.quotes)
  const chosen = useStore((s) => s.chosen[taskId])
  const setContract = useStore((s) => s.setContract)
  const addPayment = useStore((s) => s.addPayment)
  const removePayment = useStore((s) => s.removePayment)
  const [amount, setAmount] = useState<number | null>(null)
  const [paidAt, setPaidAt] = useState(todaySeoul())
  const [err, setErr] = useState('')
  const q = quotes.find((x) => x.id === chosen)

  if (!contract)
    return (
      <div className="preview-box">
        <span className="sub">계약 정보가 없어요. 계약했다면 총액을 넣어 주세요.</span>
        <ManInput id={`agreed-${taskId}`} value={q ? quoteTotal(q).value : null} onChange={setAmount} />
        <button
          onClick={() => {
            const total = amount ?? (q ? quoteTotal(q).value : null)
            if (total === null) return setErr('금액을 넣어 주세요')
            setContract(taskId, { taskId, quoteId: q?.id ?? null, agreedTotal: total, payments: [] })
          }}
        >
          계약 등록
        </button>
        {err && <span className="err">{err}</span>}
      </div>
    )

  return (
    <div className="preview-box">
      <label className="field">
        <span className="field-label">계약 총액</span>
        <ManInput id={`agreed-${taskId}`} value={contract.agreedTotal} onChange={(v) => v !== null && setContract(taskId, { ...contract, agreedTotal: v })} />
      </label>
      <b className="sub">지급 내역</b>
      {contract.payments.length === 0 && <span className="muted">아직 없어요</span>}
      {contract.payments.map((p) => (
        <div key={p.id} className="dep-row">
          <span className="grow">
            {p.paidAt ? formatShort(p.paidAt) : '날짜 없음'} · {fmt(p.amount)}
          </span>
          <button className="ghost" aria-label="지급 지우기" onClick={() => removePayment(taskId, p.id)}>
            ✕
          </button>
        </div>
      ))}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <ManInput id={`pay-${taskId}`} value={amount} onChange={setAmount} placeholder="금액" />
        <input id={`pay-date-${taskId}`} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        <button
          onClick={() => {
            if (amount === null || amount <= 0) return setErr('지급 금액을 넣어 주세요')
            addPayment(taskId, { id: newId('p'), amount, paidAt: paidAt || null })
            setErr('')
          }}
        >
          지급 추가
        </button>
      </div>
      {err && <span className="err">{err}</span>}
      <button className="ghost" onClick={() => setContract(taskId, null)}>
        계약 정보 지우기
      </button>
    </div>
  )
}
