import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GameListPage from './pages/GameListPage';
import GameDetailPage from './pages/GameDetailPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/games" replace />} />
        <Route path="/games" element={<GameListPage />} />
        <Route path="/games/:gameId" element={<GameDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;