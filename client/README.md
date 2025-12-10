# Kirka Client Application

Frontend React application for Kirka AI Template Generator.

## About

This is a React.js Single Page Application (SPA) that provides:

- AI-powered template generation using Google Gemini
- Real-time template preview
- Template management (CRUD)
- User authentication
- Community features (comments, likes)

## Prerequisites

- Node.js (v18 or higher)
- Google Gemini API Key

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Create `.env` file:**

```bash
touch .env
```

3. **Add your Gemini API key to `.env`:**

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

## Running the Application

**Development mode:**

```bash
npm run dev
```

The app will start on `http://localhost:5173`

**Production build:**

```bash
npm run build
```

**Preview production build:**

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- React 19.2.0
- React Router 7.9.6
- Vite 7.2.4
- Google Gemini AI (@google/genai 1.31.0)
- SASS
- Lucide React (icons)

## Project Structure

```
client/
├── public/              # Static assets
├── src/
│   ├── app/            # Main app component
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   └── main.jsx        # Entry point
├── .env                # Environment variables
├── index.html          # HTML entry point
└── vite.config.js      # Vite configuration
```

## Environment Variables

- `VITE_GEMINI_API_KEY` - Your Google Gemini API key (required)

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your generated API key

For more information, see the [main README](../README.md)
