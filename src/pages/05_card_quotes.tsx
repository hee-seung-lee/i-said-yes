import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Attachments } from '../components/Attachments'
import { CopyButton, ManInput, TaskPicker, usePurchaseTask } from '../components/Money'
import { DistanceChips, DistanceTable, LocationPicker, type MapPoint, PlacesMap } from '../components/Places'
import { removeFile } from '../logic/files'
import { MAX_CANDIDATES } from '../logic/decide'
import { type Quote, fmt, inquiryText, missingQuestions, newId, quoteTotal } from '../logic/money'
import { buildPlans, recommendedKey } from '../logic/recommend'
import { todaySeoul } from '../logic/schedule'
import { useStore } from '../store'

// 업무 → 체크리스트 3안의 업체 종류(예시 업체로 시작할 때만 쓴다)
const VENDOR_FOR: Record<string, 'hall' | 'dress' | 'studio'> = { T07: 'hall', T09: 'dress', T08: 'studio' }

const empty = (taskId: string): Quote => ({
  id: newId('q'),
  taskId,
  vendorName: '',
  basePrice: null,
  mandatoryExtras: null,
  optionalExtras: null,
  taxIncluded: null,
  extrasConfirmed: false,
  evidence: '',
  checkedAt: todaySeoul(),
})

// PRD 화면: 견적 비교. 최대 3개 후보를 같은 조건(확정 총액 또는 확인된 최소금액)으로 본다.
export default function CardQuotes05() {
  const [list, task, pick] = usePurchaseTask()
  const quotes = useStore((s) => s.quotes)
  const chosen = useStore((s) => s.chosen)
  const upsertQuote = useStore((s) => s.upsertQuote)
  const removeQuote = useStore((s) => s.removeQuote)
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const mine = useStore((s) => s.project.places)
  const [editing, setEditing] = useState<Quote | null>(null)
  // 견적 필드 하나만 고칠 때 최신 값을 기준으로(파일을 연달아 올려도 앞 것을 잃지 않게)
  const patchQuote = (id: string, f: (q: Quote) => Partial<Quote>) => {
    const q = useStore.getState().quotes.find((x) => x.id === id)
    if (q) upsertQuote({ ...q, ...f(q) })
  }

  if (!task)
    return (
      <Layout piece="05_card_quotes" hub>
        <div className="card sub">견적을 비교할 일이 없어요.</div>
      </Layout>
    )

  const mineQuotes = quotes.filter((q) => q.taskId === task.id)
  const full = mineQuotes.length >= MAX_CANDIDATES
  const located: MapPoint[] = mineQuotes.filter((q) => q.location).map((q) => ({ id: q.id, label: q.vendorName, lat: q.location!.lat, lng: q.location!.lng, color: chosen[task.id] === q.id ? '#8e4553' : '#b3955a' }))
  const plans = buildPlans(answers)
  const plan = plans.find((p) => p.key === (selectedPlan ?? recommendedKey(plans)))
  const sampleVendor = VENDOR_FOR[task.id] && plan?.picks.find((v) => v.category === VENDOR_FOR[task.id])

  return (
    <Layout piece="05_card_quotes" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <TaskPicker list={list} current={task} onPick={pick} badge={(t) => (quotes.some((q) => q.taskId === t.id) ? `후보 ${quotes.filter((q) => q.taskId === t.id).length}` : null)} />
        <div className="sub">
          업무 예산 {task.budget === null ? '미정' : fmt(task.budget)} · 같은 조건으로 최대 {MAX_CANDIDATES}곳까지 비교해요
        </div>
      </section>

      {mineQuotes.map((q) => {
        const t = quoteTotal(q)
        const qs = missingQuestions(q)
        return (
          <section key={q.id} className={`card quote-card ${chosen[task.id] === q.id ? 'rec' : ''}`}>
            <div className="row">
              <b className="grow" style={{ fontFamily: 'var(--serif)' }}>
                {q.vendorName || '이름 없는 후보'}
              </b>
              {q.sample && <span className="tag">예시 데이터</span>}
              {chosen[task.id] === q.id && <span className="badge">고름</span>}
            </div>
            <div className={t.complete ? 'quote-total' : 'quote-total min'}>{t.label}</div>
            <dl className="quote-dl">
              <dt>기본가</dt>
              <dd>{q.basePrice === null ? '모름' : fmt(q.basePrice)}</dd>
              <dt>필수 추가금</dt>
              <dd>{q.mandatoryExtras === null ? '모름' : fmt(q.mandatoryExtras)}{q.extrasConfirmed ? ' · 확인함' : ' · 미확인'}</dd>
              <dt>선택 옵션</dt>
              <dd>{q.optionalExtras === null ? '-' : `${fmt(q.optionalExtras)} (합산 안 함)`}</dd>
              <dt>부가세</dt>
              <dd>{q.taxIncluded === null ? '모름' : q.taxIncluded ? '포함' : '별도(10%)'}</dd>
              <dt>근거</dt>
              <dd>{q.evidence || '-'}</dd>
              <dt>확인일</dt>
              <dd>{q.checkedAt ?? '-'}</dd>
            </dl>
            <div className="field">
              <span className="field-label">위치</span>
              {q.location ? (
                <>
                  <span className="sub">📍 {q.location.label}</span>
                  <DistanceChips at={q.location} mine={mine} />
                </>
              ) : (
                <LocationPicker id={`qloc-${q.id}`} value={null} onChange={(p) => patchQuote(q.id, () => ({ location: p ?? undefined }))} mine={mine} />
              )}
            </div>
            <div className="field">
              <span className="field-label">증빙 (견적서·상담 사진)</span>
              <Attachments
                idPrefix={`qf-${q.id}`}
                items={q.files ?? []}
                onChange={(f) => patchQuote(q.id, (cur) => ({ files: f(cur.files ?? []) }))}
                hint="견적서, 상담 메모, 샘플 사진을 찍어 올려 두세요."
              />
            </div>
            {qs.length > 0 && (
              <div className="preview-box">
                <b>업체에 물어볼 것</b>
                <pre className="inquiry">{inquiryText(q.vendorName || '업체', task.title, qs)}</pre>
                <div className="row">
                  <CopyButton text={inquiryText(q.vendorName || '업체', task.title, qs)} label="문의 초안 복사" />
                  <span className="muted">보내기는 직접 해 주세요</span>
                </div>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(q)}>고치기</button>
              <button
                onClick={() => {
                  for (const a of q.files ?? []) if (a.fileId) removeFile(a.fileId)
                  removeQuote(q.id)
                }}
              >
                지우기
              </button>
            </div>
          </section>
        )
      })}

      {mineQuotes.length >= 2 && <CompareTable quotes={mineQuotes} />}
      {located.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontFamily: 'var(--serif)' }}>후보 위치 비교</b>
          <PlacesMap points={located} mine={mine} />
          <DistanceTable points={located} mine={mine} />
          {Object.values(mine).every((v) => !v) && (
            <Link to="/10_card_places" className="sub">
              우리 장소(집·회사·본가)를 등록하면 거리를 비교해 드려요 →
            </Link>
          )}
        </section>
      )}

      {editing ? (
        <QuoteForm
          quote={editing}
          onCancel={() => setEditing(null)}
          onSave={(q) => {
            upsertQuote(q)
            setEditing(null)
          }}
        />
      ) : (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="primary" disabled={full} onClick={() => setEditing(empty(task.id))}>
            후보 추가
          </button>
          {sampleVendor && !mineQuotes.some((q) => q.sample) && !full && (
            <button
              onClick={() =>
                upsertQuote({
                  ...empty(task.id),
                  vendorName: sampleVendor.name,
                  basePrice: sampleVendor.priceMin * 10000,
                  evidence: '체크리스트 3안의 예시 데이터',
                  sample: true,
                  location: { label: sampleVendor.name, lat: sampleVendor.lat, lng: sampleVendor.lng },
                })
              }
            >
              {plan!.letter}안 업체로 시작(예시)
            </button>
          )}
          {full && <span className="muted">같은 조건 비교는 {MAX_CANDIDATES}곳까지예요. 하나를 지우고 넣어 주세요.</span>}
        </div>
      )}

      {mineQuotes.length > 0 && (
        <Link to={`/06_card_decide?task=${task.id}`} className="card piece-card next-link">
          결정 도우미로 →
        </Link>
      )}
    </Layout>
  )
}

function CompareTable({ quotes }: { quotes: Quote[] }) {
  const rows: [string, (q: Quote) => string][] = [
    ['비교 금액', (q) => quoteTotal(q).label],
    ['기본가', (q) => (q.basePrice === null ? '모름' : fmt(q.basePrice))],
    ['필수 추가금', (q) => (q.mandatoryExtras === null ? '모름' : fmt(q.mandatoryExtras))],
    ['부가세', (q) => (q.taxIncluded === null ? '모름' : q.taxIncluded ? '포함' : '별도')],
    ['확인일', (q) => q.checkedAt ?? '-'],
  ]
  return (
    <div className="card table-wrap">
      <table className="compare">
        <thead>
          <tr>
            <th />
            {quotes.map((q) => (
              <th key={q.id}>{q.vendorName || '후보'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => (
            <tr key={label}>
              <th>{label}</th>
              {quotes.map((q) => (
                <td key={q.id}>{f(q)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted">'확인된 최소'는 추가금·세금을 아직 몰라서 실제로는 더 나올 수 있어요.</div>
    </div>
  )
}

function QuoteForm({ quote, onSave, onCancel }: { quote: Quote; onSave: (q: Quote) => void; onCancel: () => void }) {
  const [q, setQ] = useState(quote)
  const [err, setErr] = useState('')
  const set = (patch: Partial<Quote>) => {
    setErr('')
    setQ({ ...q, ...patch })
  }
  return (
    <section className="qform" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label className="field">
        <span className="field-label">업체 이름</span>
        <input id="qf-name" value={q.vendorName} onChange={(e) => set({ vendorName: e.target.value })} placeholder="상담받은 업체" />
      </label>
      <div className="detail-grid">
        <label className="field">
          <span className="field-label">기본가</span>
          <ManInput id="qf-base" value={q.basePrice} onChange={(v) => set({ basePrice: v })} />
        </label>
        <label className="field">
          <span className="field-label">필수 추가금</span>
          <ManInput id="qf-extra" value={q.mandatoryExtras} onChange={(v) => set({ mandatoryExtras: v })} />
        </label>
        <label className="field">
          <span className="field-label">선택 옵션</span>
          <ManInput id="qf-opt" value={q.optionalExtras} onChange={(v) => set({ optionalExtras: v })} placeholder="없음" />
        </label>
        <label className="field">
          <span className="field-label">부가세</span>
          <select id="qf-tax" value={q.taxIncluded === null ? '' : q.taxIncluded ? 'in' : 'out'} onChange={(e) => set({ taxIncluded: e.target.value === '' ? null : e.target.value === 'in' })}>
            <option value="">모름</option>
            <option value="in">포함</option>
            <option value="out">별도</option>
          </select>
        </label>
      </div>
      <label className="field check">
        <input id="qf-confirmed" type="checkbox" checked={q.extrasConfirmed} onChange={(e) => set({ extrasConfirmed: e.target.checked })} />
        <span>필수 추가금까지 업체에 확인했어요 (없으면 0 을 넣고 체크)</span>
      </label>
      <div className="field">
        <span className="field-label">위치</span>
        <LocationPicker id="qf-loc" value={q.location ?? null} onChange={(p) => set({ location: p ?? undefined })} />
      </div>
      <label className="field">
        <span className="field-label">근거</span>
        <input id="qf-evidence" value={q.evidence} onChange={(e) => set({ evidence: e.target.value })} placeholder="견적서 사진, 상담 메모 위치" />
      </label>
      <label className="field">
        <span className="field-label">확인일</span>
        <input id="qf-checked" type="date" value={q.checkedAt ?? ''} onChange={(e) => set({ checkedAt: e.target.value || null })} />
      </label>
      {err && <span className="err">{err}</span>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button onClick={onCancel}>취소</button>
        <button
          className="primary"
          onClick={() => {
            if (!q.vendorName.trim()) return setErr('업체 이름을 넣어 주세요')
            onSave(q)
          }}
        >
          저장
        </button>
      </div>
    </section>
  )
}
