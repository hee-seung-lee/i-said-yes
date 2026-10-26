import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useNextPath } from '../components/flow'
import { QuestionFields } from '../components/FieldInput'
import { QUESTIONS, summarize } from '../data/questions'
import { useStore } from '../store'

export default function ChatChecklist01() {
  const answers = useStore((s) => s.answers)
  const progress = useStore((s) => s.progress)
  const setProgress = useStore((s) => s.setProgress)
  const finishChecklist = useStore((s) => s.finishChecklist)
  const next = useNextPath('01')
  const navigate = useNavigate()
  const endRef = useRef<HTMLDivElement>(null)
  const step = Math.min(progress, QUESTIONS.length)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [step])

  // 지나간 문항은 내 말풍선으로 접고, 누르면 그 자리에서 다시 펼쳐 고친다.
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <Layout piece="01_chat_checklist">
      <div className="chat">
        <p className="bot-tag">준비 도우미</p>
        <div className="bubble">
          결혼 준비를 시작하기 전에 {QUESTIONS.length}가지를 여쭤볼게요. 모르는 건 비워 두고 넘어가도 돼요. 답에 맞춰 세 가지 안을 만들어 드려요.
        </div>
        {QUESTIONS.slice(0, Math.min(step + 1, QUESTIONS.length)).map((q, i) => {
          const open = i === step || editing === q.id
          const text = summarize(q, answers)
          return (
            <div key={q.id} className="chat">
              <div className="bubble">
                <span className="muted">
                  {q.no}/{QUESTIONS.length} · {q.section}
                </span>
                <br />
                {q.title}
              </div>
              {open ? (
                <div className="qform">
                  <QuestionFields q={q} />
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                    {i === step ? (
                      <>
                        <button onClick={() => setProgress(i + 1)}>건너뛰기</button>
                        <button className="primary" onClick={() => setProgress(i + 1)}>
                          다음
                        </button>
                      </>
                    ) : (
                      <button className="primary" onClick={() => setEditing(null)}>
                        고치기 끝
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bubble me" onClick={() => setEditing(q.id)} title="눌러서 고치기" style={{ cursor: 'pointer' }}>
                  {text || '건너뛰었어요'}
                </div>
              )}
            </div>
          )
        })}
        {step >= QUESTIONS.length && (
          <>
            <div className="bubble">다 됐어요. 고른 조건으로 세 가지 안을 정리할게요. 답을 바꾸고 싶으면 내 말풍선을 눌러 주세요.</div>
            {next && (
              <button
                className="primary"
                onClick={() => {
                  finishChecklist()
                  navigate(next)
                }}
              >
                3가지 안 보기
              </button>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>
    </Layout>
  )
}
