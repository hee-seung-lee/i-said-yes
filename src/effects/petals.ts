// 화면 전체 꽃잎·금빛 가루 연출. 2D 캔버스 두 장을 쓴다.
//  - back: 패널 뒤에서 계속 흩날리는 꽃잎·금가루·보케
//  - front: 패널 위로 지나가는 큰 꽃잎 몇 장, 축하 터짐(celebrate), 포인터 반짝이
// 움직임 줄이기 설정이면 한 장면만 그리고 멈춘다.

type Sprite = HTMLCanvasElement

interface Petal {
  x: number
  y: number
  z: number // 깊이 0.5(멀리) ~ 1.6(가까이). 크기·속도·불투명도에 곱한다
  vx: number
  vy: number
  rot: number
  vrot: number
  flip: number // 뒤집힘 위상. cos 로 한 축을 눌러 3D 로 도는 것처럼 보인다
  vflip: number
  swayAmp: number
  swayFreq: number
  phase: number
  sprite: Sprite
  life: number // 터짐 꽃잎만 유한(초). 배경 꽃잎은 Infinity
  age: number
}

interface Dust {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  tw: number // 반짝임 위상
  tws: number
  star: boolean
  life: number
  age: number
}

interface Bokeh {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  sprite: Sprite
}

const PETAL_COLORS: [string, string][] = [
  ['#fde9ec', '#f2b8c2'],
  ['#fbe1e4', '#e79aaa'],
  ['#ffffff', '#f3d2d6'],
  ['#fff4ef', '#f0c4b8'],
  ['#f9d3da', '#d9848f'],
]

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// 벚꽃·장미 사이쯤의 꽃잎: 아래가 좁고 위 끝이 살짝 패인 모양
function petalSprite(light: string, deep: string): Sprite {
  const s = 64
  const c = makeCanvas(s, s)
  const g = c.getContext('2d')!
  const path = new Path2D('M32 60 C14 48 6 30 12 16 C16 7 25 5 29 11 L32 15 L35 11 C39 5 48 7 52 16 C58 30 50 48 32 60 Z')
  const grad = g.createLinearGradient(32, 6, 32, 60)
  grad.addColorStop(0, light)
  grad.addColorStop(0.7, deep)
  grad.addColorStop(1, deep)
  g.fillStyle = grad
  g.fill(path)
  // 결 한 줄과 가장자리 하이라이트
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(32, 56)
  g.quadraticCurveTo(30, 36, 32, 18)
  g.stroke()
  g.strokeStyle = 'rgba(160,80,95,0.18)'
  g.lineWidth = 1
  g.stroke(path)
  return c
}

function dustSprite(): Sprite {
  const s = 32
  const c = makeCanvas(s, s)
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,248,220,1)')
  grad.addColorStop(0.25, 'rgba(232,196,110,0.95)')
  grad.addColorStop(0.55, 'rgba(201,160,72,0.35)')
  grad.addColorStop(1, 'rgba(201,160,72,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

// 네 갈래 반짝이
function starSprite(): Sprite {
  const s = 48
  const c = makeCanvas(s, s)
  const g = c.getContext('2d')!
  g.translate(24, 24)
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 10)
  glow.addColorStop(0, 'rgba(255,250,230,1)')
  glow.addColorStop(1, 'rgba(230,190,100,0)')
  g.fillStyle = glow
  g.beginPath()
  g.arc(0, 0, 10, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(214,170,80,0.95)'
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2)
    g.beginPath()
    g.moveTo(0, -22)
    g.quadraticCurveTo(2, -4, 0, 0)
    g.quadraticCurveTo(-2, -4, 0, -22)
    g.fill()
  }
  g.fillStyle = '#fffaf0'
  g.beginPath()
  g.arc(0, 0, 2.4, 0, Math.PI * 2)
  g.fill()
  return c
}

function bokehSprite(color: string): Sprite {
  const s = 128
  const c = makeCanvas(s, s)
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, color.replace('A', '0.32'))
  grad.addColorStop(0.6, color.replace('A', '0.14'))
  grad.addColorStop(1, color.replace('A', '0'))
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return c
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

export class PetalEngine {
  private back: CanvasRenderingContext2D
  private front: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private petals: Petal[] = []
  private frontPetals: Petal[] = []
  private bursts: Petal[] = []
  private dust: Dust[] = []
  private sparks: Dust[] = []
  private bokeh: Bokeh[] = []
  private petalSprites: Sprite[]
  private dustImg: Sprite
  private starImg: Sprite
  private bokehImgs: Sprite[]
  private raf = 0
  private last = 0
  private t = 0
  private reduced: boolean
  private lastSpark = 0
  private cleanup: (() => void)[] = []

  constructor(
    private backCanvas: HTMLCanvasElement,
    private frontCanvas: HTMLCanvasElement,
  ) {
    this.back = backCanvas.getContext('2d')!
    this.front = frontCanvas.getContext('2d')!
    this.petalSprites = PETAL_COLORS.map(([l, d]) => petalSprite(l, d))
    this.dustImg = dustSprite()
    this.starImg = starSprite()
    this.bokehImgs = ['rgba(236,190,120,A)', 'rgba(240,180,190,A)', 'rgba(255,240,225,A)'].map(bokehSprite)
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.resize()
    this.populate()

    const onResize = () => {
      this.resize()
      this.populate()
      if (this.reduced) this.draw()
    }
    const onMove = (e: PointerEvent) => this.onPointer(e.clientX, e.clientY)
    const onVis = () => {
      if (document.hidden) this.stop()
      else this.start()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    this.cleanup.push(
      () => window.removeEventListener('resize', onResize),
      () => window.removeEventListener('pointermove', onMove),
      () => document.removeEventListener('visibilitychange', onVis),
    )

    if (this.reduced) this.draw()
    else this.start()
  }

  destroy() {
    this.stop()
    this.cleanup.forEach((f) => f())
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    for (const c of [this.backCanvas, this.frontCanvas]) {
      c.width = Math.round(this.w * this.dpr)
      c.height = Math.round(this.h * this.dpr)
      c.style.width = `${this.w}px`
      c.style.height = `${this.h}px`
    }
    this.back.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.front.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  // 화면 넓이에 맞춰 개수를 정한다(작은 화면에서 과하지 않게).
  private populate() {
    const area = this.w * this.h
    const nPetals = Math.max(18, Math.min(52, Math.round(area / 24000)))
    const nDust = Math.max(36, Math.min(130, Math.round(area / 10000)))
    this.petals = Array.from({ length: nPetals }, () => this.newPetal(true, rand(0.5, 1.15)))
    this.frontPetals = Array.from({ length: this.w < 600 ? 6 : 5 }, () => this.newPetal(true, rand(1.3, 1.7)))
    this.dust = Array.from({ length: nDust }, () => this.newDust(true))
    this.bokeh = Array.from({ length: 9 }, () => ({
      x: rand(0, this.w),
      y: rand(0, this.h),
      r: rand(50, 140),
      vx: rand(-6, 6),
      vy: rand(-4, 4),
      sprite: pick(this.bokehImgs),
    }))
  }

  private newPetal(anywhere: boolean, z: number): Petal {
    return {
      x: rand(-40, this.w + 40),
      y: anywhere ? rand(-40, this.h) : rand(-120, -30),
      z,
      vx: rand(-10, 10),
      vy: rand(28, 52) * z,
      rot: rand(0, Math.PI * 2),
      vrot: rand(-0.9, 0.9),
      flip: rand(0, Math.PI * 2),
      vflip: rand(1.2, 2.8),
      swayAmp: rand(18, 46),
      swayFreq: rand(0.5, 1.2),
      phase: rand(0, Math.PI * 2),
      sprite: pick(this.petalSprites),
      life: Infinity,
      age: 0,
    }
  }

  private newDust(anywhere: boolean): Dust {
    return {
      x: rand(0, this.w),
      y: anywhere ? rand(0, this.h) : this.h + 10,
      vx: rand(-6, 6),
      vy: rand(-14, -4),
      size: rand(5, 13),
      tw: rand(0, Math.PI * 2),
      tws: rand(1.5, 4),
      star: Math.random() < 0.22,
      life: Infinity,
      age: 0,
    }
  }

  private onPointer(x: number, y: number) {
    if (this.reduced) return
    const now = performance.now()
    if (now - this.lastSpark < 45) return
    this.lastSpark = now
    this.sparks.push({
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      vx: rand(-20, 20),
      vy: rand(-30, 10),
      size: rand(5, 11),
      tw: 0,
      tws: rand(3, 6),
      star: Math.random() < 0.5,
      life: rand(0.6, 1.1),
      age: 0,
    })
    if (this.sparks.length > 60) this.sparks.shift()
  }

  // 축하: 한 점에서 꽃잎과 금가루가 부채꼴로 솟았다가 흩날린다.
  // power: 1 = 큰 축하(결정), 0.3 정도 = 할 일 하나 끝냈을 때 작은 팡
  celebrate(x = this.w / 2, y = this.h * 0.6, power = 1) {
    if (this.reduced) return
    for (let i = 0; i < Math.round(46 * power); i++) {
      const a = rand(-Math.PI * 0.92, -Math.PI * 0.08)
      const sp = rand(260, 620) * (0.6 + 0.4 * power)
      const p = this.newPetal(false, rand(0.9, 1.7))
      p.x = x
      p.y = y
      p.vx = Math.cos(a) * sp
      p.vy = Math.sin(a) * sp
      p.vflip = rand(3, 7)
      p.vrot = rand(-4, 4)
      p.life = rand(3.2, 5)
      this.bursts.push(p)
    }
    for (let i = 0; i < Math.round(70 * power); i++) {
      const a = rand(-Math.PI, 0)
      const sp = rand(120, 520) * (0.6 + 0.4 * power)
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(5, 13),
        tw: rand(0, 6),
        tws: rand(4, 8),
        star: Math.random() < 0.45,
        life: rand(1.2, 2.4),
        age: 0,
      })
    }
  }

  private start() {
    if (this.reduced || this.raf) return
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private update(dt: number) {
    this.t += dt
    const wind = Math.sin(this.t * 0.13) * 14 + Math.sin(this.t * 0.047 + 1) * 10

    const fall = (p: Petal) => {
      p.age += dt
      p.x += (p.vx + wind * p.z + Math.sin(this.t * p.swayFreq + p.phase) * p.swayAmp) * dt
      p.y += p.vy * dt
      p.rot += p.vrot * dt
      p.flip += p.vflip * dt
    }
    for (const p of [...this.petals, ...this.frontPetals]) {
      fall(p)
      if (p.y > this.h + 50 || p.x < -80 || p.x > this.w + 80) Object.assign(p, this.newPetal(false, p.z))
    }
    for (const p of this.bursts) {
      // 솟구친 뒤 공기 저항으로 느려지며 낙하 속도로 수렴
      p.vx *= Math.pow(0.12, dt)
      p.vy = p.vy * Math.pow(0.16, dt) + 60 * p.z * (1 - Math.pow(0.16, dt))
      p.vflip = Math.max(1.6, p.vflip * Math.pow(0.6, dt))
      fall(p)
    }
    this.bursts = this.bursts.filter((p) => p.age < p.life)

    for (const d of this.dust) {
      d.x += (d.vx + wind * 0.4) * dt
      d.y += d.vy * dt
      d.tw += d.tws * dt
      if (d.y < -20 || d.x < -20 || d.x > this.w + 20) Object.assign(d, this.newDust(false))
    }
    for (const s of this.sparks) {
      s.age += dt
      s.vx *= Math.pow(0.2, dt)
      s.vy = s.vy * Math.pow(0.2, dt) + 40 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.tw += s.tws * dt
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life)

    for (const b of this.bokeh) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.x < -b.r) b.x = this.w + b.r
      if (b.x > this.w + b.r) b.x = -b.r
      if (b.y < -b.r) b.y = this.h + b.r
      if (b.y > this.h + b.r) b.y = -b.r
    }
  }

  private drawPetal(g: CanvasRenderingContext2D, p: Petal, alpha: number) {
    const size = 30 * p.z
    const squash = Math.cos(p.flip)
    g.save()
    g.translate(p.x, p.y)
    g.rotate(p.rot)
    g.scale(Math.max(0.12, Math.abs(squash)), 1)
    // 옆으로 선 순간은 살짝 어둡게 해서 입체감을 준다
    g.globalAlpha = alpha * (0.7 + 0.3 * Math.abs(squash))
    g.drawImage(p.sprite, -size / 2, -size / 2, size, size)
    g.restore()
  }

  private drawDust(g: CanvasRenderingContext2D, d: Dust, alpha: number) {
    const tw = 0.55 + 0.45 * Math.sin(d.tw)
    const img = d.star ? this.starImg : this.dustImg
    const s = d.size * (d.star ? 1.6 : 1) * (0.8 + 0.3 * tw)
    g.globalAlpha = alpha * tw
    g.drawImage(img, d.x - s / 2, d.y - s / 2, s, s)
  }

  private draw() {
    const b = this.back
    const f = this.front
    b.clearRect(0, 0, this.w, this.h)
    f.clearRect(0, 0, this.w, this.h)

    for (const k of this.bokeh) {
      b.globalAlpha = 1
      b.drawImage(k.sprite, k.x - k.r, k.y - k.r, k.r * 2, k.r * 2)
    }
    // 먼 것부터 그려 겹침 순서를 맞춘다
    const sorted = [...this.petals].sort((a, c) => a.z - c.z)
    for (const p of sorted) this.drawPetal(b, p, Math.min(1, 0.6 + 0.35 * p.z))
    for (const d of this.dust) this.drawDust(b, d, 1)
    b.globalAlpha = 1

    for (const p of this.frontPetals) this.drawPetal(f, p, 0.5)
    for (const p of this.bursts) {
      const fade = Math.min(1, (p.life - p.age) / 0.8)
      this.drawPetal(f, p, 0.95 * fade)
    }
    for (const s of this.sparks) this.drawDust(f, s, Math.min(1, (s.life - s.age) / 0.4))
    f.globalAlpha = 1
  }
}

let current: PetalEngine | null = null

export function mountPetals(back: HTMLCanvasElement, front: HTMLCanvasElement): () => void {
  current?.destroy()
  current = new PetalEngine(back, front)
  return () => {
    current?.destroy()
    current = null
  }
}

// 축하 연출. 좌표를 주지 않으면 화면 가운데 아래에서 터진다.
export function celebrate(x?: number, y?: number, power = 1) {
  current?.celebrate(x, y, power)
}

// 버튼에서 터뜨릴 때 쓰는 도우미
export function celebrateFrom(el: Element | null, power = 1) {
  if (!el) return celebrate(undefined, undefined, power)
  const r = el.getBoundingClientRect()
  celebrate(r.left + r.width / 2, r.top + r.height / 2, power)
}
