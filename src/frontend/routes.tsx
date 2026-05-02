import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GameLayout from './pages/GameLayout';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/games" replace />} />
        <Route path="/games" element={<GameLayout />} />
        <Route path="/games/:gameId" element={<GameLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;