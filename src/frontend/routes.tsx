import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GameLayout from './pages/GameLayout';
import PlayerProfilePage from './pages/PlayerProfilePage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/games" replace />} />
        <Route path="/games" element={<GameLayout />} />
        <Route path="/games/:gameId" element={<GameLayout />} />
        <Route path="/players/:playerId" element={<PlayerProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;