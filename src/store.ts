// 조각(페이지) 사이를 잇는 공유 상태. localStorage 에 스키마 버전을 붙여 저장한다(PRD).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Answers } from './data/questions'
import { type AnchorKey, type TaskRecord, type TaskStatus, seedTasks, withDefaults } from './data/tasks'
import type { PlanKey } from './logic/recommend'
import type { Contract, Payment, Quote } from './logic/money'
import { type Anchors, EMPTY_ANCHORS, todaySeoul } from './logic/schedule'
import { EMPTY_PLACES, type MyPlaceKey, type MyPlaces, type Place } from './logic/geo'

export type Stage = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
export type PieceType = 'chat' | 'card'

export interface Project {
  anchors: Anchors
  totalBudget: number | null // 원. null = 미정
  reserveBudget: number | null
  budgetScope: { house: boolean | null; goods: boolean | null; trip: boolean | null } // 총예산에 신혼집·혼수·여행 포함 여부
  places: MyPlaces // 우리 장소(신부·신랑 집·회사, 양가 본가) 대략 위치
}

export interface DayOf {
  ceremonyTime: string | null // 'HH:MM'
  checked: Record<string, boolean>
  vendorCheck: Record<string, boolean> // 계약 업체 최종 확인
}

interface State {
  answers: Answers
  progress: number
  checklistDone: boolean
  selectedPlan: PlanKey | null
  flow: Record<Stage, PieceType>
  tasks: TaskRecord[]
  project: Project
  quotes: Quote[]
  chosen: Record<string, string> // taskId → 고른 견적 id
  contracts: Record<string, Contract>
  dayof: DayOf

  setAnswer: (key: string, values: string[]) => void
  setProgress: (n: number) => void
  finishChecklist: () => void
  selectPlan: (key: PlanKey) => void
  setFlow: (stage: Stage, type: PieceType) => void
  reset: () => void

  setAnchor: (key: AnchorKey, value: string | null) => void
  setProject: (patch: Partial<Omit<Project, 'anchors'>>) => void
  setPlace: (key: MyPlaceKey, place: Place | null) => void
  updateTask: (id: string, patch: Partial<TaskRecord>) => void
  setStatus: (id: string, status: TaskStatus) => void
  replaceTasks: (tasks: TaskRecord[]) => void
  addTask: (t: TaskRecord) => void
  deleteTask: (id: string) => void

  upsertQuote: (q: Quote) => void
  removeQuote: (id: string) => void
  choose: (taskId: string, quoteId: string | null) => void
  setContract: (taskId: string, c: Contract | null) => void
  addPayment: (taskId: string, p: Payment) => void
  removePayment: (taskId: string, paymentId: string) => void

  setDayOf: (patch: Partial<DayOf>) => void
  importAll: (data: Partial<PersistedShape>) => void
}

export type PersistedShape = Pick<State, 'answers' | 'progress' | 'checklistDone' | 'selectedPlan' | 'flow' | 'tasks' | 'project' | 'quotes' | 'chosen' | 'contracts' | 'dayof'>

// 2: 체크리스트 20문항으로 바뀜(1 의 답은 버린다)
// 3: 일정(anchors·taskStatus) 추가
// 4: PRD 업무 모델(tasks·project·quotes·contracts·dayof). 3 의 상태·기준일은 옮긴다
// 5: 업무 메모·액션 아이템·문서 링크, 사용자 업무 추가·삭제. 4 의 업무에 빈 값을 채운다
// 6: 우리 장소(project.places), 견적 위치·증빙 파일
export const SCHEMA_VERSION = 6

const defaultFlow: Record<Stage, PieceType> = { '01': 'card', '02': 'card', '03': 'card', '04': 'card', '05': 'card', '06': 'card', '07': 'card', '08': 'card', '09': 'card', '10': 'card' }
const freshProject = (): Project => ({ anchors: { ...EMPTY_ANCHORS }, totalBudget: null, reserveBudget: null, budgetScope: { house: null, goods: null, trip: null }, places: { ...EMPTY_PLACES } })
const freshDayOf = (): DayOf => ({ ceremonyTime: null, checked: {}, vendorCheck: {} })
const fresh = () => ({
  answers: {},
  progress: 0,
  checklistDone: false,
  selectedPlan: null,
  tasks: seedTasks(),
  project: freshProject(),
  quotes: [],
  chosen: {},
  contracts: {},
  dayof: freshDayOf(),
})

const mapTask = (tasks: TaskRecord[], id: string, f: (t: TaskRecord) => TaskRecord) => tasks.map((t) => (t.id === id ? f(t) : t))

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...fresh(),
      flow: defaultFlow,
      setAnswer: (key, values) => set((s) => ({ answers: { ...s.answers, [key]: values }, selectedPlan: null })),
      setProgress: (n) => set((s) => ({ progress: Math.max(s.progress, n) })),
      finishChecklist: () => set({ checklistDone: true }),
      selectPlan: (key) => set({ selectedPlan: key }),
      setFlow: (stage, type) => set((s) => ({ flow: { ...s.flow, [stage]: type } })),
      reset: () => set(fresh()),

      setAnchor: (key, value) => set((s) => ({ project: { ...s.project, anchors: { ...s.project.anchors, [key]: value } } })),
      setProject: (patch) => set((s) => ({ project: { ...s.project, ...patch } })),
      setPlace: (key, place) => set((s) => ({ project: { ...s.project, places: { ...s.project.places, [key]: place } } })),
      updateTask: (id, patch) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, ...patch })) })),
      // 완료 시각은 완료로 바꿀 때 남기고, 되돌리면 지운다
      setStatus: (id, status) =>
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, status, completedAt: status === '완료' ? (t.completedAt ?? todaySeoul()) : null })) })),
      replaceTasks: (tasks) => set({ tasks: tasks.map(withDefaults) }),
      addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
      // 지운 업무를 기다리던 관계와 그 업무의 견적·계약도 함께 지운다
      deleteTask: (id) =>
        set((s) => {
          const quoteIds = new Set(s.quotes.filter((q) => q.taskId === id).map((q) => q.id))
          const contracts = { ...s.contracts }
          delete contracts[id]
          const chosen = { ...s.chosen }
          delete chosen[id]
          return {
            tasks: s.tasks.filter((t) => t.id !== id).map((t) => ({ ...t, dependencies: t.dependencies.filter((d) => d.taskId !== id) })),
            quotes: s.quotes.filter((q) => !quoteIds.has(q.id)),
            chosen,
            contracts,
          }
        }),

      upsertQuote: (q) => set((s) => ({ quotes: s.quotes.some((x) => x.id === q.id) ? s.quotes.map((x) => (x.id === q.id ? q : x)) : [...s.quotes, q] })),
      removeQuote: (id) =>
        set((s) => {
          const chosen = Object.fromEntries(Object.entries(s.chosen).filter(([, qid]) => qid !== id))
          return { quotes: s.quotes.filter((q) => q.id !== id), chosen }
        }),
      choose: (taskId, quoteId) =>
        set((s) => {
          const chosen = { ...s.chosen }
          if (quoteId) chosen[taskId] = quoteId
          else delete chosen[taskId]
          return { chosen }
        }),
      setContract: (taskId, c) =>
        set((s) => {
          const contracts = { ...s.contracts }
          if (c) contracts[taskId] = c
          else delete contracts[taskId]
          return { contracts }
        }),
      addPayment: (taskId, p) =>
        set((s) => {
          const c = s.contracts[taskId]
          return c ? { contracts: { ...s.contracts, [taskId]: { ...c, payments: [...c.payments, p] } } } : {}
        }),
      removePayment: (taskId, paymentId) =>
        set((s) => {
          const c = s.contracts[taskId]
          return c ? { contracts: { ...s.contracts, [taskId]: { ...c, payments: c.payments.filter((p) => p.id !== paymentId) } } } : {}
        }),

      setDayOf: (patch) => set((s) => ({ dayof: { ...s.dayof, ...patch } })),
      importAll: (data) => set((s) => ({ ...s, ...data })),
    }),
    {
      name: 'i-said-yes',
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>
        if (version < 2) return { ...fresh(), flow: defaultFlow } as unknown as State
        const out: Record<string, unknown> = { ...fresh(), ...s, flow: { ...defaultFlow, ...(s.flow as object) } }
        if (version < 4) {
          // 3 의 taskStatus·anchors 를 새 모델로 옮긴다
          const old = (s.anchors ?? {}) as Record<string, string | null>
          const statuses = (s.taskStatus ?? {}) as Record<string, TaskStatus>
          out.tasks = seedTasks().map((t) => (statuses[t.id] ? { ...t, status: statuses[t.id] } : t))
          out.project = {
            ...freshProject(),
            anchors: {
              wedding: old.weddingDate ?? null,
              familyMeeting: old.familyMeetingDate ?? null,
              shoot: old.shootDate ?? null,
              moveIn: old.moveInDate ?? null,
              departure: old.departureDate ?? null,
            },
          }
          delete out.anchors
          delete out.taskStatus
        }
        if (version < 5) {
          out.tasks = (out.tasks as TaskRecord[]).map((t) => withDefaults(t.id === 'M05' ? { ...t, categories: ['본식 준비'] } : t))
        }
        if (version < 6) {
          const p = out.project as Project
          out.project = { ...p, places: { ...EMPTY_PLACES, ...(p.places ?? {}) } }
        }
        return out as unknown as State
      },
    },
  ),
)

export function persistedShape(s: State): PersistedShape {
  const { answers, progress, checklistDone, selectedPlan, flow, tasks, project, quotes, chosen, contracts, dayof } = s
  return { answers, progress, checklistDone, selectedPlan, flow, tasks, project, quotes, chosen, contracts, dayof }
}
