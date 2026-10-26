import { categoryLabel, formatManwon, type Plan } from '../logic/recommend'

interface Props {
  plan: Plan
  recommended: boolean
  selected?: boolean
  detail?: boolean // 카드형은 업체·이유를 모두, 대화형은 요약만
  onSelect?: () => void
}

export function DuplicateNotice() {
  return <div className="muted">후보가 적어 같은 구성의 안이 있어요. 조건을 넓히면 안이 달라질 수 있어요.</div>
}

export function PlanCard({ plan, recommended, selected, detail, onSelect }: Props) {
  return (
    <div className={recommended || selected ? 'card rec' : 'card'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span className="plan-letter">{plan.letter}</span>
        <span className="plan-title grow">{plan.title}</span>
        {recommended && <span className="badge">추천</span>}
        {selected && <span className="badge">선택함</span>}
      </div>
      {detail ? (
        plan.picks.map((v) => (
          <div key={v.id} className="sub">
            {categoryLabel(v.category)} · {v.name} <span className="muted">{formatManwon(v.priceMin)}~</span>
          </div>
        ))
      ) : (
        <div className="sub">{plan.picks.map((v) => v.name.replace(' (예시)', '')).join(' + ')}</div>
      )}
      <div className="row">
        <span className="grow" style={{ fontSize: 14 }}>
          확인된 최소 {formatManwon(plan.totalMin)}~
        </span>
        {plan.extrasUnknown && <span className="muted">추가금 미확인 포함</span>}
      </div>
      {plan.conditions > 0 && (
        <div className="muted">
          조건 일치 {plan.matched}/{plan.conditions}
        </div>
      )}
      {detail && (
        <ul className="sub" style={{ margin: 0, paddingLeft: 18 }}>
          {plan.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {onSelect && (
        <button className={recommended ? 'primary' : ''} onClick={onSelect}>
          {plan.letter}안으로 할게요
        </button>
      )}
    </div>
  )
}
