import { Link } from 'react-router-dom'
import { pathFor, nextStage } from '../pieces'
import { type Stage, useStore } from '../store'

// 조립 설정(store.flow)에 따라 다음 단계 조각 경로를 돌려준다.
export function useNextPath(stage: Stage): string | null {
  const flow = useStore((s) => s.flow)
  const next = nextStage(stage)
  return next ? `/${pathFor(next, flow[next])}` : null
}

export function useFirstPath(): string {
  const flow = useStore((s) => s.flow)
  return `/${pathFor('01', flow['01'])}`
}

// 앞 단계 입력이 없을 때 보여 줄 안내.
export function NeedAnswers() {
  const first = useFirstPath()
  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>사전 체크리스트를 먼저 채워 주세요.</p>
      <Link to={first}>체크리스트로 가기</Link>
    </div>
  )
}

export function NeedPlan() {
  const flow = useStore((s) => s.flow)
  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>3안 중 하나를 먼저 골라 주세요.</p>
      <Link to={`/${pathFor('02', flow['02'])}`}>3안 비교로 가기</Link>
    </div>
  )
}

export function useAnswersReady(): boolean {
  return useStore((s) => s.checklistDone)
}
