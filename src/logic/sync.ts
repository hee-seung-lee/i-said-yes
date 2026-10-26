// 체크리스트 답 → 일정 업무 반영. 사용자가 고른 값만 옮기고, 답을 지워도 일정은 되돌리지 않는다.
import { type Answers, get } from '../data/questions'
import type { TaskRecord } from '../data/tasks'
import { minusDays } from './schedule'

export const PHOTO_RECEIPT_ID = 'M02' // 제안 마일스톤 '보정본 수령'

// 11번 '수령 희망일' → 보정본 수령 일정. 날짜가 있으면 그 날짜(확정)로, 아니면 '본식 N일 전'으로.
// 수령 30일 전부터 챙기도록 시작을 잡는다. 답이 없거나 예전 글자 답이면 바꾸지 않는다.
export function photoReceiptPatch(answers: Answers): Partial<TaskRecord> | null {
  const date = get(answers, 'q11.dueDate')[0]
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return { adopted: true, fixedDue: date, fixedStart: minusDays(date, 30) }
  const n = Number(get(answers, 'q11.due')[0])
  if (Number.isFinite(n) && n > 0) return { adopted: true, fixedDue: null, fixedStart: null, dueDaysBefore: n, startDaysBefore: n + 30, scheduleOrigin: 'user' }
  return null
}

export const SYNC_KEYS = ['q11.due', 'q11.dueDate']
