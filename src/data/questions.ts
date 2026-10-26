// 사전 체크리스트 20문항. 원본: 조 자료 table.tsv (번호 / 질문 / 세부 선택·입력 항목).
// 모든 항목은 선택 입력이다(PRD: 미정이어도 진행, 값을 임의로 채우지 않음).
export const UNKNOWN = 'unknown'
export const NONE = 'none'
// 예식장이 이미 정해진 경우(교회·성당 등). 예식장 추천을 생략한다.
export const OWN_VENUE = 'own'

export type FieldKind = 'single' | 'multi' | 'number' | 'text'

export interface Option {
  value: string
  label: string
}

export interface Field {
  id: string
  label: string
  kind: FieldKind
  options?: Option[]
  exclusive?: string[] // multi 에서 단독으로만 고를 수 있는 값
  unit?: string
  placeholder?: string
}

export interface Question {
  no: number
  id: string
  section: string
  title: string
  icon: string // 카드형 머리 아이콘
  fields: Field[]
}

export type Answers = Record<string, string[]>

const o = (pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }))

const ITEMS = o([['hall', '예식장'], ['food', '식사'], ['dress', '드레스'], ['photo', '사진'], ['video', '영상'], ['trip', '여행']])
const REGIONS = o([['gangnam', '서울 강남'], ['gangbuk', '서울 강북'], ['gyeonggi', '경기'], ['incheon', '인천'], ['busan', '부산'], ['etc', '그 외'], [UNKNOWN, '상관없음']])

export const QUESTIONS: Question[] = [
  {
    no: 1, id: 'q01', section: '기본 정보', icon: '💰', title: '결혼 준비 총예산은 얼마인가요?',
    fields: [
      { id: 'target', label: '목표 예산', kind: 'number', unit: '만 원' },
      { id: 'max', label: '최대 한도', kind: 'number', unit: '만 원' },
      { id: 'reserve', label: '예비비', kind: 'number', unit: '만 원' },
      { id: 'scope', label: '총예산에 포함', kind: 'multi', options: o([['house', '신혼집'], ['goods', '혼수'], ['trip', '신혼여행'], [NONE, '모두 제외']]), exclusive: [NONE] },
    ],
  },
  {
    no: 2, id: 'q02', section: '기본 정보', icon: '⚖️', title: '돈을 더 쓰고 싶은 항목과 아끼고 싶은 항목은 무엇인가요?',
    fields: [
      { id: 'spend', label: '더 쓰고 싶은 항목', kind: 'multi', options: ITEMS },
      { id: 'save', label: '아끼고 싶은 항목', kind: 'multi', options: ITEMS },
      { id: 'skip', label: '생략 가능한 항목', kind: 'multi', options: [...ITEMS, { value: NONE, label: '없음' }], exclusive: [NONE] },
    ],
  },
  {
    no: 3, id: 'q03', section: '기본 정보', icon: '📅', title: '희망하는 예식 날짜와 시간대는 언제인가요?',
    fields: [
      { id: 'year', label: '희망 연도', kind: 'single', options: o([['2027', '2027년'], ['2028', '2028년'], [UNKNOWN, '미정']]) },
      { id: 'month', label: '희망 월', kind: 'text', placeholder: '5월, 10월' },
      { id: 'season', label: '계절', kind: 'multi', options: o([['spring', '봄'], ['summer', '여름'], ['fall', '가을'], ['winter', '겨울']]) },
      { id: 'day', label: '요일', kind: 'single', options: o([['weekend', '주말'], ['weekday', '평일'], [UNKNOWN, '상관없음']]) },
      { id: 'time', label: '시간대', kind: 'single', options: o([['lunch', '점심'], ['dinner', '저녁'], [UNKNOWN, '상관없음']]) },
      { id: 'flex', label: '날짜 변경 가능 범위', kind: 'single', options: o([['fixed', '변경 불가'], ['1m', '±1개월'], ['3m', '±3개월'], ['free', '자유']]) },
    ],
  },
  {
    no: 4, id: 'q04', section: '기본 정보', icon: '📍', title: '희망 예식 지역과 예상 하객 수는 어떻게 되나요?',
    fields: [
      { id: 'region', label: '예식 지역', kind: 'single', options: REGIONS },
      { id: 'guestsMin', label: '최소 인원', kind: 'number', unit: '명' },
      { id: 'guestsMax', label: '최대 인원', kind: 'number', unit: '명' },
      { id: 'origin', label: '양가 출발 지역', kind: 'text', placeholder: '신랑 대전 / 신부 서울' },
      { id: 'farRatio', label: '지방 하객 비율', kind: 'single', options: o([['few', '거의 없음'], ['lt30', '30% 미만'], ['30to50', '30~50%'], ['gt50', '50% 이상']]) },
    ],
  },
  {
    no: 5, id: 'q05', section: '예식', icon: '🏛️', title: '예식장은 어떤 분위기를 원하나요?',
    fields: [
      {
        id: 'mood', label: '분위기', kind: 'multi',
        options: o([['dark', '어두운 홀'], ['bright', '밝은 홀'], ['hotel', '호텔'], ['garden', '가든'], ['park', '파크'], ['outdoor', '야외'], ['house', '하우스'], [OWN_VENUE, '이미 정한 곳(교회 등)'], [UNKNOWN, '아직 모르겠어요']]),
        exclusive: [OWN_VENUE, UNKNOWN],
      },
      { id: 'ceiling', label: '천고', kind: 'single', options: o([['high', '높았으면'], [UNKNOWN, '상관없음']]) },
      { id: 'aisle', label: '버진로드', kind: 'single', options: o([['long', '길었으면'], ['short', '짧아도 됨'], [UNKNOWN, '상관없음']]) },
      { id: 'ref', label: '참고 사진', kind: 'text', placeholder: '링크나 메모' },
    ],
  },
  {
    no: 6, id: 'q06', section: '예식', icon: '✅', title: '예식장에서 꼭 갖췄으면 하는 조건은 무엇인가요?',
    fields: [
      {
        id: 'must', label: '필수 조건', kind: 'multi',
        options: o([['food', '식사'], ['parking', '주차'], ['transit', '대중교통'], ['solo', '단독홀'], ['interval', '여유 있는 예식 간격'], ['bride-room', '신부대기실'], ['rain', '우천 시 대체 공간']]),
      },
    ],
  },
  {
    no: 7, id: 'q07', section: '예식', icon: '🎤', title: '어떤 방식으로 예식을 진행하고 싶나요?',
    fields: [
      { id: 'style', label: '예식 방식', kind: 'single', options: o([['normal', '일반'], ['religious', '종교'], ['no-officiant', '주례 없는 예식']]) },
      { id: 'program', label: '넣고 싶은 순서', kind: 'multi', options: o([['song', '축가'], ['speech', '축사'], ['event', '이벤트']]) },
      { id: 'length', label: '희망 예식 길이', kind: 'single', options: o([['lt30', '30분 이내'], ['30to50', '30~50분'], [UNKNOWN, '상관없음']]) },
      { id: 'avoid', label: '피하고 싶은 연출', kind: 'text', placeholder: '신랑 노래, 과한 이벤트' },
    ],
  },
  {
    no: 8, id: 'q08', section: '예식', icon: '🧭', title: '플래너와 어느 정도 함께 준비하고 싶나요?',
    fields: [
      { id: 'planner', label: '준비 방식', kind: 'single', options: o([['with', '동행 플래너'], ['without', '비동행 플래너'], ['self', '직접 준비']]) },
      { id: 'contract', label: '계약 방식', kind: 'single', options: o([['package', '패키지'], ['separate', '개별 계약'], [UNKNOWN, '미정']]) },
      { id: 'delegate', label: '맡길 업무', kind: 'multi', options: o([['compare', '업체 비교'], ['booking', '예약 대행'], ['schedule', '일정 관리'], ['dayof', '당일 진행']]) },
      { id: 'time', label: '상담 가능 시간', kind: 'text', placeholder: '평일 저녁, 주말 오전' },
    ],
  },
  {
    no: 9, id: 'q09', section: '촬영', icon: '📸', title: '스드메 외에 별도 촬영을 할 예정인가요?',
    fields: [
      { id: 'place', label: '촬영지', kind: 'multi', options: o([['jeju', '제주'], ['busan', '부산'], ['seoul', '서울'], ['abroad', '해외'], [NONE, '안 해요']]), exclusive: [NONE] },
      { id: 'kind', label: '촬영 종류', kind: 'multi', options: o([['outdoor', '야외 스냅'], ['travel', '여행 스냅']]) },
      { id: 'relation', label: '스튜디오 촬영과의 관계', kind: 'single', options: o([['replace', '대체'], ['add', '추가']]) },
      { id: 'budget', label: '이동·숙박 포함 예산', kind: 'number', unit: '만 원' },
    ],
  },
  {
    no: 10, id: 'q10', section: '촬영', icon: '🖼️', title: '웨딩 사진은 어떤 느낌을 원하나요?',
    fields: [
      { id: 'focus', label: '중심', kind: 'single', options: o([['person', '인물'], ['scene', '배경'], ['both', '반반']]) },
      { id: 'mood', label: '느낌', kind: 'multi', options: o([['natural', '자연스러운'], ['editorial', '화보'], ['vintage', '빈티지']]) },
      { id: 'space', label: '공간', kind: 'single', options: o([['indoor', '실내'], ['outdoor', '야외'], ['both', '둘 다']]) },
      { id: 'want', label: '원하는 컷', kind: 'text' },
      { id: 'avoid', label: '피하고 싶은 포즈', kind: 'text' },
      { id: 'ref', label: '참고 사진', kind: 'text', placeholder: '링크나 메모' },
    ],
  },
  {
    no: 11, id: 'q11', section: '촬영', icon: '📦', title: '촬영 결과물은 어디까지 필요한가요?',
    fields: [
      { id: 'original', label: '원본 제공', kind: 'single', options: o([['yes', '필요'], ['no', '불필요']]) },
      { id: 'count', label: '보정본 수', kind: 'single', options: o([['lt20', '20장 이하'], ['20to40', '20~40장'], ['gt40', '40장 이상']]) },
      { id: 'album', label: '앨범·액자', kind: 'multi', options: o([['album', '앨범'], ['frame', '액자']]) },
      { id: 'level', label: '보정 강도', kind: 'single', options: o([['light', '자연스럽게'], ['mid', '보통'], ['strong', '강하게']]) },
      { id: 'due', label: '수령 희망일', kind: 'text', placeholder: '본식 2개월 전' },
      { id: 'publish', label: '사진 공개 동의', kind: 'single', options: o([['yes', '동의'], ['no', '비동의']]) },
    ],
  },
  {
    no: 12, id: 'q12', section: '스타일', icon: '👗', title: '신부가 원하는 드레스 스타일은 무엇인가요?',
    fields: [
      { id: 'material', label: '소재', kind: 'multi', options: o([['beads', '비즈'], ['silk', '실크'], ['lace', '레이스'], ['tulle', '튤'], [UNKNOWN, '아직 모르겠어요']]), exclusive: [UNKNOWN] },
      { id: 'silhouette', label: '실루엣', kind: 'multi', options: o([['ball', '풍성'], ['slim', '슬림'], ['mermaid', '머메이드'], ['aline', 'A라인']]) },
      { id: 'neckline', label: '네크라인', kind: 'multi', options: o([['offshoulder', '오프숄더'], ['vneck', '브이넥'], ['highneck', '하이넥'], ['square', '스퀘어']]) },
      { id: 'sleeve', label: '소매', kind: 'single', options: o([['none', '민소매'], ['short', '반소매'], ['long', '긴소매'], [UNKNOWN, '상관없음']]) },
      { id: 'exposure', label: '노출 정도', kind: 'single', options: o([['low', '적게'], ['mid', '보통'], [UNKNOWN, '상관없음']]) },
      { id: 'ref', label: '참고 사진', kind: 'text', placeholder: '링크나 메모' },
    ],
  },
  {
    no: 13, id: 'q13', section: '스타일', icon: '🔎', title: '원하는 스타일에 특화된 드레스샵을 어떤 조건으로 찾을까요?',
    fields: [
      { id: 'region', label: '방문 가능 지역', kind: 'single', options: REGIONS },
      { id: 'hasStyle', label: '선호 스타일 보유', kind: 'single', options: o([['must', '꼭 있어야 함'], ['prefer', '있으면 좋음']]) },
      { id: 'buy', label: '대여·구매', kind: 'single', options: o([['rent', '대여'], ['buy', '구매']]) },
      { id: 'sets', label: '촬영·본식 벌수', kind: 'single', options: o([['3+1', '촬영 3벌 + 본식 1벌'], ['2+1', '촬영 2벌 + 본식 1벌'], ['0+1', '본식만']]) },
      { id: 'budget', label: '추가금 포함 예산', kind: 'number', unit: '만 원' },
      { id: 'fitting', label: '피팅·수선 조건', kind: 'text', placeholder: '피팅비 포함, 수선 2회' },
    ],
  },
  {
    no: 14, id: 'q14', section: '스타일', icon: '💄', title: '헤어·메이크업은 어떤 스타일을 원하나요?',
    fields: [
      { id: 'mood', label: '느낌', kind: 'single', options: o([['natural', '자연스러운'], ['glam', '화려한'], ['defined', '또렷한']]) },
      { id: 'base', label: '피부 표현', kind: 'single', options: o([['glow', '윤광'], ['semimatte', '세미매트']]) },
      { id: 'hair', label: '헤어', kind: 'multi', options: o([['updo', '업두'], ['lowbun', '로우번'], ['half', '반묶음']]) },
      { id: 'change', label: '헤어변형', kind: 'single', options: o([['yes', '원함'], ['no', '불필요']]) },
      { id: 'rehearsal', label: '리허설', kind: 'single', options: o([['yes', '원함'], ['no', '불필요']]) },
      { id: 'region', label: '선호 지역', kind: 'single', options: REGIONS },
    ],
  },
  {
    no: 15, id: 'q15', section: '스타일', icon: '🤵', title: '신랑 예복은 어떻게 준비하고 싶나요?',
    fields: [
      { id: 'how', label: '준비 방식', kind: 'single', options: o([['custom', '맞춤'], ['ready', '기성'], ['rent', '대여']]) },
      { id: 'type', label: '종류', kind: 'single', options: o([['suit', '정장'], ['tux', '턱시도']]) },
      { id: 'colorFit', label: '색상·핏', kind: 'text', placeholder: '네이비, 슬림핏' },
      { id: 'rewear', label: '재착용', kind: 'single', options: o([['yes', '할 예정'], ['no', '안 함']]) },
      { id: 'budget', label: '셔츠·구두 포함 예산', kind: 'number', unit: '만 원' },
    ],
  },
  {
    no: 16, id: 'q16', section: '스타일', icon: '💍', title: '반지·예물·예단은 어디까지 준비하나요?',
    fields: [
      { id: 'scope', label: '범위', kind: 'single', options: o([['band', '웨딩밴드만'], ['gifts', '추가 예물'], ['all', '예물·예단 모두']]) },
      { id: 'maker', label: '구매처', kind: 'single', options: o([['brand', '브랜드'], ['atelier', '공방'], [UNKNOWN, '미정']]) },
      { id: 'design', label: '소재·디자인', kind: 'text' },
      { id: 'budget', label: '예산', kind: 'number', unit: '만 원' },
      { id: 'agreed', label: '양가 협의', kind: 'single', options: o([['done', '협의 완료'], ['need', '협의 필요']]) },
    ],
  },
  {
    no: 17, id: 'q17', section: '가족', icon: '👨‍👩‍👧', title: '혼주와 가족에게 필요한 준비는 무엇인가요?',
    fields: [
      { id: 'outfit', label: '의상', kind: 'multi', options: o([['hanbok-rent', '한복 대여'], ['hanbok-buy', '한복 구매'], ['suit-rent', '정장 대여'], ['suit-buy', '정장 구매']]) },
      { id: 'hmCount', label: '헤메 인원', kind: 'number', unit: '명' },
      { id: 'travel', label: '이동·숙박', kind: 'multi', options: o([['move', '이동 지원'], ['stay', '숙박 지원']]) },
      { id: 'cost', label: '비용 부담', kind: 'single', options: o([['each', '양가 각자'], ['couple', '부부'], [UNKNOWN, '미정']]) },
      { id: 'req', label: '가족별 요청사항', kind: 'text' },
    ],
  },
  {
    no: 18, id: 'q18', section: '본식', icon: '🎥', title: '본식 사진과 영상은 어떤 조합으로 남기고 싶나요?',
    fields: [
      { id: 'combo', label: '조합', kind: 'multi', options: o([['snap', '본식 스냅'], ['dvd', 'DVD'], ['iphone', '아이폰 스냅']]) },
      { id: 'crew', label: '촬영 인원', kind: 'single', options: o([['1', '1인'], ['2', '2인 이상']]) },
      { id: 'range', label: '촬영 범위', kind: 'multi', options: o([['waiting', '대기실'], ['ceremony', '예식'], ['group', '원판'], ['party', '피로연']]) },
      { id: 'output', label: '결과물', kind: 'text', placeholder: '하이라이트 영상, 원본' },
      { id: 'budget', label: '예산', kind: 'number', unit: '만 원' },
    ],
  },
  {
    no: 19, id: 'q19', section: '본식', icon: '🎨', title: '직접 만들거나 취향을 반영하고 싶은 요소가 있나요?',
    fields: [
      { id: 'items', label: '요소', kind: 'multi', options: o([['invite', '청첩장'], ['video', '식전영상'], ['bgm', 'BGM'], ['bouquet', '부케'], ['flower', '꽃장식'], ['phototable', '포토테이블'], ['gift', '답례품']]) },
      { id: 'diy', label: '제작 방식', kind: 'single', options: o([['self', '직접 제작 위주'], ['outsource', '외주 위주'], ['mix', '섞어서']]) },
      { id: 'hours', label: '투입 가능한 시간', kind: 'single', options: o([['lt2', '주 2시간 이하'], ['2to5', '주 2~5시간'], ['gt5', '주 5시간 이상']]) },
    ],
  },
  {
    no: 20, id: 'q20', section: '결정', icon: '🤝', title: '결정할 때 무엇이 가장 어렵고, 어떤 도움을 원하나요?',
    fields: [
      { id: 'hard', label: '어려운 점', kind: 'multi', options: o([['price', '가격 판단'], ['toomany', '후보 과다'], ['taste', '취향 확신'], ['family', '양가 의견'], ['time', '시간 부족']]) },
      { id: 'help', label: '원하는 도움', kind: 'multi', options: o([['compare', '후보 비교'], ['pick', '추천 1개']]) },
      { id: 'decider', label: '최종 결정자', kind: 'single', options: o([['both', '둘이 함께'], ['bride', '신부'], ['groom', '신랑'], ['family', '양가']]) },
      { id: 'owner', label: '업무 담당', kind: 'text', placeholder: '예식장은 신랑, 드레스는 신부' },
    ],
  },
]

export const key = (q: Question, f: Field) => `${q.id}.${f.id}`

export function get(answers: Answers, k: string): string[] {
  return answers[k] ?? []
}

export function getNumber(answers: Answers, k: string): number | null {
  const v = answers[k]?.[0]
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function findField(k: string): { q: Question; f: Field } | null {
  const [qid, fid] = k.split('.')
  const q = QUESTIONS.find((x) => x.id === qid)
  const f = q?.fields.find((x) => x.id === fid)
  return q && f ? { q, f } : null
}

export function labelOf(k: string, value: string): string {
  return findField(k)?.f.options?.find((x) => x.value === value)?.label ?? value
}

// 선택 토글. 단일 선택은 교체(같은 값 다시 누르면 해제), 다중 선택은 추가/제거하되 배타 값은 단독으로만 남긴다.
export function toggleValue(f: Field, current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value)
  if (f.kind === 'single') return [value]
  const ex = f.exclusive ?? []
  if (ex.includes(value)) return [value]
  return [...current.filter((v) => !ex.includes(v)), value]
}

// 한 문항의 답을 한 줄로. 비었으면 빈 문자열.
export function summarize(q: Question, answers: Answers): string {
  return q.fields
    .map((f) => {
      const vals = get(answers, key(q, f)).filter((v) => v !== '')
      if (vals.length === 0) return ''
      const text = f.kind === 'number' ? `${Number(vals[0]).toLocaleString()}${f.unit ?? ''}` : f.options ? vals.map((v) => labelOf(key(q, f), v)).join('·') : vals[0]
      return `${f.label} ${text}`
    })
    .filter(Boolean)
    .join(', ')
}

export function answeredCount(answers: Answers): number {
  return QUESTIONS.filter((q) => summarize(q, answers) !== '').length
}
