import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PetalSky } from './effects/PetalSky'
import Index00 from './pages/00_index'
import ChatChecklist01 from './pages/01_chat_checklist'
import CardChecklist01 from './pages/01_card_checklist'
import ChatPlans02 from './pages/02_chat_plans'
import CardPlans02 from './pages/02_card_plans'
import ChatMap03 from './pages/03_chat_map'
import CardMap03 from './pages/03_card_map'
import ChatTimeline04 from './pages/04_chat_timeline'
import CardTimeline04 from './pages/04_card_timeline'

// 경로 = 파일명 = 단계_타입_기능. pieces.ts 목록과 맞춘다.
export default function App() {
  return (
    <HashRouter>
      <PetalSky />
      <Routes>
        <Route path="/" element={<Index00 />} />
        <Route path="/01_chat_checklist" element={<ChatChecklist01 />} />
        <Route path="/01_card_checklist" element={<CardChecklist01 />} />
        <Route path="/02_chat_plans" element={<ChatPlans02 />} />
        <Route path="/02_card_plans" element={<CardPlans02 />} />
        <Route path="/03_chat_map" element={<ChatMap03 />} />
        <Route path="/03_card_map" element={<CardMap03 />} />
        <Route path="/04_chat_timeline" element={<ChatTimeline04 />} />
        <Route path="/04_card_timeline" element={<CardTimeline04 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
