import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Schemes } from './pages/Schemes';
// import { Applications } from './pages/Applications';
import FraudCheck from './pages/FraudCheck';
import { Education } from './pages/Education';
import { Navigation } from './components/Navigation';
import { Language } from './types';
import { ThemeWrapper } from './theme/ThemeWrapper';

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  const handleUserIdSet = (id: string) => {
    setUserId(id);
    localStorage.setItem('userId', id);
  };

  return (
    <ThemeWrapper>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation language={language} onLanguageChange={handleLanguageChange} />
          <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
            <Routes>
              <Route path="/" element={<Home language={language} userId={userId} onUserIdSet={handleUserIdSet} />} />
              <Route path="/profile" element={<Profile language={language} userId={userId} onUserIdSet={handleUserIdSet} />} />
              <Route path="/schemes" element={<Schemes language={language} userId={userId} />} />
              {/* <Route path="/applications" element={<Applications language={language} userId={userId} />} /> */}
              <Route path="/fraud-check" element={<FraudCheck language={language} userId={userId} />} />
              <Route path="/education" element={<Education language={language} userId={userId} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeWrapper>
  );
}

export default App;
