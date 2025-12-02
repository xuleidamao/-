import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './views/Landing';
import { ManagerDashboard } from './views/ManagerDashboard';
import { CustomerShop } from './views/CustomerShop';

function App() {
  return (
    <Router>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-2xl overflow-hidden relative">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/manager/:stationId" element={<ManagerDashboard />} />
          <Route path="/shop/:stationId" element={<CustomerShop />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
