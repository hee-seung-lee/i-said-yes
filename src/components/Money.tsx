// 금액 입력·업무 고르기 등 05~07 화면 공용 부품
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TaskRecord } from '../data/tasks'
import { needsPurchase } from '../logic/decide'
import { toMan, toWon } from '../logic/money'
import { useStore } from '../store'

// 만 원으로 입력받아 원으로 저장. 비우면 null(모름), 0 은 0원.
export function ManInput({ id, value, onChange, placeholder }: { id: string; value: number | null; onChange: (won: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value === null ? '' : String(toMan(value)))
  // 밖에서 값이 바뀌었을 때만(체크리스트 값 가져오기 등) 글자를 맞춘다. 입력 중에는 그대로 둔다.
  useEffect(() => {
    const typed = text === '' ? null : toWon(Number(text))
    if (typed !== value) setText(value === null ? '' : String(toMan(value)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <span className="row man-input">
      <input
        id={id}
        type="number"
        step="0.1"
        min={0}
        inputMode="decimal"
        value={text}
        placeholder={placeholder ?? '모름'}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value === '' ? null : toWon(Number(e.target.value)))
        }}
      />
      <span className="sub">만 원</span>
    </span>
  )
}

// 구매·예약 업무 고르기. 주소의 ?task= 와 묶인다.
export function usePurchaseTask(): [TaskRecord[], TaskRecord | undefined, (id: string) => void] {
  const tasks = useStore((s) => s.tasks)
  const [params, setParams] = useSearchParams()
  const list = tasks.filter((t) => t.adopted && !t.excluded && needsPurchase(t))
  const id = params.get('task') ?? list.find((t) => t.status !== '완료')?.id ?? list[0]?.id
  return [list, list.find((t) => t.id === id), (next) => setParams({ task: next })]
}

export function TaskPicker({ list, current, onPick, badge }: { list: TaskRecord[]; current?: TaskRecord; onPick: (id: string) => void; badge?: (t: TaskRecord) => string | null }) {
  return (
    <label className="field">
      <span className="field-label">어떤 일을 볼까요?</span>
      <select id="task-picker" value={current?.id ?? ''} onChange={(e) => onPick(e.target.value)}>
        {list.map((t) => (
          <option key={t.id} value={t.id}>
            {t.status === '완료' ? '✓ ' : ''}
            {t.title}
            {badge?.(t) ? ` · ${badge(t)}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setState('ok')
        } catch {
          setState('fail')
        }
      }}
    >
      {state === 'ok' ? '복사했어요' : state === 'fail' ? '복사가 막혀 있어요. 글을 직접 선택해 주세요' : label}
    </button>
  )
}
