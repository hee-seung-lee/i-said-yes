// 사진·파일·링크 첨부 목록. 사진은 썸네일로 보이고 누르면 크게, PDF 등은 새 탭으로 연다.
import { useEffect, useRef, useState } from 'react'
import { type Attachment, MAX_FILE_BYTES, isImage, loadFile, removeFile, saveFile, sizeText } from '../logic/files'
import { newId } from '../logic/money'
import { todaySeoul } from '../logic/schedule'

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// IndexedDB 의 파일을 화면에서 쓸 주소로 바꾼다. 화면을 떠나면 주소를 풀어 준다.
function useBlobUrl(fileId?: string): { url: string | null; missing: boolean } {
  const [state, setState] = useState<{ url: string | null; missing: boolean }>({ url: null, missing: false })
  useEffect(() => {
    if (!fileId) return
    let url: string | null = null
    let alive = true
    loadFile(fileId).then((blob) => {
      if (!alive) return
      if (!blob) return setState({ url: null, missing: true })
      url = URL.createObjectURL(blob)
      setState({ url, missing: false })
    })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [fileId])
  return state
}

function Item({ a, onRemove, onOpen }: { a: Attachment; onRemove: () => void; onOpen: (url: string, a: Attachment) => void }) {
  const { url, missing } = useBlobUrl(a.fileId)
  if (a.url && !a.fileId)
    return (
      <div className="att att-link">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="doc-link">
          🔗 {a.label}
        </a>
        <span className="muted">{hostOf(a.url)}</span>
        <button className="ghost" aria-label={`${a.label} 지우기`} onClick={onRemove}>
          ✕
        </button>
      </div>
    )
  return (
    <div className={`att ${isImage(a) ? 'att-img' : 'att-file'}`}>
      {missing ? (
        <span className="att-missing" title="이 브라우저에 파일이 없어요(다른 기기에서 올렸거나 지워짐)">
          파일 없음
        </span>
      ) : isImage(a) ? (
        <button className="att-thumb" onClick={() => url && onOpen(url, a)} aria-label={`${a.label} 크게 보기`}>
          {url && <img src={url} alt={a.label} />}
        </button>
      ) : (
        <button className="link-like doc-link" onClick={() => url && window.open(url, '_blank', 'noopener')}>
          📄 {a.label}
        </button>
      )}
      <span className="att-cap" title={a.label}>
        {isImage(a) ? a.label : sizeText(a.size)}
      </span>
      <button className="ghost att-x" aria-label={`${a.label} 지우기`} onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}

export function Attachments({
  idPrefix,
  items,
  onChange,
  hint = '견적서·계약서 사진, PDF, 시안 사진을 올려 두면 여기서 바로 볼 수 있어요.',
}: {
  idPrefix: string
  items: Attachment[]
  onChange: (next: (prev: Attachment[]) => Attachment[]) => void
  hint?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const [view, setView] = useState<{ url: string; a: Attachment } | null>(null)

  useEffect(() => {
    if (!view) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setView(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setErr('')
    setBusy(true)
    const added: Attachment[] = []
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_BYTES) {
        setErr(`${f.name}: 20MB 이하 파일만 올릴 수 있어요`)
        continue
      }
      const id = newId('f')
      try {
        await saveFile(f, id)
        added.push({ id: newId('att'), label: f.name, fileId: id, mime: f.type, size: f.size, addedAt: todaySeoul() })
      } catch {
        setErr('브라우저 저장 공간에 넣지 못했어요. 시크릿 창이거나 저장 공간이 꽉 찼을 수 있어요.')
      }
    }
    if (added.length) onChange((prev) => [...prev, ...added])
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  const addLink = () => {
    const u = link.trim()
    if (!/^https?:\/\/\S+$/i.test(u)) return setErr('http:// 또는 https:// 로 시작하는 주소를 넣어 주세요')
    onChange((prev) => [...prev, { id: newId('att'), label: hostOf(u), url: u, addedAt: todaySeoul() }])
    setLink('')
    setErr('')
  }

  const remove = (a: Attachment) => {
    if (a.fileId) removeFile(a.fileId)
    onChange((prev) => prev.filter((x) => x.id !== a.id))
  }

  const photos = items.filter(isImage)
  const others = items.filter((a) => !isImage(a))

  return (
    <div className="attachments">
      {photos.length > 0 && (
        <div className="att-grid">
          {photos.map((a) => (
            <Item key={a.id} a={a} onRemove={() => remove(a)} onOpen={(url, x) => setView({ url, a: x })} />
          ))}
        </div>
      )}
      {others.map((a) => (
        <Item key={a.id} a={a} onRemove={() => remove(a)} onOpen={() => undefined} />
      ))}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <input
          ref={input}
          id={`${idPrefix}-file`}
          type="file"
          multiple
          accept="image/*,application/pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={(e) => upload(e.target.files)}
        />
        <button onClick={() => input.current?.click()} disabled={busy}>
          {busy ? '올리는 중…' : '📷 사진·파일 올리기'}
        </button>
        <input id={`${idPrefix}-link`} value={link} placeholder="또는 https:// 링크" onChange={(e) => setLink(e.target.value)} style={{ flex: '1 1 140px' }} />
        <button onClick={addLink}>링크 추가</button>
      </div>
      {err && <span className="err">{err}</span>}
      <span className="muted">{hint} 파일은 이 브라우저에만 저장돼요.</span>

      {view && (
        <div className="lightbox" role="dialog" aria-label={view.a.label} onClick={() => setView(null)}>
          <img src={view.url} alt={view.a.label} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span>{view.a.label}</span>
            <button onClick={() => window.open(view.url, '_blank', 'noopener')}>원본 열기</button>
            <button className="primary" onClick={() => setView(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
