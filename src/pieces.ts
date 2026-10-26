// 조각 목록. 파일·경로 이름 규칙 = 단계_타입_기능 (예: 01_chat_checklist).
// 01~03 은 조원 의견(체크리스트 → 3가지 결과 → 지도)에서 나온 대화형·카드형 시안,
// 04 부터는 결혼 준비 도구(PRD 화면:오늘 할 일·전체 타임라인, 견적 비교, 결정 도우미, 예산, 본식 체크, 데이터)이다.
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
  '04': '오늘 할 일·타임라인',
  '05': '견적 비교',
  '06': '결정 도우미',
  '07': '예산',
  '08': '본식 체크',
  '09': '데이터',
  '10': '우리 장소·지도',
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
  { path: '04_chat_timeline', stage: '04', type: 'chat', feature: 'timeline', title: '대화로 챙기는 할 일', desc: '오늘 할 일 3개와 다음 단계를 말풍선으로 알려 준다' },
  { path: '04_card_timeline', stage: '04', type: 'card', feature: 'timeline', title: '오늘 할 일·전체 타임라인', desc: 'D-day 역산, 달력, 업무 상세 편집, 압축 계획, 선행 관계' },
  { path: '05_card_quotes', stage: '05', type: 'card', feature: 'quotes', title: '견적 비교', desc: '후보 최대 3곳을 같은 조건으로, 추가금 미확인은 최소금액' },
  { path: '06_card_decide', stage: '06', type: 'card', feature: 'decide', title: '결정 도우미', desc: '추천 1개·대안·이유, 보류와 재검토, 계약 확인' },
  { path: '07_card_budget', stage: '07', type: 'card', feature: 'budget', title: '예산', desc: '예상 비용·지급·잔금, 총예산 범위와 예비비' },
  { path: '08_card_dayof', stage: '08', type: 'card', feature: 'dayof', title: '본식 체크', desc: '마지막 주 할 일, 업체 최종 확인, 준비물, 당일 진행표' },
  { path: '10_card_places', stage: '10', type: 'card', feature: 'places', title: '우리 장소·지도', desc: '신부·신랑 집·회사, 양가 본가와 모든 업체 위치·거리 비교' },
  { path: '09_card_data', stage: '09', type: 'card', feature: 'data', title: '데이터', desc: 'JSON 내보내기·가져오기(중복 방지·병합 미리보기)' },
]

export function typesFor(stage: Stage): PieceType[] {
  return PIECES.filter((p) => p.stage === stage).map((p) => p.type)
}

// 고른 타입이 없는 단계는 있는 타입으로 간다
export function pathFor(stage: Stage, type: PieceType): string {
  return (PIECES.find((p) => p.stage === stage && p.type === type) ?? PIECES.find((p) => p.stage === stage))?.path ?? ''
}

export function nextStage(stage: Stage): Stage | null {
  return stage === '01' ? '02' : stage === '02' ? '03' : stage === '03' ? '04' : null
}

// 04 부터 아래쪽 탭으로 오간다
export const HUB: { stage: Stage; label: string; icon: string }[] = [
  { stage: '04', label: '할 일', icon: '✓' },
  { stage: '05', label: '견적', icon: '₩' },
  { stage: '06', label: '결정', icon: '♡' },
  { stage: '07', label: '예산', icon: '◔' },
  { stage: '10', label: '장소', icon: '📍' },
  { stage: '08', label: '본식', icon: '💍' },
  { stage: '09', label: '데이터', icon: '⇅' },
]
