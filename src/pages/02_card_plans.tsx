import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { NeedAnswers, useAnswersReady, useNextPath } from '../components/flow'
import { DuplicateNotice, PlanCard } from '../components/PlanCard'
import { useSwipe } from '../components/useSwipe'
import { celebrateFrom } from '../effects/petals'
import { buildPlans, hasDuplicatePlans, recommendedKey } from '../logic/recommend'
import { useStore } from '../store'

export default function CardPlans02() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const selectPlan = useStore((s) => s.selectPlan)
  const ready = useAnswersReady()
  const next = useNextPath('02')
  const navigate = useNavigate()
  const plans = useMemo(() => buildPlans(answers), [answers])
  const rec = recommendedKey(plans)
  const [index, setIndex] = useState(() => Math.max(0, plans.findIndex((p) => p.key === (selectedPlan ?? rec))))
  const swipe = useSwipe(
    () => setIndex((i) => Math.min(plans.length - 1, i + 1)),
    () => setIndex((i) => Math.max(0, i - 1)),
  )

  if (!ready)
    return (
      <Layout piece="02_card_plans">
        <NeedAnswers />
      </Layout>
    )

  const plan = plans[index]

  return (
    <Layout piece="02_card_plans">
      <h2 style={{ margin: 0, fontSize: 20 }}>내 조건으로 만든 3가지 안</h2>
      <div className="tabs">
        {plans.map((p, i) => (
          <span key={p.key} className={i === index ? 'chip on' : 'chip'} onClick={() => setIndex(i)}>
            {p.letter} {p.title}
          </span>
        ))}
      </div>
      <div {...swipe}>
        <PlanCard plan={plan} recommended={plan.key === rec} selected={plan.key === selectedPlan} detail />
      </div>
      {hasDuplicatePlans(plans) && <DuplicateNotice />}
      <div className="dots">{plans.map((_, i) => (i === index ? '●' : '○')).join(' ')}</div>
      <div className="row" style={{ marginTop: 'auto' }}>
        <button
          className="primary grow"
          onClick={(e) => {
            selectPlan(plan.key)
            celebrateFrom(e.currentTarget)
            if (next) navigate(next)
          }}
        >
          {plan.letter}안으로 지도 보기
        </button>
      </div>
    </Layout>
  )
}
