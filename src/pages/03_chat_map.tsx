import { useMemo } from 'react'
import { Layout } from '../components/Layout'
import { Link, useNavigate } from 'react-router-dom'
import { NeedAnswers, NeedPlan, useAnswersReady, useNextPath } from '../components/flow'
import { CATEGORY_COLOR, Legend } from '../components/PlanMap'
import { DistanceTable, PlacesMap } from '../components/Places'
import { buildPlans, categoryLabel, distanceKm } from '../logic/recommend'
import { inquiryDraft, nextActionFor } from '../logic/nextActions'
import { useStore } from '../store'

export default function ChatMap03() {
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const ready = useAnswersReady()
  const plan = useMemo(() => buildPlans(answers).find((p) => p.key === selectedPlan), [answers, selectedPlan])
  const next = useNextPath('03')
  const mine = useStore((s) => s.project.places)
  const navigate = useNavigate()

  if (!ready)
    return (
      <Layout piece="03_chat_map">
        <NeedAnswers />
      </Layout>
    )
  if (!plan)
    return (
      <Layout piece="03_chat_map">
        <NeedPlan />
      </Layout>
    )

  const local = plan.picks.filter((v) => v.category !== 'snap')
  const snap = plan.picks.find((v) => v.category === 'snap')
  const base = local[0]
  const unknownExtras = plan.picks.filter((v) => !v.extrasConfirmed)

  return (
    <Layout piece="03_chat_map">
      <div className="chat">
        <p className="bot-tag">준비 도우미</p>
        <div className="bubble">{plan.letter}안 업체 위치예요.</div>
        <PlacesMap points={local.map((v) => ({ id: v.id, label: v.name, group: categoryLabel(v.category), lat: v.lat, lng: v.lng, color: CATEGORY_COLOR[v.category] }))} mine={mine} />
        <Legend vendors={local} />
        {base && local.length > 1 && (
          <div className="bubble">
            {local
              .slice(1)
              .map((v) => `${categoryLabel(base.category)} → ${categoryLabel(v.category)} 직선 약 ${distanceKm(base, v).toFixed(1)}km`)
              .join(', ')}
            예요. 실제 이동 시간은 길찾기로 확인해 주세요.
          </div>
        )}
        {Object.values(mine).some(Boolean) ? (
          <div className="bubble">
            우리 장소까지 거리예요.
            <DistanceTable points={local.map((v) => ({ id: v.id, label: `${categoryLabel(v.category)} · ${v.name.replace(' (예시)', '')}`, lat: v.lat, lng: v.lng, color: CATEGORY_COLOR[v.category] }))} mine={mine} />
          </div>
        ) : (
          <div className="bubble">
            신부·신랑 집과 회사, 양가 본가를 <Link to="/10_card_places">우리 장소</Link>에 넣어 두면 업체마다 얼마나 먼지 알려 드려요.
          </div>
        )}
        {snap && <div className="bubble">별도 촬영({snap.name})은 예식 지역과 떨어져 있어 지도에서 뺐어요.</div>}
        <div className="bubble">
          다음에 할 일이에요.
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {plan.picks.map((v) => {
              const a = nextActionFor(v)
              return (
                <li key={v.id}>
                  {a.task} <span className="muted">({a.when})</span>
                </li>
              )
            })}
          </ul>
        </div>
        {unknownExtras.length > 0 && (
          <>
            <div className="bubble">추가금이 확인 안 된 곳이 있어요. 이렇게 물어보시면 돼요.</div>
            <pre className="bubble me" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {inquiryDraft(unknownExtras[0])}
            </pre>
          </>
        )}
        {next && (
          <>
            <div className="bubble">이제 본식까지 무엇을 언제 해야 하는지 정리해 드릴게요.</div>
            <button className="primary" onClick={() => navigate(next)}>
              일정·할 일 보기
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
