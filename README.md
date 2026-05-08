# Resume Optimizer

Resume Optimizer is a professional, AI-powered system designed to tailor your resume for maximum impact across various job applications. Leveraging Google Gemini and OpenAI engines, the application analyzes job descriptions and intelligently optimizes your existing Master Resume into a targeted, ATS-ready format.

## Features

- **AI-Powered Tailoring**: Optimize your existing resume against specific job descriptions using leading AI models (Gemini Pro, OpenAI).
- **Master Resume Hub**: Store a JSON-based master resume locally or via Google Drive.
- **Sidebars & Preview Modes**: Split-pane interface to compare original vs. generated content in real-time.
- **Customizable Styling**: Adjust typography, themes (dark/light), spacing, fonts, and specific layouts.
- **Autosave & Cloud Sync**: Save multiple version histories of your tailored resumes, and auto-sync those directly onto Google Drive or Firebase.
- **Data Export & Download**: Instantly download the resulting resume as a clean PDF or editable JSON.
- **Job Tracker Integration**: Automatically keeps track of the positions you've tailored a resume for, complete with application status tracking.

## Usage

1. **Sign In**: Either use Google Auth or create a local Firebase account to secure your saved resume versions.
2. **Setup your Master Data**: Once logged in, go to the "Profile" pane to either upload an existing JSON/PDF resume or build your master resume structurally. You can also directly replace the `src/services/master_resume.json` file in your code with your own data, and use the "Upload Master Resume" button locally to load it. The JSON supports 'tags' natively which the system and AI can use to optimize your resume based on targeted tags. Tagging is optional but highly recommended.
3. **Connect API Keys**: Navigate to "API Settings" in the Profile menu. For the application to function locally, you'll need a valid API key from Google AI Studio (Gemini) or OpenAI.
4. **Target a Job**: On the "Resume Optimizer" pane, paste the target company name, role, and the complete job description.
5. **Optimize**: Click "Optimize Resume". The AI will score your existing content against the job description and propose modifications.
6. **Review and Export**: Review the generated content in the main Stage. Tweak anything you need, navigate to the "Style" pane if you want to alter aesthetics, and click "Download PDF" to finalize.

## Local Setup Guide

If you've downloaded or cloned this repository from GitHub, follow these instructions to run the app correctly on your local machine.

### Prerequisites

- Node.js (v18 or higher recommended)
- `npm` or `yarn` installed
- A Firebase project (for Authentication & Firestore syncing)
- Your own API key from Google AI Studio (Gemini) or OpenAI. At least one API key is **mandatory** to run and optimize resumes in this app.

### 1. Install Dependencies

In the root of the project directory, run:

```bash
npm install
```

### 2. Configure Firebase

You must set up a Firebase project for Authentication and Database features:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Authentication** (specifically Email/Password and Google sign-in methods).
3. Retrieve your Firebase Configuration Object from Project Settings > General > Your Apps.
4. Inside the application workspace, create/update `src/firebase-applet-config.json` with your credentials:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

Ensure Firestore Security Rules are set to securely allow authenticated users to read and write their own documents.

### 3. Local Environment Variables (Optional)

You can provide a default Gemini API key directly to your environment by creating a `.env` file in the root of the project:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server

To spin up the app on your local machine, run:

```bash
npm run dev
```

The application should start locally (often at `http://localhost:3000` or `http://localhost:5173`).

### 5. Production Build

To build your application for production deployment, run:

```bash
npm run build
```

This will output optimized static files to the `dist` directory.

## Terms and Conditions & Privacy

This application is under active development. Users must explicitly accept the Terms and Conditions before utilizing the service. The developer is not responsible for inaccuracies or omissions resulting from AI generation. Always review your generated documents. Contact `param_jariwala@yahoo.com` with any concerns regarding privacy, data handling, or terms of service.
