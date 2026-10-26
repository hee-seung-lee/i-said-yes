import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { NeedAnswers, useAnswersReady, useNextPath } from '../components/flow'
import { CATEGORY_COLOR, PlanMap } from '../components/PlanMap'
import { buildPlans, categoryLabel, formatManwon, recommendedKey } from '../logic/recommend'
import { inquiryDraft, nextActionFor } from '../logic/nextActions'
import { useStore } from '../store'

export default function CardMap03() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const selectPlan = useStore((s) => s.selectPlan)
  const ready = useAnswersReady()
  const plans = useMemo(() => buildPlans(answers), [answers])
  const [copied, setCopied] = useState('')
  const next = useNextPath('03')
  const navigate = useNavigate()

  if (!ready)
    return (
      <Layout piece="03_card_map">
        <NeedAnswers />
      </Layout>
    )

  const plan = plans.find((p) => p.key === (selectedPlan ?? recommendedKey(plans)))!
  const local = plan.picks.filter((v) => v.category !== 'snap')

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
    } catch {
      setCopied('')
    }
  }

  return (
    <Layout piece="03_card_map">
      <div style={{ margin: '-20px -20px 0' }}>
        <PlanMap vendors={local} tall />
      </div>
      <div className="sheet" style={{ margin: '0 -20px -20px' }}>
        <div className="grip" />
        <div className="tabs">
          {plans.map((p) => (
            <span key={p.key} className={p.key === plan.key ? 'chip on' : 'chip'} onClick={() => selectPlan(p.key)}>
              {p.letter}안
            </span>
          ))}
        </div>
        <b style={{ fontFamily: 'var(--serif)' }}>
          {plan.letter}안 · {plan.title} · 업체 {plan.picks.length}곳
        </b>
        {plan.picks.map((v) => {
          const a = nextActionFor(v)
          return (
            <div key={v.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="row">
                <span className="legend-dot" style={{ background: CATEGORY_COLOR[v.category] }} />
                <span className="grow">
                  {categoryLabel(v.category)} · {v.name}
                </span>
                <span className="muted">{formatManwon(v.priceMin)}~</span>
              </div>
              <div className="sub">
                다음 할 일: {a.task} <span className="muted">({a.when})</span>
              </div>
              {v.category === 'snap' && <div className="muted">예식 지역과 떨어져 지도에는 표시하지 않았어요</div>}
              {!v.extrasConfirmed && (
                <button onClick={() => copy(v.id, inquiryDraft(v))}>{copied === v.id ? '문의 초안 복사됨' : '추가금 문의 초안 복사'}</button>
              )}
            </div>
          )
        })}
        {next && (
          <button className="primary" onClick={() => navigate(next)}>
            일정·할 일 보기
          </button>
        )}
      </div>
    </Layout>
  )
}
