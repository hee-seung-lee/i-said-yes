import { Layout } from '../components/Layout'
import { DistanceTable, LocationPicker, type MapPoint, PlacesMap } from '../components/Places'
import { CATEGORY_COLOR } from '../components/PlanMap'
import { MY_PLACES } from '../logic/geo'
import { buildPlans, categoryLabel, recommendedKey } from '../logic/recommend'
import { useStore } from '../store'

// 우리 장소(신부·신랑 집·회사, 양가 본가)를 대략 등록하고, 지금까지 나온 모든 장소를 한 지도에서 비교한다.
export default function CardPlaces10() {
  const places = useStore((s) => s.project.places)
  const setPlace = useStore((s) => s.setPlace)
  const quotes = useStore((s) => s.quotes)
  const tasks = useStore((s) => s.tasks)
  const contracts = useStore((s) => s.contracts)
  const answers = useStore((s) => s.answers)
  const selectedPlan = useStore((s) => s.selectedPlan)
  const checklistDone = useStore((s) => s.checklistDone)

  const plans = buildPlans(answers)
  const plan = checklistDone ? plans.find((p) => p.key === (selectedPlan ?? recommendedKey(plans))) : undefined
  const title = (id: string) => tasks.find((t) => t.id === id)?.title ?? id
  const quotePts: MapPoint[] = quotes
    .filter((q) => q.location)
    .map((q) => ({
      id: q.id,
      label: `${q.vendorName}${contracts[q.taskId]?.quoteId === q.id ? ' (계약)' : ''}`,
      group: title(q.taskId),
      lat: q.location!.lat,
      lng: q.location!.lng,
      color: contracts[q.taskId]?.quoteId === q.id ? '#8e4553' : '#b3955a',
    }))
  const planPts: MapPoint[] = (plan?.picks ?? []).map((v) => ({ id: `plan-${v.id}`, label: v.name, group: `${plan!.letter}안 ${categoryLabel(v.category)}`, lat: v.lat, lng: v.lng, color: CATEGORY_COLOR[v.category] }))
  const all = [...quotePts, ...planPts]
  const filled = MY_PLACES.filter((m) => places[m.key]).length

  return (
    <Layout piece="10_card_places" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
        <h3 style={{ margin: 0 }}>우리 장소</h3>
        <p className="sub" style={{ margin: 0 }}>
          대략적인 위치만 있어도 돼요. 예식장·드레스샵·스튜디오가 우리 동선에서 얼마나 먼지 모든 지도와 견적에서 함께 보여 줘요. ({filled}/{MY_PLACES.length})
        </p>
        {MY_PLACES.map((m) => (
          <div key={m.key} className="field">
            <span className="field-label">
              {m.icon} {m.label}
            </span>
            <LocationPicker id={`place-${m.key}`} value={places[m.key]} onChange={(p) => setPlace(m.key, p)} mine={places} placeholder="동 이름이나 회사 이름" />
          </div>
        ))}
      </section>

      <div className="section-title">
        <span className="num">Map</span>
        <h3>모든 장소 한눈에</h3>
      </div>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PlacesMap points={all} mine={places} height={320} />
        <div className="muted">
          🏠🏢👪 우리 장소 · ● 금색 견적 후보 · ● 진한 로즈 계약한 곳{planPts.length > 0 ? ' · 그 밖의 색은 3안 예시 업체' : ''}
        </div>
        {all.length === 0 && <div className="sub">견적 비교에서 후보마다 위치를 넣으면 여기에 모여요.</div>}
        <DistanceTable points={all.map((p) => ({ ...p, label: `${p.group} · ${p.label}` }))} mine={places} />
      </section>
    </Layout>
  )
}
