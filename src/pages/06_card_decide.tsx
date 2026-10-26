import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { CopyButton, ManInput, TaskPicker, usePurchaseTask } from '../components/Money'
import { TaskDetail, useTodos } from '../components/Timeline'
import { celebrateFrom } from '../effects/petals'
import { STEP_LABEL, type Step, decisionState } from '../logic/decide'
import { fmt, inquiryText, quoteTotal } from '../logic/money'
import { formatShort, todaySeoul } from '../logic/schedule'
import { useStore } from '../store'

// PRD 흐름도 순서. 지금 단계를 강조한다.
const FLOW: Step[] = ['blocked', 'collect', 'confirm', 'budget', 'recommend', 'contract', 'criteria', 'done']
const HOLD_REASONS = ['가격 판단', '양가 의견', '취향 확신', '일정', '기타']

// PRD 화면: 결정 도우미
export default function CardDecide06() {
  const [list, task, pick] = usePurchaseTask()
  const { items } = useTodos()
  const quotes = useStore((s) => s.quotes)
  const contracts = useStore((s) => s.contracts)
  const chosen = useStore((s) => s.chosen)
  const updateTask = useStore((s) => s.updateTask)
  const setStatus = useStore((s) => s.setStatus)
  const choose = useStore((s) => s.choose)
  const setContract = useStore((s) => s.setContract)
  const [holdReason, setHoldReason] = useState(HOLD_REASONS[0])
  const [review, setReview] = useState('')
  const [holdOpen, setHoldOpen] = useState(false)
  const [agreed, setAgreed] = useState<number | null>(null)
  const [err, setErr] = useState('')

  if (!task)
    return (
      <Layout piece="06_card_decide" hub>
        <div className="card sub">결정할 일이 없어요.</div>
      </Layout>
    )

  const item = items.find((i) => i.task.id === task.id)!
  const mine = quotes.filter((q) => q.taskId === task.id)
  const contract = contracts[task.id]
  const st = decisionState(task, item.blockedBy, mine, contract, task.budget)
  const chosenQuote = mine.find((q) => q.id === chosen[task.id])

  const decide = (quoteId: string) => {
    choose(task.id, quoteId)
    updateTask(task.id, { decisionStatus: '선택함', holdReason: null, nextReviewDate: null })
    const t = quoteTotal(mine.find((q) => q.id === quoteId)!)
    setAgreed(t.complete ? t.value : null)
  }

  return (
    <Layout piece="06_card_decide" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <TaskPicker list={list} current={task} onPick={pick} badge={(t) => (t.decisionStatus !== '미결정' ? t.decisionStatus : null)} />
        <ol className="stepper">
          {FLOW.map((s) => (
            <li key={s} className={s === st.step || (st.step === 'hold' && s === 'recommend') ? 'on' : ''}>
              {STEP_LABEL[s]}
            </li>
          ))}
        </ol>
      </section>

      <section className="card decide-body">
        {st.step === 'blocked' && (
          <>
            <h3>먼저 끝나야 하는 일이 있어요</h3>
            <ul className="sub">
              {st.blockedBy.map((b) => (
                <li key={b.id}>{b.title}</li>
              ))}
            </ul>
            <p className="sub">결정과 계약은 그 뒤에 해요. 후보 조사는 지금 해도 돼요.</p>
            <Link to={`/05_card_quotes?task=${task.id}`}>후보 견적 모으기 →</Link>
          </>
        )}

        {st.step === 'collect' && (
          <>
            <h3>후보를 모아 주세요</h3>
            <p className="sub">같은 조건으로 최대 3곳의 견적을 받아 넣으면 비교해서 하나를 추천해요.</p>
            <Link to={`/05_card_quotes?task=${task.id}`}>견적 비교로 →</Link>
          </>
        )}

        {st.step === 'confirm' && (
          <>
            <h3>총액이 확정된 후보가 아직 없어요</h3>
            <p className="sub">추가금·부가세를 물어보면 같은 조건으로 비교할 수 있어요. 아래 문의 초안을 보내 보세요.</p>
            {st.incomplete.map(({ quote, questions }) => (
              <div key={quote.id} className="preview-box">
                <b>{quote.vendorName}</b>
                <pre className="inquiry">{inquiryText(quote.vendorName, task.title, questions)}</pre>
                <CopyButton text={inquiryText(quote.vendorName, task.title, questions)} label="문의 초안 복사" />
              </div>
            ))}
            <Link to={`/05_card_quotes?task=${task.id}`}>답을 받으면 견적 고치기 →</Link>
          </>
        )}

        {st.step === 'budget' && st.rec && (
          <>
            <h3>모든 후보가 업무 예산을 넘어요</h3>
            <p className="sub">
              가장 낮은 후보 {st.rec.pick.vendorName} {quoteTotal(st.rec.pick).label} · 업무 예산 {fmt(task.budget!)}
            </p>
            <ul className="sub">
              <li>옵션 줄이기: 선택 옵션을 빼고 다시 견적 받기</li>
              <li>
                다른 후보 찾기: <Link to={`/05_card_quotes?task=${task.id}`}>견적 비교</Link>에서 후보 바꾸기
              </li>
              <li>예산 조정: 이 일의 예산을 올리고 다른 곳에서 줄이기</li>
            </ul>
            <label className="field">
              <span className="field-label">업무 예산 조정</span>
              <ManInput id="adj-budget" value={task.budget} onChange={(v) => updateTask(task.id, { budget: v })} />
            </label>
            <button onClick={() => decide(st.rec!.pick.id)}>예산을 넘어도 이 후보로 할게요</button>
          </>
        )}

        {(st.step === 'recommend' || st.step === 'hold') && st.rec && (
          <>
            {st.step === 'hold' && (
              <div className="preview-box">
                <b>보류 중</b>
                <div className="sub">
                  막힌 기준: {task.holdReason ?? '-'} · 재검토일 {task.nextReviewDate ? formatShort(task.nextReviewDate) : '미정'} · 원래 마감은 그대로예요
                </div>
                <button onClick={() => updateTask(task.id, { decisionStatus: '비교 중' })}>다시 보기</button>
              </div>
            )}
            <h3>추천: {st.rec.pick.vendorName}</h3>
            <div className={st.rec.provisional ? 'quote-total min' : 'quote-total'}>{quoteTotal(st.rec.pick).label}</div>
            <ul className="sub">
              {st.rec.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {st.rec.provisional && <div className="inline-msg">총액이 확정되면 순위가 바뀔 수 있어요.</div>}
            {st.rec.alternatives.length > 0 && (
              <div className="sub">
                대안:{' '}
                {st.rec.alternatives.map((a) => (
                  <span key={a.id} className="chip" onClick={() => decide(a.id)}>
                    {a.vendorName} · {quoteTotal(a).label}
                  </span>
                ))}
              </div>
            )}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="primary" onClick={() => decide(st.rec!.pick.id)}>
                추천대로 할게요
              </button>
              <button onClick={() => setHoldOpen((v) => !v)}>보류</button>
            </div>
            {holdOpen && (
              <div className="preview-box">
                <b>무엇 때문에 못 정하나요? (하나만)</b>
                <div>
                  {HOLD_REASONS.map((r) => (
                    <span key={r} className={holdReason === r ? 'chip on' : 'chip'} onClick={() => setHoldReason(r)}>
                      {r}
                    </span>
                  ))}
                </div>
                <label className="field">
                  <span className="field-label">재검토일</span>
                  <input id="review-date" type="date" value={review} min={todaySeoul()} onChange={(e) => setReview(e.target.value)} />
                </label>
                {err && <span className="err">{err}</span>}
                <button
                  onClick={() => {
                    if (!review) return setErr('재검토일을 골라 주세요')
                    updateTask(task.id, { decisionStatus: '보류', holdReason, nextReviewDate: review })
                    setHoldOpen(false)
                    setErr('')
                  }}
                >
                  보류하기
                </button>
              </div>
            )}
          </>
        )}

        {st.step === 'contract' && (
          <>
            <h3>{chosenQuote?.vendorName ?? '고른 후보'}로 정했어요</h3>
            <p className="sub">실제로 계약·예약을 하셨나요? 계약금과 총액을 확인해 주세요. 앱은 계약·결제·연락을 대신하지 않아요.</p>
            <label className="field">
              <span className="field-label">계약 총액</span>
              <ManInput id="agreed" value={agreed ?? (chosenQuote ? quoteTotal(chosenQuote).value : null)} onChange={setAgreed} />
            </label>
            {err && <span className="err">{err}</span>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                className="primary"
                onClick={(e) => {
                  const total = agreed ?? (chosenQuote ? quoteTotal(chosenQuote).value : null)
                  if (total === null) return setErr('계약 총액을 넣어 주세요')
                  setContract(task.id, { taskId: task.id, quoteId: chosenQuote?.id ?? null, agreedTotal: total, payments: [] })
                  updateTask(task.id, { decisionStatus: '계약 확인' })
                  setErr('')
                  celebrateFrom(e.currentTarget, 0.6)
                }}
              >
                계약했어요
              </button>
              <button
                onClick={() => {
                  choose(task.id, null)
                  updateTask(task.id, { decisionStatus: '비교 중' })
                }}
              >
                다시 고를게요
              </button>
            </div>
          </>
        )}

        {st.step === 'criteria' && (
          <>
            <h3>완료 기준을 확인해요</h3>
            {contract && (
              <p className="sub">
                계약 {fmt(contract.agreedTotal)} · <Link to="/07_card_budget">지급·잔금은 예산에서</Link>
              </p>
            )}
            <label className="field">
              <span className="field-label">완료 기준</span>
              <input id="criteria" value={task.completionCriteria} placeholder="계약서 받고 계약금 입금" onChange={(e) => updateTask(task.id, { completionCriteria: e.target.value })} />
            </label>
            {item.blockedBy.length > 0 ? (
              <div className="inline-msg">먼저 '{item.blockedBy[0].title}'을 끝내야 완료할 수 있어요.</div>
            ) : (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button
                  className="primary"
                  onClick={(e) => {
                    setStatus(task.id, '완료')
                    celebrateFrom(e.currentTarget)
                  }}
                >
                  기준을 채웠어요 · 완료
                </button>
                <span className="sub">아직이면 다음 행동: {item.next}</span>
              </div>
            )}
          </>
        )}

        {st.step === 'setup' && <TaskDetail item={item} />}

        {st.step === 'done' && (
          <>
            <h3>끝난 일이에요</h3>
            <p className="sub">{task.completedAt ? `${formatShort(task.completedAt)}에 완료했어요.` : '완료했어요.'}</p>
            <button onClick={() => setStatus(task.id, '진행 중')}>다시 열기</button>
          </>
        )}
      </section>
      <p className="muted" style={{ textAlign: 'center' }}>
        추천은 넣어 주신 견적끼리의 규칙 계산이에요. 실제 업체 가격을 만들거나 '최저가'라고 단정하지 않아요.
      </p>
    </Layout>
  )
}
