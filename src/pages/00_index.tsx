import { Link, useNavigate } from 'react-router-dom'
import { BRAND } from '../brand'
import { Layout } from '../components/Layout'
import { FloralArch, FloralDivider } from '../components/Ornaments'
import { useFirstPath } from '../components/flow'
import { celebrateFrom } from '../effects/petals'
import { PIECES, STAGE_LABEL, TYPE_LABEL, pathFor } from '../pieces'
import { type PieceType, type Stage, useStore } from '../store'

const STAGES: Stage[] = ['01', '02', '03', '04']
const TOOL_STAGES: Stage[] = ['05', '06', '07', '10', '08', '09']
const TYPES: PieceType[] = ['chat', 'card']

// 조각 목록 + 조립기. 단계마다 타입을 골라 이어 붙인 흐름을 바로 돌려 본다.
export default function Index00() {
  const flow = useStore((s) => s.flow)
  const setFlow = useStore((s) => s.setFlow)
  const reset = useStore((s) => s.reset)
  const first = useFirstPath()
  const navigate = useNavigate()

  return (
    <Layout wide>
      <section className="hero">
        <FloralArch width={230} />
        <span className="badge">{BRAND.team}</span>
        <p className="hero-en">{BRAND.en}</p>
        <h1>{BRAND.name}</h1>
        <span className="divider">
          <FloralDivider />
        </span>
        <p className="tagline">{BRAND.tagline}</p>
        <p className="sub">{BRAND.promise}</p>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="primary"
            onClick={(e) => {
              celebrateFrom(e.currentTarget)
              navigate(first)
            }}
          >
            준비 시작하기
          </button>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>조각 이어 붙여 보기</h3>
        <p className="sub" style={{ margin: 0 }}>
          단계마다 대화형과 카드형 중 하나를 고르면 그 조합으로 처음부터 끝까지 이어져요.
        </p>
        {STAGES.map((st) => (
          <div key={st} className="row" style={{ flexWrap: 'wrap' }}>
            <span style={{ width: 128, fontFamily: 'var(--serif)' }}>
              <span className="mono" style={{ color: 'var(--gold)', marginRight: 6 }}>
                {st}
              </span>
              {STAGE_LABEL[st]}
            </span>
            {TYPES.map((t) => (
              <span key={t} className={flow[st] === t ? 'chip on' : 'chip'} onClick={() => setFlow(st, t)}>
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>
        ))}
        <div className="mono muted">{STAGES.map((st) => `${st}_${flow[st]}`).join('  →  ')}</div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="primary" onClick={() => navigate(first)}>
            이 조합으로 시작
          </button>
          <button
            onClick={() => {
              reset()
              navigate(first)
            }}
          >
            답변 지우고 처음부터
          </button>
        </div>
      </section>

      {STAGES.map((st) => (
        <section key={st}>
          <div className="section-title">
            <span className="num">{st}</span>
            <h3>{STAGE_LABEL[st]}</h3>
          </div>
          <div className="grid-pieces">
            {PIECES.filter((p) => p.stage === st).map((p) => (
              <Link key={p.path} to={`/${p.path}`} className="card piece-card">
                <div className="mono" style={{ color: 'var(--gold)' }}>
                  {p.path}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, margin: '6px 0 4px' }}>
                  {TYPE_LABEL[p.type]} · {p.title}
                </div>
                <div className="sub">{p.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="section-title">
        <span className="num">Tools</span>
        <h3>결혼 준비 도구</h3>
      </div>
      <p className="sub" style={{ margin: 0 }}>
        견적부터 본식 날까지 챙기는 도구예요. 04 부터는 아래쪽 탭으로 오가요.
      </p>
      <div className="grid-pieces">
        {TOOL_STAGES.map((st) => {
          const p = PIECES.find((x) => x.path === pathFor(st, 'card'))!
          return (
            <Link key={p.path} to={`/${p.path}`} className="card piece-card">
              <div className="mono" style={{ color: 'var(--gold)' }}>
                {p.path}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, margin: '6px 0 4px' }}>{p.title}</div>
              <div className="sub">{p.desc}</div>
            </Link>
          )
        })}
      </div>
    </Layout>
  )
}
