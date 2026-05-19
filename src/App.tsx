import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  FileText, 
  Briefcase, 
  Target, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft,
  Download, 
  Copy,
  Search,
  Layout,
  LayoutGrid,
  Cpu,
  BarChart3,
  Info,
  Moon,
  Sun,
  Trash2,
  Upload,
  Users,
  UserCircle,
  Eye,
  EyeOff,
  FileDown,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Building,
  HelpCircle,
  Maximize,
  HardDrive,
  Cloud,
  RefreshCw,
  ExternalLink,
  Edit2,
  Check,
  X,
  ImagePlus,
  ShieldCheck,
  ShieldAlert,
  Linkedin,
  Sparkles,
  Pin,
  PinOff,
  Menu,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSection } from './components/SortableSection';
import { StatusIndicator } from './components/StatusIndicator';
import { Toast, ConfirmDialog } from './components/UI.tsx';
import { MODE_DESCRIPTIONS, AUDIENCES, MODEL_PRICING, TARGET_COMPANIES, BACKGROUND_THEMES } from './constants';
import { downloadDOCX, downloadJSON } from './services/exportService';
import { useResumeStore } from './store';
import { ResumeData, SuitabilityResult, Certification, MasterResume } from './types';
import { detectOverflow } from './overflowDetection';
import { useFormatting, DEFAULT_STYLE } from './context/FormattingContext';
import { optimizeResume, fetchJobDescription, analyzeBestAudiences, evaluateSuitability, OptimizationResult, EngineType, EngineConfig, autoSelectPlayerCoachRole, selectBestMasterResume } from './services/ai';
import { RouterConfig } from './services/aiRouter';
import { extractTextFromPDFFile } from './lib/pdfUtils';
import { saveAs } from 'file-saver';
const LinkedInImporter = lazy(() => import('./components/LinkedInImporter').then(m => ({ default: m.LinkedInImporter })));
const ResumeJsonViewer = lazy(() => import('./components/ResumeJsonViewer').then(m => ({ default: m.ResumeJsonViewer })));
const CareerQuiz = lazy(() => import('./components/CareerQuiz').then(m => ({ default: m.CareerQuiz })));
const JobTracker = lazy(() => import('./components/JobTracker').then(m => ({ default: m.JobTracker })));
const SkillExtractor = lazy(() => import('./components/SkillExtractor').then(m => ({ default: m.SkillExtractor })));
const ComparisonModal = lazy(() => import('./components/ComparisonModal').then(m => ({ default: m.ComparisonModal })));
const CareerQuizHelp = lazy(() => import('./components/CareerQuiz').then(m => ({ default: m.CareerQuiz }))); // Reusing for consistency if needed
const NexusProInsights = lazy(() => import('./components/NexusProInsights').then(m => ({ default: m.NexusProInsights })));

import { auth, db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc, getDocs, query, orderBy, increment, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError } from './lib/firebaseUtils';
import { OperationType } from './types';
import { DriveFolderPicker } from './components/DriveFolderPicker';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';

import defaultMasterResume from './services/master_resume.json';

// Lazy load heavy components for better initial performance
const CareerTools = lazy(() => import('./components/CareerTools').then(m => ({ default: m.CareerTools })));
const AdditionalTools = lazy(() => import('./components/AdditionalTools').then(m => ({ default: m.AdditionalTools })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ProfessionalWelcomePage = lazy(() => import('./components/ProfessionalWelcomePage').then(m => ({ default: m.ProfessionalWelcomePage })));

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-12">
    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
    <span className="text-xs font-bold uppercase tracking-widest opacity-30">Loading Module...</span>
  </div>
);

type OptimizationMode = 'conservative' | 'balanced' | 'aggressive' | 'automatic';

import { CommandPalette } from './components/CommandPalette';
import { AmbientBackground, Navbar } from './components/ui/index';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [encryptedApiKey, setEncryptedApiKey] = useState('');
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDriveFiles, setIsFetchingDriveFiles] = useState(false);
  const [renamingDriveFileId, setRenamingDriveFileId] = useState<string | null>(null);
  const [newDriveFileName, setNewDriveFileName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(() => {
    return localStorage.getItem('isDriveConnected') === 'true';
  });
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{id: string, name: string} | null>(() => {
    const saved = localStorage.getItem('selectedDriveFolder');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [firestoreReadCount, setFirestoreReadCount] = useState<number>(() => {
    const saved = localStorage.getItem('firestoreReadCount');
    return saved ? JSON.parse(saved) : 0;
  });

  const safeGetDoc = async (docRef: any) => {
    setFirestoreReadCount(prev => {
      const next = prev + 1;
      localStorage.setItem('firestoreReadCount', JSON.stringify(next));
      return next;
    });
    return await getDoc(docRef);
  };
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('driveAccessToken');
  });
  const [versioningEnabled, setVersioningEnabled] = useState(() => {
    return localStorage.getItem('versioningEnabled') === 'true';
  });
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(() => {
    return localStorage.getItem('isAutosaveEnabled') === 'true';
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    const handleToggleJson = () => setShowJsonViewer(prev => !prev);
    const handleToggleAdmin = () => setShowAdminDashboard(prev => !prev);

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('toggle-json-viewer', handleToggleJson);
    document.addEventListener('toggle-admin-dashboard', handleToggleAdmin);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('toggle-json-viewer', handleToggleJson);
      document.removeEventListener('toggle-admin-dashboard', handleToggleAdmin);
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Add resumeSource state: 'local' (default) or 'firestore'
  const [resumeSource, setResumeSource] = useState<'local' | 'firestore'>('local');
  const isInitialLoad = useRef(true);

  // Load master resume when preference changes
  useEffect(() => {
    if (resumeSource === 'firestore' && user) {
       const loadFromFirestore = async () => {
         const docRef = doc(db, 'users', user.uid);
         const docSnap = await getDoc(docRef);
         if (docSnap.exists() && docSnap.data().masterResume) {
            setResumeText(docSnap.data().masterResume);
         }
       };
       loadFromFirestore();
    } else if (resumeSource === 'local') {
        setResumeText(JSON.stringify(defaultMasterResume, null, 2));
    }
  }, [resumeSource, user]);
