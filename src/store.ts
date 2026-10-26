// 조각(페이지) 사이를 잇는 공유 상태. 어떤 타입 조합으로 이어 붙여도 같은 답변·선택을 본다.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Answers } from './data/questions'
import type { TaskStatus } from './data/tasks'
import type { PlanKey } from './logic/recommend'
import { type Anchors, EMPTY_ANCHORS } from './logic/schedule'

export type Stage = '01' | '02' | '03' | '04'
export type PieceType = 'chat' | 'card'

interface State {
  answers: Answers
  progress: number // 체크리스트에서 지나간 문항 수(대화형·카드형 공유)
  checklistDone: boolean // 끝까지 넘겼는지. 모든 문항이 선택 입력이라 답 개수로 판단하지 않는다.
  selectedPlan: PlanKey | null
  anchors: Anchors // 본식일과 별도 기준일
  taskStatus: Record<string, TaskStatus>
  flow: Record<Stage, PieceType> // 단계별로 어느 타입 조각을 이어 붙일지
  setAnswer: (key: string, values: string[]) => void
  setProgress: (n: number) => void
  finishChecklist: () => void
  selectPlan: (key: PlanKey) => void
  setAnchor: (key: keyof Anchors, value: string | null) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  setFlow: (stage: Stage, type: PieceType) => void
  reset: () => void
}

// 2: 체크리스트 20문항(필드 단위 키)으로 바뀜. 1 의 답은 버린다.
// 3: 일정(anchors·taskStatus)과 04 단계 추가. 2 의 답은 그대로 둔다.
export const SCHEMA_VERSION = 3

const fresh = { answers: {}, progress: 0, checklistDone: false, selectedPlan: null, anchors: EMPTY_ANCHORS, taskStatus: {} }
const defaultFlow: Record<Stage, PieceType> = { '01': 'card', '02': 'card', '03': 'card', '04': 'card' }

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...fresh,
      flow: defaultFlow,
      setAnswer: (key, values) => set((s) => ({ answers: { ...s.answers, [key]: values }, selectedPlan: null })),
      setProgress: (n) => set((s) => ({ progress: Math.max(s.progress, n) })),
      finishChecklist: () => set({ checklistDone: true }),
      selectPlan: (key) => set({ selectedPlan: key }),
      setAnchor: (key, value) => set((s) => ({ anchors: { ...s.anchors, [key]: value } })),
      setTaskStatus: (id, status) => set((s) => ({ taskStatus: { ...s.taskStatus, [id]: status } })),
      setFlow: (stage, type) => set((s) => ({ flow: { ...s.flow, [stage]: type } })),
      reset: () => set(fresh),
    }),
    {
      name: 'i-said-yes',
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => {
        const s = persisted as Partial<State>
        if (version < 2) return { ...s, ...fresh, flow: defaultFlow } as State
        return { ...s, anchors: s.anchors ?? EMPTY_ANCHORS, taskStatus: s.taskStatus ?? {}, flow: { ...defaultFlow, ...s.flow } } as State
      },
    },
  ),
)
