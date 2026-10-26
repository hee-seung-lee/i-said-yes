// 청첩장 느낌의 선화 장식. 외부 이미지를 못 쓰는 게시 환경에서도 보이도록 인라인 SVG 로 둔다.
// 색은 currentColor 를 따르므로 부모의 color 로 바꾼다.

export function RingsMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="12.5" cy="19" r="7.5" />
      <circle cx="19.5" cy="19" r="7.5" />
      <path d="M19.5 11.5 L17.6 8.6 L19.5 6 L21.4 8.6 Z" strokeLinejoin="round" />
    </svg>
  )
}

// 가운데 작은 꽃과 양옆 잎이 달린 구분선
export function FloralDivider({ width = 180 }: { width?: number }) {
  return (
    <svg width={width} height="18" viewBox="0 0 180 18" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <path d="M8 9 H70" />
      <path d="M110 9 H172" />
      <path d="M70 9 c6 -6 12 -6 14 0" />
      <path d="M110 9 c-6 6 -12 6 -14 0" />
      <ellipse cx="62" cy="5.5" rx="4" ry="1.8" transform="rotate(-25 62 5.5)" />
      <ellipse cx="118" cy="12.5" rx="4" ry="1.8" transform="rotate(-25 118 12.5)" />
      <circle cx="90" cy="9" r="2.2" />
      <path d="M90 3.5 v1.8 M90 12.7 v1.8 M84.5 9 h1.8 M93.7 9 h1.8" />
    </svg>
  )
}

// 꽃 한 송이(꽃잎 5장 + 수술)
function Bloom({ x, y, r, tone }: { x: number; y: number; r: number; tone: 'rose' | 'blush' | 'ivory' }) {
  const fill = tone === 'rose' ? '#e9c3c6' : tone === 'blush' ? '#f5e1dd' : '#fffaf3'
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.55} rx={r * 0.42} ry={r * 0.6} transform={`rotate(${a})`} fill={fill} stroke="#c58e96" strokeWidth="0.8" />
      ))}
      <circle r={r * 0.22} fill="#d9bf86" stroke="#b3955a" strokeWidth="0.6" />
    </g>
  )
}

function Leaf({ x, y, rot, len = 14 }: { x: number; y: number; rot: number; len?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${rot})`}
      d={`M0 0 C${len * 0.3} ${-len * 0.35} ${len * 0.75} ${-len * 0.35} ${len} 0 C${len * 0.75} ${len * 0.35} ${len * 0.3} ${len * 0.35} 0 0 Z`}
      fill="#dfe6d6"
      stroke="#8fa58a"
      strokeWidth="0.8"
    />
  )
}

// 꽃 아치 아래 반지 한 쌍. 첫 화면과 체크리스트 첫머리에 쓴다.
export function FloralArch({ width = 220 }: { width?: number }) {
  return (
    <svg width={width} viewBox="0 0 240 200" role="img" aria-label="꽃 장식 아치와 결혼반지" style={{ maxWidth: '100%', height: 'auto' }}>
      <g fill="none" stroke="#b3955a" strokeLinecap="round">
        <path d="M44 196 V96 A76 76 0 0 1 196 96 V196" strokeWidth="1.6" />
        <path d="M54 196 V98 A66 66 0 0 1 186 98 V196" strokeWidth="0.8" opacity="0.6" />
        <path d="M20 196 H220" strokeWidth="1" opacity="0.5" />
      </g>
      <g>
        <Leaf x={58} y={62} rot={-140} />
        <Leaf x={66} y={50} rot={-100} len={12} />
        <Leaf x={92} y={30} rot={-160} />
        <Leaf x={148} y={30} rot={-20} />
        <Leaf x={174} y={50} rot={-80} len={12} />
        <Leaf x={182} y={62} rot={-40} />
        <Leaf x={44} y={120} rot={-200} len={12} />
        <Leaf x={196} y={120} rot={20} len={12} />
        <Bloom x={50} y={86} r={13} tone="rose" />
        <Bloom x={70} y={60} r={10} tone="ivory" />
        <Bloom x={104} y={26} r={11} tone="blush" />
        <Bloom x={120} y={20} r={14} tone="rose" />
        <Bloom x={137} y={27} r={10} tone="ivory" />
        <Bloom x={170} y={60} r={10} tone="blush" />
        <Bloom x={190} y={86} r={13} tone="rose" />
        <Bloom x={44} y={108} r={8} tone="blush" />
        <Bloom x={196} y={108} r={8} tone="ivory" />
      </g>
      <g fill="none" stroke="#b3955a" strokeWidth="2">
        <circle cx="111" cy="152" r="17" />
        <circle cx="129" cy="152" r="17" />
      </g>
      <path d="M129 135 l-5 -7 l5 -6 l5 6 Z" fill="#fffaf3" stroke="#b3955a" strokeWidth="1.2" strokeLinejoin="round" />
      <g fill="#e9c3c6">
        <ellipse cx="78" cy="176" rx="3" ry="1.6" transform="rotate(30 78 176)" />
        <ellipse cx="164" cy="170" rx="3" ry="1.6" transform="rotate(-20 164 170)" />
        <ellipse cx="150" cy="186" rx="2.6" ry="1.4" transform="rotate(50 150 186)" />
        <ellipse cx="92" cy="188" rx="2.6" ry="1.4" transform="rotate(-40 92 188)" />
      </g>
    </svg>
  )
}

// 모서리에 늘어진 꽃가지
export function Sprig({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <path d="M150 6 C118 18 92 40 74 66 C62 84 44 100 14 112" />
      <path d="M118 22 c-2 -10 4 -16 12 -16 c0 9 -5 14 -12 16 Z" />
      <path d="M100 36 c-10 -3 -14 -10 -10 -17 c8 3 11 10 10 17 Z" />
      <path d="M92 46 c8 -7 16 -7 21 -2 c-6 6 -14 6 -21 2 Z" />
      <path d="M76 62 c-10 -2 -15 -9 -12 -16 c8 2 12 9 12 16 Z" />
      <path d="M68 74 c9 -5 17 -4 20 2 c-7 5 -15 4 -20 -2 Z" />
      <path d="M50 90 c-9 -4 -12 -11 -8 -17 c7 4 10 10 8 17 Z" />
      <circle cx="140" cy="10" r="3.2" />
      <circle cx="140" cy="10" r="6.5" />
      <circle cx="34" cy="100" r="2.4" />
      <circle cx="34" cy="100" r="5" />
    </svg>
  )
}
