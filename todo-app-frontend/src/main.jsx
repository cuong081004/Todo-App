import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ThemeProvider from './context/ThemeProvider.jsx';
import { registerSW } from 'virtual:pwa-register';

// ✅ Register Service Worker với Workbox
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 New content available, please refresh.');
    // Có thể show UI prompt cho user reload
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline');
  },
  onRegisterError(error) {
    console.error('❌ SW registration error:', error);
  },
  onRegistered(registration) {
    console.log('✅ SW registered:', registration);
    
    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // 1 hour
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);