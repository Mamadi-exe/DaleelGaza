import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Admin from './components/Admin/Admin.jsx';
import User from './components/User/User.jsx';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/screen1" element={<User userId="+97076328285" />} />
        <Route path="/screen2" element={<User userId="+97024225252" />} />
        <Route path="/screen3" element={<User userId="user3" />} />
      </Routes>
    </Router>
  );
};

export default App;