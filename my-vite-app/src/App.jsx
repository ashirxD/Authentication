// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import ForgotPasswordPage from './pages/forgetPass';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Signup />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/forgetpass" element={<ForgotPasswordPage />} />
    </Routes>
  );
};

export default App;
