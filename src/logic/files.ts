// 사진·증빙 파일 저장. 서버가 없으므로 이 브라우저의 IndexedDB 에 원본을 보관한다.
// 상태(localStorage)에는 메타데이터(Attachment)만 두고, 원본은 fileId 로 찾는다.
// 다른 기기·브라우저에는 파일이 없다(JSON 내보내기에도 원본은 들어가지 않는다).

export interface Attachment {
  id: string
  label: string
  url?: string // 외부 링크
  fileId?: string // IndexedDB 의 파일
  mime?: string
  size?: number
  addedAt?: string
}

const DB = 'i-said-yes-files'
const STORE = 'files'
export const MAX_FILE_BYTES = 20 * 1024 * 1024

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function saveFile(file: File, id: string): Promise<void> {
  await tx('readwrite', (s) => s.put(file, id))
}

export async function loadFile(id: string): Promise<Blob | null> {
  try {
    return ((await tx('readonly', (s) => s.get(id))) as Blob | undefined) ?? null
  } catch {
    return null
  }
}

export async function removeFile(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    // 이미 없거나 저장소를 못 열면 그냥 둔다
  }
}

export function isImage(a: Attachment): boolean {
  return !!a.mime?.startsWith('image/')
}

export function sizeText(bytes?: number): string {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
