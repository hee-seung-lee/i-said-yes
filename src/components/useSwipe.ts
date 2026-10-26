import { useRef } from 'react'

// 좌우 스와이프. 왼쪽으로 밀면 onNext, 오른쪽으로 밀면 onPrev.
export function useSwipe(onNext: () => void, onPrev: () => void) {
  const startX = useRef<number | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      startX.current = null
      if (dx < -50) onNext()
      else if (dx > 50) onPrev()
    },
  }
}
