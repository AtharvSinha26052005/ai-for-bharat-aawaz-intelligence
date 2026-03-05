# Frontend Setup Guide

## What We Built

A Progressive Web App (PWA) with:
- ✅ Voice input/output using Web Speech API
- ✅ Material-UI for components
- ✅ React Router for navigation
- ✅ Offline support with Service Workers
- ✅ Responsive design for all devices
- ✅ Multi-language support

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json ✅ (PWA manifest)
│   └── service-worker.js ✅ (offline support)
├── src/
│   ├── components/
│   │   ├── VoiceInterface.tsx ✅
│   │   └── Navigation.tsx ✅
│   ├── pages/
│   │   ├── Home.tsx ✅
│   │   ├── Profile.tsx ✅
│   │   ├── Schemes.tsx ✅
│   │   ├── Applications.tsx ✅
│   │   ├── FraudCheck.tsx ✅
│   │   └── Education.tsx ✅
│   ├── services/
│   │   ├── apiService.ts ✅
│   │   └── voiceService.ts ✅
│   ├── config/
│   │   └── api.ts ✅
│   ├── types/
│   │   └── index.ts ✅
│   ├── App.tsx ✅
│   └── index.tsx ✅ (with service worker registration)
└── package.json ✅
```

## Features Implemented

### 1. Voice Interface
- Speech-to-text using Web Speech API
- Text-to-speech for responses
- Works on all modern browsers
- Microphone permission handling

### 2. Pages
- **Home**: Voice assistant interface with conversation
- **Profile**: User profile creation and management
- **Schemes**: Browse and check eligible schemes
- **Applications**: Track application status and progress
- **Fraud Check**: Verify application data for fraud
- **Education**: Financial literacy modules

### 3. PWA Features
- Offline support with service worker
- App manifest for installation
- Caching strategy for assets
- Background sync capability
- Push notification support

### 4. API Integration
- Complete API service layer
- Error handling
- Loading states
- Multi-language support

## Running the Frontend

```bash
cd frontend
npm start
```

Frontend runs on: http://localhost:3001
Backend should run on: http://localhost:3000

## Environment Configuration

The `.env` file is already configured:
```
PORT=3001
REACT_APP_API_URL=http://localhost:3000/api/v1
```

## Testing the App

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Open http://localhost:3001 in your browser

4. Test voice features:
   - Click the microphone icon
   - Allow microphone permissions
   - Speak your query
   - Listen to the response

## PWA Installation

To install as a PWA:
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Or use browser menu: "Install app"

## Browser Compatibility

- Chrome/Edge: Full support (recommended)
- Firefox: Full support
- Safari: Partial support (no Web Speech API)
- Mobile browsers: Full support on Android, partial on iOS

## Next Steps for Production

1. **Environment Variables**:
   - Update `REACT_APP_API_URL` for production backend
   - Add authentication tokens if needed

2. **Build for Production**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   - Deploy `build/` folder to static hosting
   - Options: Netlify, Vercel, AWS S3 + CloudFront

4. **HTTPS Required**:
   - PWA features require HTTPS
   - Service workers require HTTPS
   - Voice API works better with HTTPS

5. **Testing**:
   - Test on real mobile devices
   - Test offline functionality
   - Test voice features in different browsers
   - Test multi-language support

## Known Limitations

1. **Web Speech API**:
   - Not supported in Safari
   - Requires internet connection
   - May have accuracy issues with accents

2. **Service Worker**:
   - Only works over HTTPS (except localhost)
   - Cache management needed for updates

3. **Mock Data**:
   - Some features use mock data for demonstration
   - Replace with real API calls as backend evolves

## Troubleshooting

### Voice not working
- Check microphone permissions
- Use Chrome or Edge browser
- Ensure HTTPS (or localhost)

### App not installing
- Check manifest.json is accessible
- Ensure HTTPS
- Check browser console for errors

### API calls failing
- Verify backend is running on port 3000
- Check CORS configuration on backend
- Verify API_URL in .env file

## Additional Features to Consider

1. **Authentication**:
   - Add login/signup pages
   - JWT token management
   - Protected routes

2. **Enhanced Voice**:
   - Voice commands for navigation
   - Continuous listening mode
   - Voice feedback for all actions

3. **Offline Features**:
   - Offline form filling
   - Background sync for submissions
   - Cached scheme data

4. **Accessibility**:
   - Screen reader support
   - Keyboard navigation
   - High contrast mode
   - Font size controls

5. **Analytics**:
   - User behavior tracking
   - Voice usage metrics
   - Error tracking
