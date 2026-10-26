// 고른 안의 업체별 다음 행동. 일정은 PRD 역산표(본식 기준 D-day)를 따른다.
import type { Category, Vendor } from '../data/vendors'

const ACTION: Record<Category, { task: string; when: string }> = {
  hall: { task: '예식장 날짜 전달 및 예산 받기', when: 'D-330~300' },
  dress: { task: '드레스샵 투어', when: 'D-240~210' },
  studio: { task: '촬영 날짜 확정', when: 'D-270~240' },
  snap: { task: '스냅 시안 및 소품 준비', when: '촬영 30~7일 전' },
}

export function nextActionFor(v: Vendor) {
  return ACTION[v.category]
}

// 추가금 미확인 업체에 보낼 문의 초안. 연락은 사용자가 직접 한다.
export function inquiryDraft(v: Vendor): string {
  return [
    `안녕하세요, ${v.name.replace(' (예시)', '')} 상담 문의드립니다.`,
    '1. 기본가에 포함된 항목이 무엇인가요?',
    '2. 필수 추가금(피팅비·헬퍼비·원본 등)이 있나요?',
    '3. 부가세 포함 금액인가요?',
    '4. 희망 날짜에 예약이 가능한가요?',
  ].join('\n')
}
