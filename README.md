# 🤖 Kirka - AI-Powered Template Generator

> **⚠️ IMPORTANT SECURITY NOTICE**  
> For security reasons, this project is **NOT publicly deployed** and does **NOT include** my personal API key. You must create your own Gemini API key to run this application locally.

---

## 📋 Table of Contents

- [About](#-about)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Technologies Used](#️-technologies-used)
- [API Documentation](#-api-documentation)
- [Contact](#-contact)

---

## 🎯 About

**Kirka** is an AI-powered coding agent that generates complete, production-ready HTML templates using Google's Gemini AI. Built as a React.js Single Page Application (SPA), it allows users to create, customize, preview, and manage web templates through an intuitive interface.

**Key Capabilities:**

- 🎨 AI-generated HTML templates with Tailwind CSS
- 👁️ Real-time preview with responsive design testing
- 💾 Template management (CRUD operations)
- 💬 Community features (comments, likes)
- 🔐 User authentication and authorization
- 📱 Fully responsive design

**Repository:** [https://github.com/IvanIvanovJS/Kirka-Coding-Agent](https://github.com/IvanIvanovJS/Kirka-Coding-Agent)

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)
- **Google Gemini API Key** (required) - See setup instructions below

---

## 🚀 Installation & Setup

### Quick Start (TL;DR)

```bash
# Clone and navigate
git clone https://github.com/IvanIvanovJS/Kirka-Coding-Agent.git
cd Kirka-Coding-Agent

# Install all dependencies
npm run install:all

# Create .env file in client folder with your Gemini API key
cd client
echo VITE_GEMINI_API_KEY=your_api_key_here > .env
cd ..

# Start backend (Terminal 1)
npm run server

# Start frontend (Terminal 2)
npm run client
```

### Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
git clone https://github.com/IvanIvanovJS/Kirka-Coding-Agent.git
cd Kirka-Coding-Agent
```

### Step 2: Install Dependencies

**Option 1: Install All Dependencies at Once (Recommended)**

```bash
npm run install:all
```

**Option 2: Install Manually**

```bash
# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

### Step 3: Create Your Gemini API Key

**⚠️ MANDATORY STEP - The application will NOT work without this!**

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy your generated API key

**Important Security Notes:**

- Keep your API key private and never commit it to version control
- The API key is free for development use with rate limits
- For production use, consider implementing proper key management

**Detailed Instructions:**

- [How to get a Gemini API Key](https://ai.google.dev/gemini-api/docs/api-key)
- [API Key Security Best Practices](https://ai.google.dev/gemini-api/docs/api-key#security)

### Step 4: Configure Environment Variables

Create a `.env` file in the `client` directory:

```bash
# Navigate to client folder
cd client

# Create .env file
touch .env

# Return to root
cd ..
```

Add your Gemini API key to the `client/.env` file:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Example:**

```env
VITE_GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ Security Warning:**

- Never commit your `.env` file to Git (it's already in `.gitignore`)
- Never share your API key publicly
- Regenerate your key immediately if it's exposed

### Step 5: Start the Backend Server

The application uses a custom Node.js backend server for data persistence.

**In a separate terminal window:**

```bash
cd server
npm start
```

The server will start on `http://localhost:3030`

**Server Documentation:**

- [SoftUni Practice Server Documentation](https://github.com/softuni-practice-server/softuni-practice-server/blob/master/README.md)

**Server Features:**

- RESTful API endpoints
- User authentication
- Template storage
- Comment management
- Built-in admin panel at `http://localhost:3030/admin`

### Step 6: Start the Development Server

**In your main terminal window:**

```bash
cd client
npm run dev
```

The application will start on `http://localhost:5173`

### 🧪 Test Users

The backend server comes with pre-configured test users for immediate testing:

**User 1:**

- **Email:** `peter@abv.bg`
- **Password:** `123456`

**User 2:**

- **Email:** `john@abv.bg`
- **Password:** `123456`

You can use these credentials to login and test the application without creating a new account. Alternatively, you can register your own account through the registration page.

---

## 🎮 Running the Application

### Development Mode

**Option 1: Using Root Scripts (Recommended)**

1. **Start Backend Server** (Terminal 1):

   ```bash
   npm run server
   ```

   Server runs on: `http://localhost:3030`

2. **Start Frontend** (Terminal 2):

   ```bash
   npm run client
   ```

   App runs on: `http://localhost:5173`

**Option 2: Manual Start**

1. **Start Backend Server** (Terminal 1):

   ```bash
   cd server
   npm start
   ```

   Server runs on: `http://localhost:3030`

2. **Start Frontend** (Terminal 2):

   ```bash
   cd client
   npm run dev
   ```

   App runs on: `http://localhost:5173`

3. **Open your browser** and navigate to `http://localhost:5173`

4. **Login with test credentials:**
   - Email: `peter@abv.bg` or `john@abv.bg`
   - Password: `123456`

### Production Build

```bash
# Navigate to client folder
cd client

# Build for production
npm run build

# Preview production build
npm run preview
```

### Available Scripts

**Root Scripts (Convenience):**

```bash
# From project root
npm run install:all    # Install all dependencies (client + server)
npm run install:client # Install client dependencies only
npm run install:server # Install server dependencies only
npm run client         # Start client dev server
npm run server         # Start backend server
npm run build          # Build client for production
npm run preview        # Preview client production build
```

**Client Scripts:**

```bash
cd client
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

**Server Scripts:**

```bash
cd server
npm start        # Start backend server
npm run dev      # Start backend server (alias)
```

---

## 📁 Project Structure

```
Kirka-Coding-Agent/
├── client/                      # Frontend application
│   ├── public/                  # Static assets
│   │   └── styles/
│   │       └── global.css      # Global styles
│   ├── src/
│   │   ├── app/                # Main application component
│   │   │   ├── App.jsx        # Root component with routing
│   │   │   └── App.module.css # App-specific styles
│   │   ├── assets/
│   │   │   └── icons/         # SVG icon components
│   │   ├── components/
│   │   │   ├── agentApp/      # AI Agent interface
│   │   │   │   ├── chatPanel/     # Chat interface with AI
│   │   │   │   ├── previewPanel/  # Template preview
│   │   │   │   ├── sidebar/       # Templates sidebar
│   │   │   │   └── AgentApp.jsx   # Main agent component
│   │   │   ├── auth/          # Authentication components
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── logout/
│   │   │   ├── hero/          # Landing page hero section
│   │   │   ├── layout/        # Layout components
│   │   │   │   ├── header/
│   │   │   │   └── footer/
│   │   │   ├── templateDepend/ # Template-related components
│   │   │   │   ├── templates/     # Template catalog
│   │   │   │   ├── templateCard/  # Template card
│   │   │   │   └── templateDetails/ # Template details & comments
│   │   │   └── UI/            # Reusable UI components
│   │   ├── config/
│   │   │   └── aiRules.js     # AI prompt configuration
│   │   ├── contexts/          # React Context providers
│   │   │   ├── UserContext.jsx    # User authentication state
│   │   │   ├── AgentAppContext.jsx # AI agent state
│   │   │   └── index.jsx          # Context exports
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useForm.js         # Form handling
│   │   │   ├── useFetch.js        # API requests
│   │   │   ├── useLocalStorage.js # Local storage management
│   │   │   └── useCurrentTemplate.js # Template state
│   │   ├── portals/           # React Portal components
│   │   │   ├── PreviewModalPortal.jsx
│   │   │   └── DeleteConfirmationModalProtal.jsx
│   │   ├── routeGuards/       # Route protection
│   │   │   ├── AuthGuard.jsx      # Protected routes
│   │   │   └── GuestGuard.jsx     # Guest-only routes
│   │   ├── services/          # API services
│   │   │   └── aiService.js       # Gemini AI integration
│   │   ├── utils/             # Utility functions
│   │   │   ├── epochConverter.js  # Date formatting
│   │   │   ├── exportAsHtml.js    # HTML export
│   │   │   ├── toPascalCase.js    # String formatting
│   │   │   └── wrapperIframeData.js # Preview wrapper
│   │   ├── validators/        # Input validation
│   │   │   └── aiValidators.js    # AI input validation
│   │   └── main.jsx           # Application entry point
│   ├── .env                   # Environment variables (create this!)
│   ├── .gitignore             # Git ignore rules
│   ├── index.html             # HTML entry point
│   ├── package.json           # Client dependencies
│   ├── package-lock.json      # Dependency lock file
│   ├── vite.config.js         # Vite configuration
│   ├── eslint.config.js       # ESLint configuration
│   └── biome.json             # Biome configuration
├── server/                    # Backend application
│   ├── server.js              # Backend server
│   └── package.json           # Server dependencies
├── .git/                      # Git repository
├── .vscode/                   # VS Code settings
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## ✨ Features

### 🔐 Authentication System

- User registration with email validation
- Secure login/logout functionality
- Route guards for protected pages
- Guest and authenticated user access control

### 🤖 AI Template Generation

- Natural language template requests
- Real-time AI-powered code generation using Google Gemini
- Customizable template parameters (colors, sections, styles)
- Intelligent prompt engineering for optimal results
- Support for various template types (landing pages, portfolios, e-commerce, etc.)

### 👁️ Template Preview System

- Live preview in iframe with security sandboxing
- Responsive design testing (Desktop/Mobile views)
- Real-time code updates
- Download generated HTML files
- Save templates to personal collection
- Publish personal templates to public catalog

### 📚 Template Management (CRUD)

- **Create:** Generate new templates via AI
- **Read:** Browse public template catalog
- **Update:** Edit template metadata and code
- **Delete:** Remove templates from collection
- **Publish:** Share your personal templates with all users
- Personal template dashboard
- Template categorization and filtering

### 💬 Community Features

- Comment system on templates
- Comment moderation (delete own comments)
- Real-time comment updates

### 🎨 User Interface

- Modern, responsive design
- Smooth animations and transitions
- Toast notifications for user feedback
- Modal dialogs for confirmations
- Loading states and error handling
- Accessible UI components

### 🛡️ Security Features

- Environment variable protection for API keys
- XSS protection in iframe previews
- CSRF protection
- Input validation and sanitization
- Secure authentication flow

---

## 🛠️ Technologies Used

### Frontend

- **React 19.2.0** - UI library with latest features
- **React Router 7.9.6** - Client-side routing with parameters
- **Vite 7.2.4** - Fast build tool and dev server
- **SASS** - CSS preprocessor for modular styles
- **Lucide React** - Icon library

### AI Integration

- **Google Gemini API (@google/genai 1.31.0)** - AI-powered code generation
- **Gemini 2.5 Flash** - Latest model for fast responses

### Backend

- **Node.js** - JavaScript runtime
- **Custom REST API** - Built with SoftUni Practice Server
- **JSON-based storage** - File-based database

### Development Tools

- **ESLint** - Code linting
- **Biome** - Fast formatter and linter
- **Git** - Version control

### Key Libraries

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router": "^7.9.6",
  "@google/genai": "^1.31.0",
  "lucide-react": "^0.555.0"
}
```

---

## 📡 API Documentation

### Backend Endpoints

**Base URL:** `http://localhost:3030`

#### Authentication

```
POST   /users/register    - Register new user
POST   /users/login       - Login user
GET    /users/logout      - Logout user
GET    /users/me          - Get current user
```

#### Templates

```
GET    /data/templates              - Get all templates
GET    /data/templates/:id          - Get template by ID
POST   /data/templates              - Create new template
PUT    /data/templates/:id          - Update template
DELETE /data/templates/:id          - Delete template
```

#### Comments

```
GET    /data/comments               - Get all comments
GET    /data/comments?where=templateId="${id}"  - Get comments for template
POST   /data/comments               - Create comment
DELETE /data/comments/:id           - Delete comment
```

### Frontend API Service

Located in `src/services/aiService.js`:

```javascript
// Generate template with AI
generateTemplate(prompt, options);

// Validate AI input
validatePrompt(prompt);
```

---

## 👨‍💻 Contact

**Developer:** Ivan Ivanov  
**Email:** [ivanov@webmorphism.com](mailto:ivanov@webmorphism.com)  
**GitHub:** [https://github.com/IvanIvanovJS](https://github.com/IvanIvanovJS)  
**LinkedIn:** [https://www.linkedin.com/in/ivanov-webmorphism](https://www.linkedin.com/in/ivanov-webmorphism)  
**Website:** [https://www.webmorphism.com](https://www.webmorphism.com)

---

## 📄 License

This project is created for educational purposes as part of the SoftUni React.js course exam.

---

## 🙏 Acknowledgments

- **SoftUni** - For the comprehensive React.js course
- **Google Gemini AI** - For the powerful AI capabilities
- **React Team** - For the amazing framework
- **Vite Team** - For the blazing fast build tool

---

## 🐛 Troubleshooting

### Common Issues

**1. "API Key not found" error**

- Ensure you created the `.env` file in the `client` directory
- Check that the variable name is exactly `VITE_GEMINI_API_KEY`
- Restart the dev server after adding the API key

**2. "Cannot connect to server" error**

- Make sure the backend server is running (`cd server && npm start`)
- Check that port 3030 is not in use by another application
- Verify the server started successfully (check terminal output)

**3. "Module not found" errors**

- Navigate to the appropriate directory (`client` or `server`)
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**4. Templates not loading**

- Check browser console for errors
- Verify the backend server is running
- Check network tab in browser DevTools for failed requests

**5. AI generation not working**

- Verify your Gemini API key is valid
- Check your API quota hasn't been exceeded
- Ensure you have internet connection

### Getting Help

If you encounter issues not listed here:

1. Check the browser console for error messages
2. Check the server terminal for backend errors
3. Review the [GitHub Issues](https://github.com/IvanIvanovJS/Kirka-Coding-Agent/issues)
4. Contact me at [ivanov@webmorphism.com](mailto:ivanov@webmorphism.com)
