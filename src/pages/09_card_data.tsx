import { useState } from 'react'
import { Layout } from '../components/Layout'
import { CopyButton } from '../components/Money'
import { seedTasks } from '../data/tasks'
import { type MergePreview, applyMerge, normalizeTask, previewMerge } from '../logic/io'
import { todaySeoul } from '../logic/schedule'
import { type PersistedShape, SCHEMA_VERSION, persistedShape, useStore } from '../store'

// PRD: JSON 가져오기/내보내기, sourceUrl 기준 중복 방지, 병합 미리보기. 실제 Notion 동기화는 없다.
export default function CardData09() {
  const state = useStore()
  const replaceTasks = useStore((s) => s.replaceTasks)
  const importAll = useStore((s) => s.importAll)
  const reset = useStore((s) => s.reset)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [extra, setExtra] = useState<Partial<PersistedShape> | null>(null)
  const [withOthers, setWithOthers] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [done, setDone] = useState('')

  const exported = JSON.stringify({ app: 'i-said-yes', schemaVersion: SCHEMA_VERSION, exportedAt: todaySeoul(), ...persistedShape(state) }, null, 2)

  const read = (raw: string) => {
    setErr('')
    setDone('')
    setPreview(null)
    try {
      const data = JSON.parse(raw)
      const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data.tasks) ? data.tasks : []
      if (list.length === 0) return setErr('업무 목록(tasks)을 찾지 못했어요')
      const normalized = list.map((x) => (x && typeof x === 'object' ? normalizeTask(x as Record<string, unknown>, seedTasks()) : x))
      setPreview(previewMerge(state.tasks, normalized))
      // PRD 초기 데이터의 project(weddingDate 등)와 이 앱의 내보내기 데이터를 모두 받는다
      const others: Partial<PersistedShape> = {}
      if (data.app === 'i-said-yes') {
        for (const k of ['answers', 'answerFiles', 'project', 'quotes', 'chosen', 'contracts', 'dayof', 'selectedPlan', 'checklistDone', 'progress'] as const) if (k in data) (others as Record<string, unknown>)[k] = data[k]
      } else if (data.project && typeof data.project === 'object') {
        const p = data.project
        others.project = {
          ...state.project,
          anchors: { ...state.project.anchors, wedding: p.weddingDate ?? state.project.anchors.wedding },
          totalBudget: p.totalBudget ?? state.project.totalBudget,
        }
      }
      setExtra(Object.keys(others).length ? others : null)
    } catch {
      setErr('JSON 형식이 아니에요. 내보낸 글 전체를 붙여 넣어 주세요')
    }
  }

  return (
    <Layout piece="09_card_data" hub>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <h3 style={{ margin: 0 }}>내보내기</h3>
        <div className="sub">이 브라우저에 저장된 모든 준비 내용이에요. 다른 기기나 조원에게 옮길 때 복사해서 쓰세요. 올린 사진·파일 원본은 들어가지 않아요(목록만 옮겨지고, 다른 기기에서는 '파일 없음'으로 보여요).</div>
        <textarea id="export-json" readOnly value={exported} rows={6} onFocus={(e) => e.currentTarget.select()} />
        <CopyButton text={exported} label="JSON 복사" />
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <h3 style={{ margin: 0 }}>가져오기</h3>
        <div className="sub">이 앱에서 내보낸 파일이나 준비 목록 파일(JSON)을 넣으세요. 이미 있는 업무는 새로 만들지 않고 하나로 합쳐요.</div>
        <input
          id="import-file"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const raw = await f.text()
            setText(raw)
            read(raw)
          }}
        />
        <textarea id="import-json" rows={5} value={text} placeholder="또는 여기에 붙여 넣기" onChange={(e) => setText(e.target.value)} />
        <button onClick={() => read(text)} disabled={!text.trim()}>
          미리보기
        </button>
        {err && <span className="err">{err}</span>}
        {preview && (
          <div className="preview-box">
            <b>병합 미리보기</b>
            <div className="sub">
              새 업무 {preview.added.length}개 · 바뀌는 업무 {preview.changed.length}개 · 같은 업무 {preview.same}개
              {preview.invalid.length > 0 && ` · 건너뛸 항목 ${preview.invalid.length}개`}
            </div>
            <ul className="sub" style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflow: 'auto' }}>
              {preview.added.map((t) => (
                <li key={`a-${t.id}`}>+ {t.title}</li>
              ))}
              {preview.changed.map((c) => (
                <li key={`c-${c.before.id}`}>
                  ~ {c.before.title}: {c.fields.join(', ')}
                </li>
              ))}
              {preview.invalid.map((m) => (
                <li key={m}>× {m}</li>
              ))}
            </ul>
            {extra && (
              <label className="field check">
                <input type="checkbox" checked={withOthers} onChange={(e) => setWithOthers(e.target.checked)} />
                <span>업무 말고 다른 내용({Object.keys(extra).join(', ')})도 덮어쓰기</span>
              </label>
            )}
            <button
              className="primary"
              onClick={() => {
                replaceTasks(applyMerge(state.tasks, preview))
                if (withOthers && extra) importAll(extra)
                setDone(`가져왔어요: 새 ${preview.added.length}개, 바뀐 ${preview.changed.length}개`)
                setPreview(null)
              }}
            >
              적용
            </button>
          </div>
        )}
        {done && <div className="inline-msg">{done}</div>}
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
        <h3 style={{ margin: 0 }}>처음부터</h3>
        <div className="sub">체크리스트 답, 일정, 견적, 계약, 예산, 올린 사진을 모두 지우고 처음 준비 목록으로 돌아가요.</div>
        {confirmReset ? (
          <div className="row">
            <button onClick={() => setConfirmReset(false)}>취소</button>
            <button
              className="primary"
              onClick={() => {
                reset()
                setConfirmReset(false)
                setDone('처음 상태로 돌렸어요')
              }}
            >
              정말 모두 지우기
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)}>모두 지우기</button>
        )}
      </section>
      <p className="muted" style={{ textAlign: 'center' }}>
        저장은 이 브라우저 안에만 돼요. Notion 이나 서버와 동기화하지 않아요.
      </p>
    </Layout>
  )
}
