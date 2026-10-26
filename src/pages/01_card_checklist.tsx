import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useNextPath } from '../components/flow'
import { QuestionFields } from '../components/FieldInput'
import { useSwipe } from '../components/useSwipe'
import { QUESTIONS, summarize } from '../data/questions'
import { useStore } from '../store'

const SECTIONS = [...new Set(QUESTIONS.map((q) => q.section))]

export default function CardChecklist01() {
  const answers = useStore((s) => s.answers)
  const progress = useStore((s) => s.progress)
  const setProgress = useStore((s) => s.setProgress)
  const finishChecklist = useStore((s) => s.finishChecklist)
  const next = useNextPath('01')
  const navigate = useNavigate()
  const [index, setIndex] = useState(() => Math.min(progress, QUESTIONS.length - 1))

  const q = QUESTIONS[index]
  const last = index === QUESTIONS.length - 1
  const answered = summarize(q, answers) !== ''

  function goNext() {
    setProgress(index + 1)
    if (last) {
      finishChecklist()
      if (next) navigate(next)
    } else setIndex(index + 1)
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1)
  }

  const swipe = useSwipe(goNext, goPrev)

  return (
    <Layout piece="01_card_checklist">
      <div className="progress">
        {QUESTIONS.map((x, i) => (
          <span key={x.id} className={i <= index ? 'done' : ''} onClick={() => i <= progress && setIndex(i)} />
        ))}
      </div>
      <div className="section-path">
        {SECTIONS.map((s, i) => (
          <span key={s}>
            {i > 0 && ' · '}
            {s === q.section ? <b>{s}</b> : s}
          </span>
        ))}
      </div>
      <div {...swipe} className="qform" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
        <div className="row">
          <span className="q-no grow">No. {String(q.no).padStart(2, '0')}</span>
          <span className="muted">
            {q.no} / {QUESTIONS.length}
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.45 }}>{q.title}</h2>
        <QuestionFields q={q} />
      </div>
      <div className="row" style={{ marginTop: 'auto' }}>
        <button onClick={goPrev} disabled={index === 0}>
          이전
        </button>
        <button className="primary grow" onClick={goNext}>
          {last ? '3가지 안 보기' : answered ? '다음' : '건너뛰기'}
        </button>
      </div>
      <div className="muted" style={{ textAlign: 'center' }}>
        모든 항목은 선택이에요. 모르면 비워 두고 넘기세요.
      </div>
    </Layout>
  )
}
