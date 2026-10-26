import { type Field, type Question, get, key, toggleValue } from '../data/questions'
import { useStore } from '../store'

// 체크리스트 한 항목 입력. 대화형·카드형이 같이 쓴다.
export function FieldInput({ q, f }: { q: Question; f: Field }) {
  const k = key(q, f)
  const values = useStore((s) => get(s.answers, k))
  const setAnswer = useStore((s) => s.setAnswer)

  return (
    <div className="field">
      <div className="field-label">{f.label}</div>
      {f.options ? (
        <div>
          {f.options.map((opt) => (
            <span
              key={opt.value}
              className={values.includes(opt.value) ? 'chip on' : 'chip'}
              onClick={() => setAnswer(k, toggleValue(f, useStore.getState().answers[k] ?? [], opt.value))}
            >
              {opt.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="row">
          <input
            className="grow"
            type={f.kind === 'number' ? 'number' : 'text'}
            inputMode={f.kind === 'number' ? 'numeric' : undefined}
            min={f.kind === 'number' ? 0 : undefined}
            placeholder={f.placeholder ?? (f.kind === 'number' ? '숫자' : '')}
            value={values[0] ?? ''}
            onChange={(e) => setAnswer(k, e.target.value === '' ? [] : [e.target.value])}
          />
          {f.unit && <span className="sub">{f.unit}</span>}
        </div>
      )}
    </div>
  )
}

export function QuestionFields({ q }: { q: Question }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {q.fields.map((f) => (
        <FieldInput key={f.id} q={q} f={f} />
      ))}
    </div>
  )
}
