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
import CardQuotes05 from './pages/05_card_quotes'
import CardDecide06 from './pages/06_card_decide'
import CardBudget07 from './pages/07_card_budget'
import CardDayOf08 from './pages/08_card_dayof'
import CardData09 from './pages/09_card_data'
import CardPlaces10 from './pages/10_card_places'

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
        <Route path="/05_card_quotes" element={<CardQuotes05 />} />
        <Route path="/06_card_decide" element={<CardDecide06 />} />
        <Route path="/07_card_budget" element={<CardBudget07 />} />
        <Route path="/08_card_dayof" element={<CardDayOf08 />} />
        <Route path="/09_card_data" element={<CardData09 />} />
        <Route path="/10_card_places" element={<CardPlaces10 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
