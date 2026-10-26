import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useFirstPath } from '../components/flow'
import { PIECES, STAGE_LABEL, TYPE_LABEL } from '../pieces'
import { type PieceType, type Stage, useStore } from '../store'

const STAGES: Stage[] = ['01', '02', '03']
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
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b style={{ fontWeight: 600 }}>조립해서 돌려 보기</b>
        {STAGES.map((st) => (
          <div key={st} className="row" style={{ flexWrap: 'wrap' }}>
            <span style={{ width: 130 }}>
              {st} {STAGE_LABEL[st]}
            </span>
            {TYPES.map((t) => (
              <span key={t} className={flow[st] === t ? 'chip on' : 'chip'} onClick={() => setFlow(st, t)}>
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>
        ))}
        <div className="mono muted">
          {STAGES.map((st) => `${st}_${flow[st]}`).join(' → ')}
        </div>
        <div className="row">
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
          <h3 style={{ margin: '8px 0' }}>
            {st} {STAGE_LABEL[st]}
          </h3>
          <div className="grid-pieces">
            {PIECES.filter((p) => p.stage === st).map((p) => (
              <Link key={p.path} to={`/${p.path}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="mono" style={{ color: 'var(--accent)' }}>
                  {p.path}
                </div>
                <div style={{ fontWeight: 600, margin: '4px 0' }}>
                  {TYPE_LABEL[p.type]} · {p.title}
                </div>
                <div className="sub">{p.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Layout>
  )
}
