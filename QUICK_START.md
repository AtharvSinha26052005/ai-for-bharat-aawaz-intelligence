# Quick Start Guide

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- PostgreSQL database (optional for full functionality)
- Redis (optional for caching)

## Running the Application

### Option 1: Run Both Backend and Frontend

#### Terminal 1 - Backend Server
```bash
# Install dependencies (first time only)
npm install

# Start the backend server
npm run dev
```

Backend will run on: **http://localhost:3000**

#### Terminal 2 - Frontend App
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start the frontend development server
npm start
```

Frontend will run on: **http://localhost:3001**

### Option 2: Quick Test (Backend Only)

```bash
# Start backend
npm run dev

# Test health endpoint
curl http://localhost:3000/api/v1/health
```

## Accessing the Application

1. **Frontend Web App**: http://localhost:3001
   - Modern React PWA with voice interface
   - All features accessible through UI
   - Works on desktop and mobile browsers

2. **Backend API**: http://localhost:3000/api/v1
   - RESTful API endpoints
   - See `API_DOCUMENTATION.md` for details
   - Test with `test-apis.ps1` script

## Testing Voice Features

1. Open http://localhost:3001 in Chrome or Edge (recommended)
2. Click the microphone icon on the Home page
3. Allow microphone permissions when prompted
4. Speak your query in English or other supported languages
5. Listen to the voice response

## Supported Languages

- English (en)
- Hindi (hi)
- Tamil (ta)
- Telugu (te)
- Bengali (bn)
- Marathi (mr)

## Key Features to Test

### 1. Voice Assistant (Home Page)
- Voice input and output
- Natural language queries
- Multi-language support

### 2. User Profile (Profile Page)
- Create user profile
- Save demographic information
- Update profile data

### 3. Scheme Eligibility (Schemes Page)
- Browse available schemes
- Check eligibility
- View scheme details

### 4. Application Tracking (Applications Page)
- View application status
- Track progress
- See next steps

### 5. Fraud Detection (Fraud Check Page)
- Submit application data
- Get risk assessment
- View recommendations

### 6. Financial Education (Education Page)
- Browse learning modules
- Ask questions with voice
- Access educational content

## Environment Configuration

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_pinecone_key
```

### Frontend (frontend/.env)
```env
PORT=3001
REACT_APP_API_URL=http://localhost:3000/api/v1
```

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify environment variables in `.env`
- Run `npm install` to ensure dependencies are installed

### Frontend won't start
- Check if port 3001 is available
- Verify `frontend/.env` has correct API URL
- Run `npm install` in frontend directory

### Voice not working
- Use Chrome or Edge browser (Safari not supported)
- Allow microphone permissions
- Check browser console for errors
- Ensure HTTPS or localhost

### API calls failing
- Verify backend is running on port 3000
- Check browser console for CORS errors
- Verify API_URL in frontend/.env

## Building for Production

### Backend
```bash
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

The `build/` folder will contain optimized production files ready for deployment.

## Next Steps

1. **Configure External Services**:
   - Set up PostgreSQL database
   - Configure Redis cache
   - Add OpenAI API key
   - Add Pinecone API key

2. **Test All Features**:
   - Create user profiles
   - Check scheme eligibility
   - Test voice interface
   - Try fraud detection

3. **Deploy to Production**:
   - See `DEPLOYMENT_GUIDE.md` for deployment instructions
   - Configure production environment variables
   - Set up HTTPS for PWA features

## Documentation

- `PROJECT_OVERVIEW.md` - Complete project documentation
- `API_DOCUMENTATION.md` - API endpoint reference
- `FRONTEND_SETUP.md` - Frontend setup and features
- `DEPLOYMENT_GUIDE.md` - Production deployment guide
- `FRONTEND_COMPLETION.md` - Frontend development report

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check browser console for errors
4. Verify environment configuration

## Technology Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- PostgreSQL + Redis
- OpenAI GPT-4
- Pinecone Vector DB

**Frontend:**
- React 19 + TypeScript
- Material-UI (MUI)
- Web Speech API
- Service Workers (PWA)
- React Router

## Development Tips

- Use Chrome DevTools for debugging
- Check Network tab for API calls
- Use React DevTools for component inspection
- Monitor backend logs in terminal
- Test on mobile devices for responsive design

---

**Ready to start!** Open two terminals and run the commands above to launch both backend and frontend.
