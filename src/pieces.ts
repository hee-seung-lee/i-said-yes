// 조각 목록. 파일·경로 이름 규칙 = 단계_타입_기능 (예: 01_chat_checklist).
// 새 조각을 만들면 여기에 한 줄 추가하고 App.tsx 라우트에 연결한다.
import type { PieceType, Stage } from './store'

export interface Piece {
  path: string
  stage: Stage
  type: PieceType
  feature: string
  title: string
  desc: string
}

export const STAGE_LABEL: Record<Stage, string> = {
  '01': '사전 체크리스트',
  '02': '결과 3안 비교',
  '03': '지도',
}

export const TYPE_LABEL: Record<PieceType, string> = {
  chat: '대화형',
  card: '카드형',
}

export const PIECES: Piece[] = [
  { path: '01_chat_checklist', stage: '01', type: 'chat', feature: 'checklist', title: '대화로 묻는 체크리스트', desc: '질문을 말풍선으로 하나씩 묻고 칩으로 답한다' },
  { path: '01_card_checklist', stage: '01', type: 'card', feature: 'checklist', title: '카드 넘기는 체크리스트', desc: '질문 하나가 카드 한 장, 타일을 골라 넘긴다' },
  { path: '02_chat_plans', stage: '02', type: 'chat', feature: 'plans', title: '대화 속 3안 카드', desc: '정리된 3안을 말풍선 안 카드로 보여 주고 고른다' },
  { path: '02_card_plans', stage: '02', type: 'card', feature: 'plans', title: '넘겨 보는 3안 카드', desc: 'A·B·C 탭과 스와이프로 한 안씩 크게 본다' },
  { path: '03_chat_map', stage: '03', type: 'chat', feature: 'map', title: '대화 속 지도', desc: '고른 안의 업체 위치와 다음 할 일을 말풍선으로' },
  { path: '03_card_map', stage: '03', type: 'card', feature: 'map', title: '지도 + 바텀시트', desc: '지도를 크게, 업체 목록은 아래 시트로' },
]

export function pathFor(stage: Stage, type: PieceType): string {
  return PIECES.find((p) => p.stage === stage && p.type === type)?.path ?? ''
}

export function nextStage(stage: Stage): Stage | null {
  return stage === '01' ? '02' : stage === '02' ? '03' : null
}
