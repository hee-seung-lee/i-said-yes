// PRD 의 업무 모델과 초기 데이터(56개 원본 업무 + 제안 마일스톤 5개).
// 출처: docs/wedding-agent-flow.md "초기 데이터"·"원본 56개 업무의 상대 일정"·"데이터 모델 확장".
// 원본 Notion 의 날짜(originalStartDate/EndDate)는 일정 계산에 쓰지 않으므로 넣지 않는다.
// sourceUrl 은 조원 개인 Notion 이라 비워 둔다(가져오기 때 들어오면 중복 판정에 쓴다).

import type { Attachment } from '../logic/files'
import type { Place } from '../logic/geo'

export type TaskStatus = '시작 전' | '진행 중' | '완료'
export type AnchorKey = 'wedding' | 'familyMeeting' | 'shoot' | 'moveIn' | 'departure'
export type DecisionStatus = '미결정' | '비교 중' | '보류' | '선택함' | '계약 확인'
export type Owner = '신랑' | '신부' | '둘이' | '가족'

export interface ActionItem {
  id: string
  text: string
  done: boolean
}

// 문서·사진 첨부(링크 또는 이 브라우저에 저장한 파일)
export type DocLink = Attachment

export interface Dependency {
  taskId: string // 먼저 끝나야 하는 일
  type: 'hard' | 'soft' // hard 만 실행을 막는다
  confirmed: boolean // 사용자가 확인해야 활성화
}

export interface TaskRecord {
  id: string
  title: string
  categories: string[]
  status: TaskStatus
  budget: number | null // 업무 예산(원). null 과 0 을 구분한다
  sourceUrl: string | null
  origin: 'source' | 'proposed' | 'user'
  adopted: boolean // 제안 마일스톤은 채택해야 보인다. 원본·사용자 업무는 늘 true
  anchor: 'wedding' // 기본 기준은 본식
  startDaysBefore: number
  dueDaysBefore: number
  // 별도 기준일 override(PRD: 적용 기준과 그 기준의 일수를 업무에 저장). 그 기준일이 들어오면 이 값으로 계산한다
  override: { anchor: AnchorKey; startDaysBefore: number; dueDaysBefore: number } | null
  scheduleOrigin: 'proposed' | 'user'
  ownerIds: Owner[]
  requiredForWedding: boolean
  completionCriteria: string
  dependencies: Dependency[]
  fixedStart: string | null // 확정 예약 날짜. 기준일이 바뀌어도 유지
  fixedDue: string | null
  completedAt: string | null
  decisionStatus: DecisionStatus
  holdReason: string | null // 보류 시 막힌 기준 1개
  nextReviewDate: string | null
  excluded: boolean // 압축 계획에서 '제외'한 일
  // 노션 업무 페이지 템플릿(프로젝트 정보 / 액션 아이템 / 문서)
  memo: string
  actionItems: ActionItem[]
  docs: DocLink[]
  location?: Place | null // 이 일과 관련된 장소(상견례 장소, 임장한 집, 촬영지 등)
}

// 노션 '분류' 다중 선택의 10가지(노션 순서)
export const CATEGORIES = ['상견례', '웨딩 스케치', '홀 계약', '스드메 계약', '신혼집', '신혼여행', '본식 준비', '스튜디오 촬영', '드레스&예복', '청첩장 제작']

type Row = [id: string, category: string, title: string, start: number, due: number]

// PRD 표 그대로(제목 원문 유지)
const ROWS: Row[] = [
  ['T01', '상견례', '날짜 잡기', 330, 300],
  ['T02', '상견례', '장소 잡기', 330, 300],
  ['T03', '상견례', '양가 선물 정하기', 300, 280],
  ['T04', '웨딩 스케치', '날짜 후보 정하기', 365, 330],
  ['T05', '웨딩 스케치', '예산 대략 정하기', 365, 330],
  ['T06', '웨딩 스케치', '웨딩 전용 카드 발급', 330, 300],
  ['T07', '홀 계약', '예식장 날짜 전달 및 예산 받기', 330, 300],
  ['T08', '스드메 계약', '촬영 날짜 확정', 270, 240],
  ['T09', '스드메 계약', '드레스 계약', 210, 180],
  ['T10', '스드메 계약', '예복 계약', 210, 180],
  ['T11', '스드메 계약', '혼주 메이크업 예약', 180, 150],
  ['T12', '스드메 계약', '본식 헤어/메이크업 예약', 240, 180],
  ['T13', '스드메 계약', '웨딩링 계약', 240, 180],
  ['T14', '신혼집', '신혼집 방향 결정', 240, 180],
  ['T15', '신혼여행', '후보지 비교', 240, 210],
  ['T16', '본식 준비', '본식 스냅 예약', 240, 180],
  ['T17', '본식 준비', '본식 dvd 예약', 240, 180],
  ['T18', '본식 준비', '아이폰 스냅 예약', 180, 150],
  ['T19', '본식 준비', '뷔페 예약', 180, 150],
  ['T20', '본식 준비', '꽃장식 예약', 180, 150],
  ['T21', '본식 준비', '헬퍼 예약', 120, 90],
  ['T22', '스튜디오 촬영', '스냅 시안 및 소품 준비', 150, 130],
  ['T23', '드레스&예복', '드레스샵 투어', 240, 210],
  ['T24', '드레스&예복', '예복 투어', 240, 210],
  ['T25', '신혼집', '신혼집 임장하기', 180, 120],
  ['T26', '신혼집', '혼수 리스트 작성', 120, 90],
  ['T27', '신혼여행', '여행계획', 210, 180],
  ['T28', '신혼여행', '항공편 예약', 210, 180],
  ['T29', '신혼여행', '숙소 예약', 180, 150],
  ['T30', '청첩장 제작', '회의 및 제작', 100, 80],
  ['T31', '청첩장 제작', '청모 인원 짜보기', 100, 80],
  ['T32', '청첩장 제작', '청모 진행', 75, 21],
  ['T33', '신혼집', '혼수 구매', 60, 21],
  ['T34', '드레스&예복', '드레스 가봉', 42, 21],
  ['T35', '드레스&예복', '예복 가봉', 56, 28],
  ['T36', '본식 준비', '가방순이 섭외', 56, 32],
  ['T37', '본식 준비', '축의대 섭외', 56, 32],
  ['T38', '본식 준비', '반주자 섭외', 56, 32],
  ['T39', '신혼집', '신혼집 계약 및 이사준비', 120, 60],
  ['T40', '스드메 계약', '혼주 한복 맞추기', 100, 60],
  ['T41', '스드메 계약', '혼주 예복 구입', 100, 60],
  ['T42', '본식 준비', '부케 준비', 56, 21],
  ['T43', '본식 준비', '답례품 준비', 56, 21],
  ['T44', '본식 준비', '하객 리스트 작성 (최종 인원 확인)', 56, 14],
  ['T45', '본식 준비', '식순 준비', 56, 21],
  ['T46', '본식 준비', 'BGM 준비 (입장곡, 퇴장곡)', 32, 14],
  ['T47', '본식 준비', '모바일 청첩장 제작', 75, 56],
  ['T48', '본식 준비', '성혼선언문? 혼인서약서?', 32, 14],
  ['T49', '본식 준비', '포토테이블 상의', 42, 21],
  ['T50', '본식 준비', '식전영상 회의 및 제작', 56, 21],
  ['T51', '본식 준비', '식권 준비', 21, 7],
  ['T52', '본식 준비', '축의대 준비물 챙기기', 14, 3],
  ['T53', '본식 준비', '헬퍼비 정산봉투 준비', 7, 1],
  ['T54', '본식 준비', '주례비 정산봉투 준비', 7, 1],
  ['T55', '본식 준비', '혼주 한복 체크', 21, 7],
  ['T56', '본식 준비', '신랑 예복 체크', 21, 7],
]

// PRD 초기 데이터의 상태·예산(수용 기준: 시작 전 52 / 진행 중 3 / 완료 1, 예산 입력 1개 950,000원)
const SEED_STATUS: Record<string, TaskStatus> = { T04: '진행 중', T05: '진행 중', T13: '진행 중', T08: '완료' }
const SEED_BUDGET: Record<string, number> = { T08: 950000 }

// 별도 기준일로 계산하는 업무(PRD "별도 기준일과 순서")
const ANCHOR_OVERRIDE: Record<string, [AnchorKey, number, number]> = {
  T03: ['familyMeeting', 21, 7],
  T22: ['shoot', 30, 7],
  T33: ['moveIn', 60, 14],
  T28: ['departure', 210, 180],
  T29: ['departure', 180, 150],
}

// 신혼집·여행은 본식 완료를 막지 않는다
export const NOT_FOR_WEDDING = ['신혼집', '신혼여행']

function base(id: string, category: string, title: string, start: number, due: number): TaskRecord {
  return {
    id,
    title,
    categories: [category],
    status: SEED_STATUS[id] ?? '시작 전',
    budget: SEED_BUDGET[id] ?? null,
    sourceUrl: null,
    origin: 'source',
    adopted: true,
    anchor: 'wedding',
    override: null,
    startDaysBefore: start,
    dueDaysBefore: due,
    scheduleOrigin: 'proposed',
    ownerIds: [],
    requiredForWedding: !NOT_FOR_WEDDING.includes(category),
    completionCriteria: '',
    dependencies: [],
    fixedStart: null,
    fixedDue: null,
    completedAt: null,
    decisionStatus: '미결정',
    holdReason: null,
    nextReviewDate: null,
    excluded: false,
    memo: '',
    actionItems: [],
    docs: [],
    location: null,
  }
}

// 원본에 없는 제안 마일스톤(origin=proposed). 사용자가 채택해야 보인다.
const MILESTONES: Row[] = [
  ['M01', '스튜디오 촬영', '실제 촬영', 150, 120],
  ['M02', '스튜디오 촬영', '보정본 수령', 120, 90],
  ['M03', '본식 준비', '최종 업체 확인', 14, 7],
  ['M04', '본식 준비', '당일 진행표 만들기', 14, 3],
  ['M05', '본식 준비', '본식', 0, 0],
]

// 원본에 없지만 PRD 가 권하는 선행 관계. 모두 미확인(confirmed=false)으로 시작한다.
//  - 예약 확정은 본식 날짜·장소 확인(T07)이 먼저
//  - 사진 포함 제작물(포토테이블)만 보정본 수령(M02)에 의존. 청첩장은 사진 없이도 만들 수 있어 넣지 않는다
//  - 의상은 투어 → 계약 → 가봉
//  - 촬영 날짜 확정(T08)은 실제 촬영(M01)의 선행일 뿐, 완료를 자동으로 넘기지 않는다
const SUGGESTED: [task: string, prereq: string][] = [
  ['T08', 'T07'], ['T09', 'T07'], ['T10', 'T07'], ['T11', 'T07'], ['T12', 'T07'],
  ['T16', 'T07'], ['T17', 'T07'], ['T18', 'T07'], ['T19', 'T07'], ['T20', 'T07'], ['T21', 'T07'],
  ['T09', 'T23'], ['T10', 'T24'], ['T34', 'T09'], ['T35', 'T10'],
  ['M01', 'T08'], ['M02', 'M01'], ['T49', 'M02'],
  ['T51', 'T44'],
]

export function seedTasks(): TaskRecord[] {
  const tasks = ROWS.map(([id, c, title, s, d]) => base(id, c, title, s, d))
  for (const m of MILESTONES) {
    const r = base(...m)
    r.origin = 'proposed'
    r.adopted = false
    r.status = '시작 전'
    tasks.push(r)
  }
  for (const t of tasks) {
    const o = ANCHOR_OVERRIDE[t.id]
    if (o) t.override = { anchor: o[0], startDaysBefore: o[1], dueDaysBefore: o[2] }
    t.dependencies = SUGGESTED.filter(([id]) => id === t.id).map(([, prereq]) => ({ taskId: prereq, type: 'hard', confirmed: false }))
  }
  return tasks
}

export interface NewTaskInput {
  title: string
  categories: string[]
  startDaysBefore: number
  dueDaysBefore: number
  requiredForWedding: boolean
}

// 사용자가 더하는 업무(origin=user). 검증에 걸리면 이유를 돌려준다.
export function newUserTask(input: NewTaskInput, existing: TaskRecord[]): TaskRecord | string {
  const title = input.title.trim()
  if (!title) return '업무 이름을 넣어 주세요'
  if (!Number.isFinite(input.startDaysBefore) || !Number.isFinite(input.dueDaysBefore)) return '일정을 숫자로 넣어 주세요'
  if (input.startDaysBefore < input.dueDaysBefore) return '시작은 마감보다 앞(더 큰 D-숫자)이어야 해요'
  let n = existing.length + 1
  let id = `U${String(n).padStart(2, '0')}`
  while (existing.some((t) => t.id === id)) id = `U${String(++n).padStart(2, '0')}`
  const t = base(id, input.categories[0] ?? '본식 준비', title, input.startDaysBefore, input.dueDaysBefore)
  return { ...t, categories: input.categories.length ? input.categories : ['본식 준비'], origin: 'user', scheduleOrigin: 'user', requiredForWedding: input.requiredForWedding }
}

// 예전 저장본·가져온 데이터에 새 필드가 없으면 채운다
export function withDefaults(t: TaskRecord): TaskRecord {
  return { ...t, memo: t.memo ?? '', actionItems: t.actionItems ?? [], docs: t.docs ?? [], location: t.location ?? null, categories: t.categories?.length ? t.categories : ['본식 준비'] }
}

export const ANCHOR_LABEL: Record<AnchorKey, string> = {
  wedding: '본식',
  familyMeeting: '상견례',
  shoot: '촬영',
  moveIn: '입주',
  departure: '출국',
}

// 일정 묶음(마감 기준)
export const PHASES = [
  { id: 'p1', label: '1년~10개월 전', min: 280 },
  { id: 'p2', label: '9~6개월 전', min: 180 },
  { id: 'p3', label: '6~3개월 전', min: 90 },
  { id: 'p4', label: '3~1개월 전', min: 28 },
  { id: 'p5', label: '마지막 4주', min: 0 },
] as const

export type PhaseId = (typeof PHASES)[number]['id']

export function phaseOf(dueDaysBefore: number): PhaseId {
  return (PHASES.find((p) => dueDaysBefore >= p.min) ?? PHASES[PHASES.length - 1]).id
}
