import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { NeedAnswers, useAnswersReady, useNextPath } from '../components/flow'
import { DuplicateNotice, PlanCard } from '../components/PlanCard'
import { celebrate } from '../effects/petals'
import { buildPlans, hasDuplicatePlans, recommendedKey } from '../logic/recommend'
import { QUESTIONS, summarize } from '../data/questions'
import { useStore } from '../store'

export default function ChatPlans02() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const selectPlan = useStore((s) => s.selectPlan)
  const ready = useAnswersReady()
  const next = useNextPath('02')
  const navigate = useNavigate()
  const plans = useMemo(() => buildPlans(answers), [answers])

  if (!ready)
    return (
      <Layout piece="02_chat_plans">
        <NeedAnswers />
      </Layout>
    )

  const rec = recommendedKey(plans)
  const recPlan = plans.find((p) => p.key === rec)!
  const chosen = plans.find((p) => p.key === selectedPlan)
  // 추천에 쓴 문항만 요약한다(예산·지역·예식장·촬영·드레스).
  const summary = QUESTIONS.filter((q) => ['q01', 'q04', 'q05', 'q06', 'q09', 'q12'].includes(q.id))
    .map((q) => summarize(q, answers))
    .filter(Boolean)
    .join(' / ')

  return (
    <Layout piece="02_chat_plans">
      <div className="chat">
        <div className="bubble me">{summary || '조건 없이 넘어왔어요'}</div>
        <p className="bot-tag">준비 도우미</p>
        <div className="bubble">
          조건에 맞춰 세 가지로 정리했어요. {recPlan.letter}안을 추천해요 — {recPlan.reasons.slice(0, 2).join(', ')}.
        </div>
        {hasDuplicatePlans(plans) && <DuplicateNotice />}
        {plans.map((p) => (
          <PlanCard key={p.key} plan={p} recommended={p.key === rec} selected={p.key === selectedPlan} onSelect={() => {
              selectPlan(p.key)
              celebrate()
            }}
          />
        ))}
        {chosen && (
          <>
            <div className="bubble me">{chosen.letter}안으로 할게요</div>
            <div className="bubble">
              좋아요. {chosen.letter}안 업체를 지도에서 보여 드릴게요. 계약·예약은 직접 확인하셔야 해요.
            </div>
            {next && (
              <button className="primary" onClick={() => navigate(next)}>
                지도 보기
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
