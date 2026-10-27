import { DdayRun } from '../components/DdayRun'
import { Layout } from '../components/Layout'
import { TaskRow, useTodos } from '../components/Timeline'
import { fmt } from '../logic/money'
import { useStore } from '../store'

// 본식 당일 준비물(일반적인 목록. 필요 없는 건 체크하지 않으면 된다)
const PACKING: { group: string; items: string[] }[] = [
  { group: '축의대', items: ['방명록·펜', '축의금 봉투·정리 가방', '식권', '축의대 안내문'] },
  { group: '정산', items: ['헬퍼비 정산봉투', '주례비(또는 사회자) 봉투', '반주자·축가 사례 봉투', '잔금 계좌·영수증'] },
  { group: '신부', items: ['드레스 속옷·보정속옷', '구두·여분 스타킹', '부케', '비상 키트(밴드·옷핀·실)'] },
  { group: '신랑', items: ['예복·셔츠·넥타이', '구두·양말', '반지(예물함)', '성혼선언문·혼인서약서 출력본'] },
  { group: '진행', items: ['식순표', 'BGM 파일(입장·퇴장) 전달', '식전영상 파일 전달', '포토테이블 사진'] },
]

// 당일 진행표: 본식 시작 기준 상대 시각(분). 사용자가 시각만 넣으면 계산된다.
const TIMELINE: [number, string][] = [
  [-300, '신부 헤어·메이크업 시작'],
  [-180, '신랑·혼주 헤어·메이크업'],
  [-120, '식장 도착, 업체 최종 확인'],
  [-90, '신부대기실 입장, 스냅 촬영'],
  [-30, '하객 맞이, 축의대 운영 시작'],
  [0, '본식 시작'],
  [40, '원판 사진'],
  [60, '폐백·식사'],
  [150, '정산·짐 정리'],
]

function addMin(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const t = (((h * 60 + m + min) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// PRD 화면: 본식 체크. 마지막 주 할 일·업체 최종 확인·준비물·당일 진행표
export default function CardDayOf08() {
  const { items, today, anchors } = useTodos()
  const dayof = useStore((s) => s.dayof)
  const setDayOf = useStore((s) => s.setDayOf)
  const contracts = useStore((s) => s.contracts)
  const quotes = useStore((s) => s.quotes)
  const tasks = useStore((s) => s.tasks)

  const lastWeek = items.filter((i) => !i.task.excluded && i.r.dueDays <= 7 && i.r.anchorLabel === '본식').sort((a, b) => b.r.dueDays - a.r.dueDays)
  const vendors = Object.values(contracts).map((c) => ({
    c,
    task: tasks.find((t) => t.id === c.taskId),
    name: quotes.find((q) => q.id === c.quoteId)?.vendorName ?? '업체',
  }))
  // 연달아 눌러도 앞 선택을 잃지 않게 저장소의 최신 값으로 뒤집는다
  const toggle = (key: string) => {
    const c = useStore.getState().dayof.checked
    setDayOf({ checked: { ...c, [key]: !c[key] } })
  }
  const toggleVendor = (id: string) => {
    const v = useStore.getState().dayof.vendorCheck
    setDayOf({ vendorCheck: { ...v, [id]: !v[id] } })
  }
  const packDone = PACKING.flatMap((g) => g.items).filter((i) => dayof.checked[i]).length
  const packTotal = PACKING.flatMap((g) => g.items).length

  return (
    <Layout piece="08_card_dayof" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <h3 style={{ margin: 0 }}>본식 체크</h3>
        <DdayRun wedding={anchors.wedding} ceremonyTime={dayof.ceremonyTime} today={today} />
      </section>

      <div className="section-title">
        <span className="num">D-7</span>
        <h3>마지막 주 할 일</h3>
      </div>
      <div className="card task-list">
        {lastWeek.map((i) => (
          <TaskRow key={i.task.id} item={i} />
        ))}
      </div>

      <div className="section-title">
        <span className="num">Vendors</span>
        <h3>업체 최종 확인</h3>
      </div>
      <div className="card task-list">
        {vendors.length === 0 && <div className="muted" style={{ padding: 12 }}>계약 확인한 업체가 아직 없어요. 결정 도우미에서 계약을 확인하면 여기에 모여요.</div>}
        {vendors.map(({ c, task, name }) => (
          <label key={c.taskId} className="dep-row check">
            <input type="checkbox" checked={!!dayof.vendorCheck[c.taskId]} onChange={() => toggleVendor(c.taskId)} />
            <span className="grow">
              {task?.title} · {name}
              <span className="muted"> · 도착 시각·담당자 연락처·잔금 {fmt(c.agreedTotal - c.payments.reduce((s, p) => s + p.amount, 0))} 확인</span>
            </span>
          </label>
        ))}
      </div>

      <div className="section-title">
        <span className="num">Bag</span>
        <h3 className="grow">준비물</h3>
        <span className="sub">
          {packDone}/{packTotal}
        </span>
      </div>
      <div className="card pack-grid">
        {PACKING.map((g) => (
          <div key={g.group}>
            <b className="sub">{g.group}</b>
            {g.items.map((it) => (
              <label key={it} className="dep-row check">
                <input type="checkbox" checked={!!dayof.checked[it]} onChange={() => toggle(it)} />
                <span className={dayof.checked[it] ? 'is-checked' : ''}>{it}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="section-title">
        <span className="num">Day</span>
        <h3>당일 진행표</h3>
      </div>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="field">
          <span className="field-label">본식 시작 시각</span>
          <input id="ceremony-time" type="time" value={dayof.ceremonyTime ?? ''} onChange={(e) => setDayOf({ ceremonyTime: e.target.value || null })} />
        </label>
        <ol className="dayline">
          {TIMELINE.map(([min, label]) => (
            <li key={label} className={min === 0 ? 'main' : ''}>
              <span className="time">{dayof.ceremonyTime ? addMin(dayof.ceremonyTime, min) : min === 0 ? '본식' : `${min > 0 ? '+' : ''}${min}분`}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <span className="muted">예식장·업체 안내 시간이 다르면 그쪽을 따르세요.</span>
      </section>
    </Layout>
  )
}
