import { useEffect, useRef } from 'react'
import { mountPetals } from './petals'

// 화면 전체 꽃잎 하늘. 뒤 캔버스는 패널 아래, 앞 캔버스는 패널 위(클릭은 통과)에 깐다.
export function PetalSky() {
  const back = useRef<HTMLCanvasElement>(null)
  const front = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!back.current || !front.current) return
    return mountPetals(back.current, front.current)
  }, [])

  return (
    <>
      <canvas ref={back} className="sky sky-back" aria-hidden="true" />
      <canvas ref={front} className="sky sky-front" aria-hidden="true" />
    </>
  )
}
