/**
 * ResumeDashboard.tsx
 * 
 * Main Dashboard Shell for the Nexus Resume Glass-UI application.
 * Supports resizable panels, tabbed navigation, and integrated sub-views.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Briefcase, Target, Zap, CheckCircle2, AlertCircle,
  ArrowRight, Download, Upload, Users, BarChart3, Cpu, RefreshCw,
  Cloud, Linkedin, Sparkles, ShieldCheck, ShieldAlert, ChevronRight, Settings,
  TrendingUp, TrendingDown, Eye, Copy, ExternalLink, Clock, Code,
  Building, Search, Menu, X, Bell, Trash2, Edit2, Play, Info, AlertTriangle, Key, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CareerTools } from './CareerTools';
import { JobTracker } from './JobTracker';
import { NexusProInsights } from './NexusProInsights';
import { MasterResumeManager } from './MasterResumeManager';
import { SkillExtractor } from './SkillExtractor';
import { MODE_DESCRIPTIONS, AUDIENCES, TARGET_COMPANIES } from '../constants';

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/90 border border-white/10 rounded-xl p-3 text-xs text-white backdrop-blur-md">
      <p className="opacity-50 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold my-0.5">
          {p.name}: <span className="text-white ml-1">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

interface ResumeDashboardProps {
  user: any;
  db: any;
  auth: any;
  resumeText: string;
  setResumeText: (text: string) => void;
  jobDescription: string;
  setJobDescription: (desc: string) => void;
  targetRole: string;
  setTargetRole: (role: string) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  jobUrl: string;
  setJobUrl: (url: string) => void;
  results: any;
  setResults: (res: any) => void;
  activeAudience: string;
  setActiveAudience: (aud: string) => void;
  selectedAudiences: string[];
  setSelectedAudiences: (auds: string[]) => void;
  resumeVersions: any[];
  setResumeVersions: (vers: any[]) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  driveAccessToken: string;
  setDriveAccessToken: (token: string) => void;
  isDriveConnected: boolean;
  setIsDriveConnected: (connected: boolean) => void;
  selectedDriveFolder: any;
  setSelectedDriveFolder: (folder: any) => void;
  isSelectingFolder: boolean;
  setIsSelectingFolder: (sel: boolean) => void;
  handleGoogleLogin: () => void;
  handleLogout: () => void;
  handleOptimizeResume: () => Promise<void>;
  handleStop?: () => void;
  handleDeleteVersion?: (versionId: string, versionName: string) => Promise<void>;
  isOptimizing: boolean;
  optimizationStatus: string;
  optimizationError: string | null;
  clearInputs: () => void;
  engineConfig: any;
  setEngineConfig: (config: any) => void;
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  formattingState: any;
  setFormattingState: (state: any) => void;
  isPiiMasked: boolean;
  setIsPiiMasked: (masked: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  
  // Master Resumes
  masterResumes: any[];
  setMasterResumes: React.Dispatch<React.SetStateAction<any[]>>;
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  handleSetActiveResume: (id: string) => void;
  handleDuplicateResume: (id: string) => void;

  // New API Credentials props
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  isSavingProfile: boolean;
  isApiKeySaved: boolean;
  handleSaveProfile: () => Promise<void>;
  handleResetKeys: () => Promise<void>;

  // New ATS / Pipeline Settings props
  mode: 'conservative' | 'balanced' | 'aggressive' | 'automatic';
  setMode: (mode: 'conservative' | 'balanced' | 'aggressive' | 'automatic') => void;
  fastMode: boolean;
  setFastMode: (fast: boolean) => void;
  recruiterSimulationMode: boolean;
  setRecruiterSimulationMode: (sim: boolean) => void;
  strictAtsMode: boolean;
  setStrictAtsMode: (strict: boolean) => void;
  generateCoverLetter: boolean;
  setGenerateCoverLetter: (gen: boolean) => void;
  targetCompany: string;
  setTargetCompany: (company: string) => void;
  brainDump: string;
  setBrainDump: (dump: string) => void;
  suitabilityResult: any;
  setSuitabilityResult: (res: any) => void;
  isCheckingSuitability: boolean;
  handleCheckSuitability: () => Promise<void>;
  isAutoSelectingAudiences: boolean;
  handleAutoSelectAudiences: () => Promise<void>;
}

export default function ResumeDashboard({
  user,
  db,
  auth,
  resumeText,
  setResumeText,
  jobDescription,
  setJobDescription,
  targetRole,
  setTargetRole,
  companyName,
  setCompanyName,
  jobUrl,
  setJobUrl,
  results,
  setResults,
  activeAudience,
  setActiveAudience,
  selectedAudiences,
  setSelectedAudiences,
  resumeVersions,
  setResumeVersions,
  isDarkMode,
  setIsDarkMode,
  driveAccessToken,
  setDriveAccessToken,
  isDriveConnected,
  setIsDriveConnected,
  selectedDriveFolder,
  setSelectedDriveFolder,
  isSelectingFolder,
  setIsSelectingFolder,
  handleGoogleLogin,
  handleLogout,
  handleOptimizeResume,
  handleStop,
  handleDeleteVersion,
  isOptimizing,
  optimizationStatus,
  optimizationError,
  clearInputs,
  engineConfig,
  setEngineConfig,
  selectedEngine,
  setSelectedEngine,
  formattingState,
  setFormattingState,
  isPiiMasked,
  setIsPiiMasked,
  showToast,
  masterResumes,
  setMasterResumes,
  selectedResumeId,
  setSelectedResumeId,
  handleSetActiveResume,
  handleDuplicateResume,
  geminiApiKey,
  setGeminiApiKey,
  openaiApiKey,
  setOpenaiApiKey,
  isSavingProfile,
  isApiKeySaved,
  handleSaveProfile,
  handleResetKeys,
  mode,
  setMode,
  fastMode,
  setFastMode,
  recruiterSimulationMode,
  setRecruiterSimulationMode,
  strictAtsMode,
  setStrictAtsMode,
  generateCoverLetter,
  setGenerateCoverLetter,
  targetCompany,
  setTargetCompany,
  brainDump,
  setBrainDump,
  suitabilityResult,
  setSuitabilityResult,
  isCheckingSuitability,
  handleCheckSuitability,
  isAutoSelectingAudiences,
  handleAutoSelectAudiences
}: ResumeDashboardProps) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const audienceDropdownRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (audienceDropdownRef.current && !audienceDropdownRef.current.contains(event.target as Node)) {
        setIsAudienceDropdownOpen(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [optimizerLeftWidth, setOptimizerLeftWidth] = useState(65); // percentage
  const [isResizingOptimizerColumns, setIsResizingOptimizerColumns] = useState(false);
  
  // Preview Modal States
  const [activePreviewResume, setActivePreviewResume] = useState<any>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'formatted' | 'json'>('formatted');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);

  // Filter optimizations for the last 2 days (48 hours)
  const lastTwoDaysVersions = resumeVersions.filter(v => {
    if (!v.timestamp) return false;
    try {
      const vDate = v.timestamp.toDate ? v.timestamp.toDate() : new Date(v.timestamp);
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      return vDate.getTime() >= twoDaysAgo;
    } catch (e) {
      return false;
    }
  });

  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  const startResizeRightPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRightPanel(true);
  };

  // Telemetry telemetry state
  const [usageStats, setUsageStats] = useState<any>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [quotaLimits, setQuotaLimits] = useState<Record<string, number>>({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Resize handler refs
  const sidebarResizeRef = useRef<HTMLDivElement>(null);
  const rightResizeRef = useRef<HTMLDivElement>(null);

  // Fetch telemetry
  useEffect(() => {
    if ((activeNav === 'quota' || activeNav === 'dashboard') && user) {
      const fetchTelemetry = async () => {
        setIsLoadingUsage(true);
        try {
          const usageRes = await fetch(`/api/user/usage?range=30d`, {
            headers: {
              'Authorization': `Bearer ${user.uid}`
            }
          });
          const usageData = await usageRes.json();
          if (usageData.success) {
            setUsageStats(usageData.stats);
            setUsageLogs(usageData.usageByDay || []);
          }

          const quotaRes = await fetch(`/api/quotas/config`);
          const quotaData = await quotaRes.json();
          if (quotaData.success) {
            const limitsMap: Record<string, number> = {};
            quotaData.data.forEach((q: any) => {
              limitsMap[q.model] = q.monthlyLimit;
            });
            setQuotaLimits(limitsMap);
          }
        } catch (err) {
          console.error("Failed to load telemetry:", err);
        } finally {
          setIsLoadingUsage(false);
        }
      };
      fetchTelemetry();
    }
  }, [activeNav, user]);

  // Sidebar drag resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(180, Math.min(350, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingRightPanel) {
        const newWidth = Math.max(300, Math.min(550, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
      if (isResizingOptimizerColumns) {
        const container = document.getElementById('optimizer-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const relativeX = e.clientX - rect.left;
          const percentage = Math.max(30, Math.min(80, (relativeX / rect.width) * 100));
          setOptimizerLeftWidth(percentage);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingRightPanel(false);
      setIsResizingOptimizerColumns(false);
    };

    if (isResizingSidebar || isResizingRightPanel || isResizingOptimizerColumns) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingRightPanel, isResizingOptimizerColumns]);

  const prevIsOptimizing = useRef(isOptimizing);
  useEffect(() => {
    if (prevIsOptimizing.current && !isOptimizing && Object.keys(results).length > 0) {
      // Find the first available optimized result
      const activeResult = results[activeAudience] || Object.values(results)[0];
      if (activeResult) {
        setActivePreviewResume(activeResult);
        setPreviewModalOpen(true);
        setPreviewTab('formatted');
      }
    }
    prevIsOptimizing.current = isOptimizing;
  }, [isOptimizing, results, activeAudience]);

  const handlePrintPDF = async (data: any) => {
    if (!data) return;
    const personal = data.personal_info || {};
    const summary = data.summary || "";
    const experience = data.experience || [];
    const education = data.education || [];
    const projects = data.projects || [];
    const skills = data.skills || {};
    const certifications = data.certifications || [];

    const certsHtml = certifications.length > 0 ? `
      <div>
        <div class="section-title">Certifications</div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
          ${certifications.map((cert: any) => {
            if (typeof cert === 'string') {
              return `<div style="font-size: 10.5px; color: #333;">• ${cert}</div>`;
            }
            const name = cert.name || '';
            const issuer = cert.issuer ? ` (${cert.issuer})` : '';
            const date = cert.date ? ` - ${cert.date}` : '';
            return `<div style="font-size: 10.5px; color: #333;">• <strong>${name}</strong>${issuer}${date}</div>`;
          }).join("")}
        </div>
      </div>
    ` : '';

    const skillsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 8px;">
        ${Object.entries(skills).map(([cat, list]) => {
          const skillList = Array.isArray(list) ? list.join(", ") : (typeof list === 'string' ? list : "");
          if (!skillList) return "";
          return `
            <div style="margin-bottom: 4px; page-break-inside: avoid;">
              <strong style="font-size: 11px; color: #0f766e; display: block; margin-bottom: 2px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px;">${cat}</strong>
              <span style="font-size: 10.5px; color: #444; line-height: 1.4;">${skillList}</span>
            </div>
          `;
        }).filter(Boolean).join("")}
      </div>
    `;

    const expHtml = experience.map((exp: any) => {
      const highlightsArray = Array.isArray(exp.bullets) 
        ? exp.bullets 
        : (Array.isArray(exp.highlights) 
          ? exp.highlights 
          : (typeof exp.bullets === 'string' ? [exp.bullets] : (typeof exp.highlights === 'string' ? [exp.highlights] : [])));
      const bullets = highlightsArray.map((b: string) => `
        <li style="margin-bottom: 5px; font-size: 10.5px; color: #444; line-height: 1.4;">${b}</li>
      `).join("");
      return `
        <div style="margin-bottom: 12px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-bottom: 2px;">
            <span style="font-weight: 700; font-size: 12px; color: #111;">${exp.company || exp.organization || 'Company'}</span>
            <span style="font-weight: 500;">${exp.duration || exp.dates || ''}</span>
          </div>
          <div style="font-weight: 700; font-size: 11px; color: #333; margin-bottom: 4px;">
            ${exp.role || exp.title || 'Role'}
          </div>
          <ul style="margin-top: 4px; margin-bottom: 0; padding-left: 18px;">
            ${bullets}
          </ul>
        </div>
      `;
    }).join("");

    const projHtml = projects.map((proj: any) => {
      const highlightsArray = Array.isArray(proj.bullets) 
        ? proj.bullets 
        : (Array.isArray(proj.highlights) 
          ? proj.highlights 
          : (typeof proj.bullets === 'string' ? [proj.bullets] : (typeof proj.highlights === 'string' ? [proj.highlights] : [])));
      const bullets = highlightsArray.map((b: string) => `
        <li style="margin-bottom: 5px; font-size: 10.5px; color: #444; line-height: 1.4;">${b}</li>
      `).join("");
      return `
        <div style="margin-bottom: 12px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-bottom: 2px;">
            <span style="font-weight: 700; font-size: 12px; color: #111;">${proj.title || proj.name || 'Project'}</span>
            ${proj.technologies ? `<span style="font-weight: 500; font-size: 10px; color: #555; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${proj.technologies}</span>` : ''}
          </div>
          ${proj.description ? `<p style="margin: 4px 0 6px 0; font-size: 10.5px; color: #555; line-height: 1.4;">${proj.description}</p>` : ''}
          <ul style="margin-top: 4px; margin-bottom: 0; padding-left: 18px;">
            ${bullets}
          </ul>
        </div>
      `;
    }).join("");

    const eduHtml = education.map((edu: any) => {
      if (typeof edu === 'string') {
        return `
          <div style="margin-bottom: 6px; font-size: 11px; color: #333; page-break-inside: avoid;">
            • ${edu}
          </div>
        `;
      }
      return `
        <div style="margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #444; page-break-inside: avoid;">
          <div>
            <strong style="color: #111; font-size: 11.5px;">${edu.degree || edu.degree_name || ''}</strong> ${edu.major ? `in ${edu.major}` : ''}
            <div style="color: #666; font-size: 10.5px; margin-top: 2px;">${edu.school || edu.institution || ''}</div>
          </div>
          <span style="font-weight: 500;">${edu.date || edu.duration || edu.gradYear || ''}</span>
        </div>
      `;
    }).join("");

    const htmlString = `
      <html>
        <head>
          <title>${personal.name || 'Resume'}_Optimized</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 40px;
              padding: 0;
              color: #444;
              line-height: 1.45;
              background-color: #fff;
            }
            h1, h2, h3 { margin: 0; color: #111; }
            a { color: #111; text-decoration: none; }
            .section-title {
              font-size: 12.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              border-bottom: 2px solid #10b981;
              padding-bottom: 4px;
              margin-top: 22px;
              margin-bottom: 12px;
              color: #0f766e;
            }
            .header-contacts {
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              gap: 15px;
              font-size: 10.5px;
              color: #555;
              margin-top: 6px;
            }
            ul { margin: 0; padding-left: 18px; }
            li {
              margin-bottom: 5px;
              font-size: 10.5px;
              color: #444;
              line-height: 1.4;
            }
            li::marker {
              color: #10b981;
              font-size: 8px;
            }
            @media print {
              body { margin: 20px; }
              @page { size: letter; margin: 0.4in; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">${personal.name || 'Name'}</h1>
            <div class="header-contacts">
              ${personal.email ? `<span>Email: ${personal.email}</span>` : ''}
              ${personal.phone ? `<span>Phone: ${personal.phone}</span>` : ''}
              ${personal.location ? `<span>Location: ${personal.location}</span>` : ''}
              ${personal.linkedin ? `<span>LinkedIn: ${personal.linkedin}</span>` : ''}
            </div>
          </div>

          ${summary ? `
            <div>
              <div class="section-title">Professional Summary</div>
              <p style="font-size: 11px; color: #333; margin: 0; text-align: justify;">${summary}</p>
            </div>
          ` : ''}

          ${certsHtml}

          ${skillsHtml ? `
            <div>
              <div class="section-title">Skills & Expertises</div>
              ${skillsHtml}
            </div>
          ` : ''}

          ${experience.length > 0 ? `
            <div>
              <div class="section-title">Work Experience</div>
              ${expHtml}
            </div>
          ` : ''}

          ${projects.length > 0 ? `
            <div>
              <div class="section-title">Key Projects</div>
              ${projHtml}
            </div>
          ` : ''}

          ${education.length > 0 ? `
            <div>
              <div class="section-title">Education</div>
              ${eduHtml}
            </div>
          ` : ''}
        </body>
      </html>
    `;

    setIsPdfGenerating(true);
    try {
      const sessionResponse = await fetch('/api/pdf-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlString, css: '', fonts: [], title: `${personal.name || 'Resume'}_Optimized` })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create PDF session');
      }

      const { sessionId } = await sessionResponse.json();
      const downloadUrl = `/api/download-pdf/${sessionId}`;
      
      const pdfResponse = await fetch(downloadUrl);
      if (!pdfResponse.ok) {
        throw new Error('Failed to download PDF file');
      }
      
      const blob = await pdfResponse.blob();
      
      // Auto save to Google Drive if connected
      if (driveAccessToken || process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          try {
            const driveSaveResponse = await fetch('/api/save-to-drive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pdfData: base64data,
                fileName: `${targetRole || 'Resume'}-${companyName || 'Company'}.pdf`,
                versioningEnabled: true,
                accessToken: driveAccessToken,
                parentFolderId: selectedDriveFolder?.id
              })
            });
            if (driveSaveResponse.ok) {
              showToast('Resume saved to Google Drive!', 'success');
            }
          } catch (driveErr) {
            console.error('Failed to autosave PDF to Drive:', driveErr);
          }
        };
      }
      
      // Trigger local download
      const downloadLinkUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadLinkUrl;
      a.download = `${targetRole || 'Resume'}-Harnish Jariwala.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadLinkUrl);
    } catch (e: any) {
      console.error("PDF generation failed:", e);
      showToast("PDF generation failed.", "error");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadJSON = (data: any) => {
    if (!data) return;
    const filename = `${data.personal_info?.name || 'resume'}_optimized.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("JSON file downloaded", "success");
  };

  const handleCopyText = (data: any) => {
    if (!data) return;
    const personal = data.personal_info || {};
    const summary = data.summary || "";
    const experience = data.experience || [];
    const education = data.education || [];
    const projects = data.projects || [];
    const skills = data.skills || {};

    let txt = `# ${personal.name || 'Candidate Name'}\n`;
    txt += `${personal.email || ''} | ${personal.phone || ''} | ${personal.location || ''} | ${personal.linkedin || ''}\n\n`;
    
    if (summary) {
      txt += `## Professional Summary\n${summary}\n\n`;
    }

    if (experience.length > 0) {
      txt += `## Experience\n`;
      experience.forEach((exp: any) => {
        txt += `### ${exp.role || exp.title || 'Role'} - ${exp.company || exp.organization || 'Company'} (${exp.duration || exp.dates || ''})\n`;
        const highlightsArray = Array.isArray(exp.highlights) ? exp.highlights : (typeof exp.highlights === 'string' ? [exp.highlights] : []);
        highlightsArray.forEach((h: string) => {
          txt += `- ${h}\n`;
        });
        txt += `\n`;
      });
    }

    if (projects.length > 0) {
      txt += `## Projects\n`;
      projects.forEach((p: any) => {
        txt += `### ${p.name || p.title || 'Project'} ${p.technologies ? `(${p.technologies})` : ''}\n`;
        if (p.description) txt += `${p.description}\n`;
        const highlightsArray = Array.isArray(p.highlights) ? p.highlights : (typeof p.highlights === 'string' ? [p.highlights] : []);
        highlightsArray.forEach((h: string) => {
          txt += `- ${h}\n`;
        });
        txt += `\n`;
      });
    }

    if (Object.keys(skills).length > 0) {
      txt += `## Skills\n`;
      Object.entries(skills).forEach(([cat, list]) => {
        const skillList = Array.isArray(list) ? list.join(", ") : (typeof list === 'string' ? list : "");
        if (skillList) {
          txt += `- **${cat}**: ${skillList}\n`;
        }
      });
      txt += `\n`;
    }

    if (education.length > 0) {
      txt += `## Education\n`;
      education.forEach((edu: any) => {
        txt += `- **${edu.degree || edu.degree_name || ''}** ${edu.major ? `in ${edu.major}` : ''} - ${edu.school || edu.institution || ''} (${edu.date || edu.duration || edu.gradYear || ''})\n`;
      });
    }

    navigator.clipboard.writeText(txt);
    showToast("Resume copied to clipboard as Markdown!", "success");
  };

  const handleAddMasterResume = (newResume: any) => {
    setMasterResumes(prev => [...prev, newResume]);
  };

  const handleUpdateMasterResume = (updatedResume: any) => {
    setMasterResumes(prev => prev.map(r => r.id === updatedResume.id ? updatedResume : r));
  };

  const handleDeleteMasterResume = (id: string) => {
    if (masterResumes.length <= 1) {
      showToast("Cannot delete the last master resume.", "error");
      return;
    }
    setMasterResumes(prev => prev.filter(r => r.id !== id));
  };

  const handleImportToMaster = (data: any) => {
    if (!data) return;
    if (masterResumes.length >= 5) {
      showToast("Cannot add. Max 5 master resumes allowed. Delete a profile from Firestore profile list first.", "error");
      return;
    }
    const name = prompt("Enter a name for this Master Resume profile:", `Optimized - ${companyName || 'Profile'}`);
    if (!name) return;
    const newResume = {
      id: Date.now().toString(),
      name: name,
      data: JSON.stringify(data, null, 2),
      createdAt: Date.now(),
      isActive: false
    };
    setMasterResumes(prev => [...prev, newResume]);
    showToast("Successfully added to Master Resumes list!", "success");
  };

  // Sync Google Drive status manually
  const checkDriveConnection = async () => {
    if (!driveAccessToken) {
      showToast("Google Drive not connected. Authenticating...", "info");
      handleGoogleLogin();
    } else {
      setIsSelectingFolder(true);
    }
  };

  // Determine current engine description for the badge display
  const getActiveEngineDetails = () => {
    const isGemini = selectedEngine === 'gemini' || selectedEngine.startsWith('hybrid');
    
    if (activeNav === 'optimizer') {
      if (!isGemini) {
        const modelName = engineConfig.openai?.model || 'gpt-4o';
        return {
          active: modelName.toUpperCase(),
          fallbacks: [],
          color: "from-purple-500/20 to-pink-500/10 border-purple-500/30"
        };
      }
      
      const model = engineConfig.gemini?.model || 'gemini-3.1-pro-preview';
      if (model === 'gemini-3.1-pro-preview') {
        return {
          active: "Gemini 3.1 Pro",
          fallbacks: ["Gemini 3.5 Flash", "Gemini 3.1 Flash Lite"],
          color: "from-emerald-500/20 to-blue-500/10 border-emerald-500/30"
        };
      } else if (model === 'gemini-3.1-flash-lite') {
        return {
          active: "Gemini 3.1 Flash Lite",
          fallbacks: ["Gemini 3.5 Flash"],
          color: "from-blue-500/20 to-teal-500/10 border-blue-500/30"
        };
      } else if (model === 'gemini-3.5-flash') {
        return {
          active: "Gemini 3.5 Flash",
          fallbacks: ["Gemini 3.1 Flash Lite"],
          color: "from-teal-500/20 to-blue-500/10 border-teal-500/30"
        };
      } else {
        return {
          active: "Gemini 3.5 Flash Lite",
          fallbacks: ["Gemini 3.5 Flash"],
          color: "from-blue-500/20 to-purple-500/10 border-blue-500/30"
        };
      }
    }
    
    // For other views/tools
    if (!isGemini) {
      return {
        active: "GPT-4o Mini",
        fallbacks: [],
        color: "from-purple-500/20 to-pink-500/10 border-purple-500/30"
      };
    }
    return {
      active: "Gemini 3.5 Flash Lite",
      fallbacks: ["Gemini 3.5 Flash"],
      color: "from-blue-500/20 to-purple-500/10 border-blue-500/30"
    };
  };

  const engineDetails = getActiveEngineDetails();

  return (
    <div className={`h-screen flex overflow-hidden font-sans text-white bg-[#04050b] relative z-0`}>
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-[-2] pointer-events-none overflow-hidden bg-[#04050b]">
        <div className="absolute w-[600px] h-[600px] rounded-full top-[-10%] left-[-10%] bg-radial-gradient from-blue-500/5 to-transparent filter blur-3xl opacity-50" />
        <div className="absolute w-[600px] h-[600px] rounded-full bottom-[-10%] right-[-10%] bg-radial-gradient from-emerald-500/5 to-transparent filter blur-3xl opacity-50" />
      </div>

      {/* ─── SIDEBAR PANEL ─── */}
      <aside 
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className="flex flex-col h-full bg-black/40 border-r border-white/5 backdrop-blur-md relative select-none"
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <Cpu className="w-5 h-5 text-black font-bold" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest uppercase bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">NEXUS AI</h1>
              <p className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase">GLASS WORKSPACE</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-4 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 uppercase text-xs">
            {user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold block truncate">{user?.email}</span>
            <span className="text-[9px] uppercase font-bold text-emerald-500/80">Premium Account</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 space-y-5 custom-scrollbar">
          {/* Main Group */}
          <div>
            <span className="px-3 text-[9px] font-black uppercase text-white/30 tracking-widest block mb-2">Main Shell</span>
            <button 
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'dashboard' ? 'bg-white/10 border-l-2 border-emerald-400 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Workspace Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveNav('optimizer')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                activeNav === 'optimizer' ? 'bg-white/10 border-l-2 border-emerald-400 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>ATS Optimizer</span>
            </button>
          </div>

          {/* Tools Group */}
          <div>
            <span className="px-3 text-[9px] font-black uppercase text-white/30 tracking-widest block mb-2">Power Tools</span>
            {[
              { id: 'tracker', label: 'Job Tracker', icon: Briefcase },
              { id: 'audiences', label: 'Audiences Matrix', icon: Users },
              { id: 'insights', label: 'AI Strategy Insights', icon: Sparkles },
              { id: 'skills', label: 'Skills', icon: Key },
              { id: 'quota', label: 'Quota Dashboard', icon: Cpu },
              { id: 'tools', label: 'Career Tools Suite', icon: Zap }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveNav(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                  activeNav === t.id ? 'bg-white/10 border-l-2 border-emerald-400 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          {/* Master Resumes Section */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Nexus Master Resumes</span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">{masterResumes.length}/5</span>
            </div>
            {masterResumes.length === 0 ? (
              <p className="px-3 text-[10px] text-white/30 italic">No master resumes loaded.</p>
            ) : (
              <div className="space-y-1.5 px-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                {masterResumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => handleSetActiveResume(resume.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left border ${
                      resume.isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                        : 'bg-white/5 border-transparent text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${resume.isActive ? 'text-emerald-400' : 'text-neutral-500'}`} />
                      <span className="truncate text-[10.5px]">{resume.name}</span>
                    </div>
                    {resume.isActive ? (
                      <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-black shrink-0">ACTIVE</span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="px-2 pt-1">
              <button 
                onClick={() => setActiveNav('tools')}
                className="w-full text-center text-[10px] uppercase tracking-wider font-bold text-neutral-400 hover:text-emerald-400 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 hover:border-emerald-500/30"
              >
                Manage / Upload
              </button>
            </div>
          </div>
        </div>
        {/* Sidebar Footer Link Profile/Settings & Drive status */}
        <div className="p-3 border-t border-white/5 bg-black/20 space-y-1">
          {/* Drive info */}
          <div className="w-full px-3 py-2 rounded-xl text-[11px] font-bold text-neutral-400 bg-white/0 border border-transparent space-y-1">
            <button 
              onClick={checkDriveConnection}
              className="w-full flex items-center justify-between hover:text-white transition-all focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5" />
                <span>Google Drive Backup</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                isDriveConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-500/20 text-neutral-400'
              }`}>
                {isDriveConnected ? 'SYNCED' : 'DISCONNECTED'}
              </span>
            </button>
            {isDriveConnected && (
              <div className="pl-5 text-[9px] text-white/50 flex items-center gap-1">
                <span className="opacity-50">Folder:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[120px]" title={selectedDriveFolder?.name || 'My Drive'}>
                  {selectedDriveFolder?.name || 'My Drive'}
                </span>
              </div>
            )}
          </div>

          {/* Settings Tab trigger */}
          <button 
            onClick={() => setActiveNav('profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeNav === 'profile' ? 'bg-white/10 border-l-2 border-emerald-400 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Profile Settings</span>
          </button>
        </div>

        {/* Drag resizing handle */}
        <div 
          ref={sidebarResizeRef}
          onMouseDown={startResizeSidebar}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/20 active:bg-emerald-500/50 transition-colors z-50"
        />
      </aside>

      {/* ─── MIDDLE WORKSPACE PANE ─── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Dynamic header with active engine display */}
        <header className="h-14 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              {activeNav.toUpperCase()} VIEW
            </span>
          </div>

          {/* Active AI Engine Banner */}
          <div className={`flex items-center gap-3 px-3 py-1 bg-gradient-to-r ${engineDetails.color} border rounded-full backdrop-blur-md`}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase">Active: {engineDetails.active}</span>
            </div>
            {engineDetails.fallbacks.length > 0 && (
              <>
                <div className="w-[1px] h-3 bg-white/10" />
                <span className="text-[9px] text-white/50 font-bold">
                  Fallback: {engineDetails.fallbacks.join(" → ")}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Workspace content scroll container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            
            {/* 1. Dashboard Tab */}
            {activeNav === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Metrics Stats grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Optimizations', value: resumeVersions.length || 0, sub: 'All version files', icon: Zap, color: 'text-emerald-400' },
                    { label: 'Active Targets', value: selectedAudiences.length || 0, sub: 'Optimized profiles', icon: Users, color: 'text-blue-400' },
                    { label: 'Tracked Jobs', value: '12', sub: 'Applications in progress', icon: Briefcase, color: 'text-purple-400' },
                    { label: 'Token Consumption', value: usageStats?.totalTokens ? `${Math.round(usageStats.totalTokens / 1000)}k` : '0k', sub: '30d cumulative usage', icon: Cpu, color: 'text-amber-400' }
                  ].map((s, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black tracking-wider uppercase text-white/40">{s.label}</span>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <div className="text-2xl font-black">{s.value}</div>
                      <div className="text-[9px] text-neutral-400 mt-1">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Area Charts of Token Usage */}
                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Token Consumption History</h3>
                      <p className="text-[10px] opacity-40">Grouped daily analytics over past 30 days</p>
                    </div>
                  </div>
                  <div className="h-56">
                    {usageLogs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs opacity-30 italic">No usage history recorded.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={usageLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} />
                          <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                          <Tooltip content={<DarkTooltip />} />
                          <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#10b981" fillOpacity={1} fill="url(#colorTokens)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Today's Optimized Resumes Table */}
                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Optimizations (Last 2 Days)</h3>
                      <p className="text-[10px] opacity-40">Click details to view JSON or export PDF metadata</p>
                    </div>
                    {selectedVersionIds.length > 0 && (
                      <button 
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete the ${selectedVersionIds.length} selected optimizations? This will sync and remove any corresponding backup files from Google Drive as well.`)) {
                            const idsToDelete = [...selectedVersionIds];
                            setSelectedVersionIds([]); // clear selection first
                            const promises = idsToDelete.map(async (id) => {
                              const version = resumeVersions.find(v => v.id === id);
                              if (version && handleDeleteVersion) {
                                return handleDeleteVersion(id, version.name);
                              }
                            });
                            await Promise.all(promises);
                            showToast(`Successfully deleted ${idsToDelete.length} optimizations.`, "success");
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-rose-600 transition-all inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedVersionIds.length})
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                    {lastTwoDaysVersions.length === 0 ? (
                      <div className="p-8 text-center text-xs opacity-30 italic">No optimized resumes generated in the last 2 days. Get started with ATS Optimizer!</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-neutral-400 font-black tracking-widest uppercase sticky top-0 bg-[#0c0d14] z-10">
                            <th className="pb-3 w-8">
                              <input 
                                type="checkbox" 
                                checked={lastTwoDaysVersions.length > 0 && selectedVersionIds.length === lastTwoDaysVersions.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVersionIds(lastTwoDaysVersions.map(v => v.id));
                                  } else {
                                    setSelectedVersionIds([]);
                                  }
                                }}
                                className="rounded bg-white/10 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                            </th>
                            <th className="pb-3">Timestamp</th>
                            <th className="pb-3">Target Profile</th>
                            <th className="pb-3">Target Company</th>
                            <th className="pb-3">Primary Audience</th>
                            <th className="pb-3">ATS Score</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastTwoDaysVersions.map((v, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                              <td className="py-3.5">
                                <input 
                                  type="checkbox" 
                                  checked={selectedVersionIds.includes(v.id)}
                                  onChange={() => {
                                    setSelectedVersionIds(prev => 
                                      prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                                    );
                                  }}
                                  className="rounded bg-white/10 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 font-medium">
                                {v.timestamp?.toDate ? v.timestamp.toDate().toLocaleString() : new Date(v.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3.5 font-bold text-white">{v.name || 'Job Tailoring'}</td>
                              <td className="py-3.5 text-neutral-300">{v.data?.companyName || 'N/A'}</td>
                              <td className="py-3.5">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  {v.data?.activeAudience || 'custom'}
                                </span>
                              </td>
                              <td className="py-3.5">
                                {(() => {
                                  const resumeData = v.data?.results?.[v.data?.activeAudience] || v.data?.results?.[Object.keys(v.data?.results || {})[0]] || v.data;
                                  const oldScore = resumeData?.baseline_score;
                                  const newScore = resumeData?.match_score;
                                  if (oldScore !== undefined && newScore !== undefined) {
                                    return (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                                        <span className="text-rose-400">{oldScore}%</span>
                                        <span className="opacity-45">➔</span>
                                        <span className="text-emerald-400">{newScore}%</span>
                                      </span>
                                    );
                                  }
                                  return <span className="opacity-30">-</span>;
                                })()}
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                <button 
                                  onClick={() => {
                                    const resumeData = v.data?.results?.[v.data?.activeAudience] || v.data?.results?.[Object.keys(v.data?.results || {})[0]] || v.data;
                                    setActivePreviewResume(resumeData);
                                    setPreviewModalOpen(true);
                                    setPreviewTab('formatted');
                                  }}
                                  className="px-3 py-1.5 rounded bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider hover:bg-emerald-400 transition-all inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Preview & Export
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this optimization version? This will sync and remove any corresponding backup files from Google Drive as well.")) {
                                      handleDeleteVersion && handleDeleteVersion(v.id, v.name);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. Optimizer Tab */}
            {activeNav === 'optimizer' && (
              <motion.div 
                key="optimizer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-7xl w-full"
              >
                <div 
                  id="optimizer-container"
                  className="flex flex-col lg:flex-row gap-5 relative items-stretch"
                >
                  {/* Left Column */}
                  <div 
                    style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${optimizerLeftWidth}%` : '100%' }}
                    className="space-y-6 transition-all duration-75 shrink-0"
                  >
                    {/* Tailored Content Engine Card */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Tailored Content Engine</h2>
                          <p className="text-[10px] opacity-40">Generate highly structured target variants targeting recruitment ATS parameters.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Target Role</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Senior Staff Engineer"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Target Company Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Stripe"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            autoComplete="off"
                            data-1p-ignore
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50">Auto-Import Job Description (URL)</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            name="job-description-url-input-field"
                            id="job-description-url-input-field"
                            placeholder="Paste Job Listing URL here..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            autoComplete="new-password"
                            data-1p-ignore
                            data-lpignore="true"
                          />
                          <button 
                            onClick={() => {
                              if (jobUrl) showToast("Auto-fetching job contents...", "info");
                            }}
                            className="px-4 py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/15"
                          >
                            Fetch
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 font-black">Paste Job Description Text</label>
                        <textarea 
                          rows={8}
                          placeholder="Paste full text requirements here..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 custom-scrollbar resize-y"
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                        />
                      </div>

                      {isOptimizing && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-400 animate-pulse">Running Nexus AI Optimization Pipeline...</span>
                            <span>{optimizationStatus}</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '65%' }} />
                          </div>
                        </div>
                      )}

                      {isCheckingSuitability && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-400 animate-pulse">Running Nexus AI Suitability Check...</span>
                            <span>Evaluating job fit metrics...</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '45%' }} />
                          </div>
                        </div>
                      )}

                      {optimizationError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                          {optimizationError}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5 justify-end">
                        <button 
                          onClick={clearInputs}
                          className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5"
                        >
                          Clear Inputs
                        </button>
                        <button
                          onClick={handleCheckSuitability}
                          disabled={isCheckingSuitability || (!jobDescription && !jobUrl) || !resumeText}
                          className="px-4 py-2.5 rounded-xl border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/5 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                          <Search className="w-3.5 h-3.5" /> Quick Check Suitability
                        </button>
                        {isOptimizing ? (
                          <button 
                            onClick={handleStop}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <X className="w-3.5 h-3.5" /> Stop Optimization
                          </button>
                        ) : (
                          <button 
                            onClick={handleOptimizeResume}
                            disabled={!jobDescription || !resumeText}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-2"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" /> Run Optimization
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Corporate DNA Tailoring (Nexus Pro) */}
                    <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-purple-400">Advanced "Nexus Pro" Intelligence</h2>
                          <p className="text-[10px] opacity-40">Tailor your profile with targeted corporate signals and unstructured career context.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Corporate DNA Selector */}
                        <div className="relative" ref={companyDropdownRef}>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 font-black">Corporate DNA Tailoring</label>
                          <button
                            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                            className="w-full px-4 py-3 text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{TARGET_COMPANIES.find(c => c.id === targetCompany)?.icon || '🏢'}</span>
                              <div className="text-left">
                                <div className="font-bold text-white">{TARGET_COMPANIES.find(c => c.id === targetCompany)?.label || 'General DNA'}</div>
                                <div className="text-[9px] opacity-40 font-medium tracking-tight">Signal: {TARGET_COMPANIES.find(c => c.id === targetCompany)?.signal || 'Broad compliance match'}</div>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {isCompanyDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 mt-2 p-2 rounded-xl border border-white/10 bg-neutral-950 shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar"
                              >
                                {TARGET_COMPANIES.map((company) => (
                                  <button
                                    key={company.id}
                                    onClick={() => {
                                      setTargetCompany(company.id);
                                      setIsCompanyDropdownOpen(false);
                                    }}
                                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left ${
                                      targetCompany === company.id 
                                        ? 'bg-purple-500/20 text-purple-400' 
                                        : 'hover:bg-white/5 text-white/70'
                                    }`}
                                  >
                                    <span className="text-xl shrink-0">{company.icon}</span>
                                    <div>
                                      <div className="text-xs font-bold">{company.label}</div>
                                      <div className="text-[9px] opacity-50 font-medium">Signal: {company.signal}</div>
                                    </div>
                                    {targetCompany === company.id && <Check className="w-3.5 h-3.5 ml-auto text-purple-400" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Brain Dump Input */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 font-black">The "Brain Dump" Context</label>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              <span className="text-[8px] font-black uppercase text-purple-400">Long Context Mode</span>
                            </div>
                          </div>
                          <p className="text-[9px] opacity-40 font-medium leading-tight mb-2 italic">Paste raw annual reviews, GitHub logs, or unstructured notes here. AI will sift for gold.</p>
                          <textarea
                            placeholder="Dump unstructured data (reviews, wikis, logs)..."
                            className="w-full h-28 p-4 text-xs bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:border-purple-500 transition-all resize-none leading-relaxed"
                            value={brainDump}
                            onChange={(e) => setBrainDump(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Suitability check results */}
                    {suitabilityResult && (
                      <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            {suitabilityResult.verdict === 'Strong Match' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {suitabilityResult.verdict === 'Stretch Role' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                            {suitabilityResult.verdict === 'Not Recommended' && <AlertCircle className="w-5 h-5 text-red-400" />}
                            <span className={`font-black uppercase text-xs tracking-wider ${
                              suitabilityResult.verdict === 'Strong Match' ? 'text-emerald-400' :
                              suitabilityResult.verdict === 'Stretch Role' ? 'text-amber-400' :
                              'text-red-400'
                            }`}>
                              {suitabilityResult.verdict}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-black px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white">
                              {suitabilityResult.matchScore}% Suitability
                            </div>
                            {suitabilityResult.matchScore >= 85 && (
                              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg animate-pulse flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 fill-current" />
                                FAANG READY
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-white/80 leading-relaxed font-medium">
                          {suitabilityResult.reasoning}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {suitabilityResult.dealbreakers?.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Dealbreakers / Gaps</span>
                              <ul className="space-y-1">
                                {suitabilityResult.dealbreakers.map((db: string, i: number) => (
                                  <li key={i} className="text-[11px] text-neutral-300 flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-red-500 mt-0.5">•</span> {db}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {suitabilityResult.strengths?.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Key Strengths</span>
                              <ul className="space-y-1">
                                {suitabilityResult.strengths.map((str: string, i: number) => (
                                  <li key={i} className="text-[11px] text-neutral-300 flex items-start gap-1.5 leading-relaxed">
                                    <span className="text-emerald-500 mt-0.5">•</span> {str}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {suitabilityResult.critique && suitabilityResult.critique.length > 0 && (
                          <div className="border-t border-white/5 pt-4 mt-2 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <ShieldAlert className="w-4 h-4 text-red-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Expert Audit (Red Team)</span>
                              {suitabilityResult.readinessScore !== undefined && (
                                 <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded">
                                   Ready: {suitabilityResult.readinessScore}%
                                 </span>
                              )}
                            </div>
                            <div className="space-y-3">
                              {suitabilityResult.critique.map((item: any, i: number) => (
                                <div key={i} className="flex gap-2.5">
                                  <div className={`w-1.5 shrink-0 rounded-full mt-1.5 h-1.5 ${
                                    item.severity === 'high' ? 'bg-red-500' :
                                    item.severity === 'medium' ? 'bg-orange-500' :
                                    'bg-blue-400'
                                  }`} />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                       <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{item.category}</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-neutral-300">
                                      {item.feedback}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resizer Handle */}
                  <div 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsResizingOptimizerColumns(true);
                    }}
                    className="hidden lg:flex w-1.5 hover:w-2 hover:bg-emerald-500/50 bg-white/5 border-l border-r border-white/10 cursor-col-resize select-none items-center justify-center transition-all group self-stretch py-12 rounded-full"
                    title="Drag to resize columns"
                  >
                    <div className="w-[1.5px] h-6 bg-white/20 group-hover:bg-white/60 rounded-full" />
                  </div>

                  {/* Right Column */}
                  <div 
                    style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `calc(${100 - optimizerLeftWidth}% - 20px)` : '100%' }}
                    className="space-y-6 transition-all duration-75 shrink-0"
                  >
                    {/* AI Engine Selection Card */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 font-black">AI Engine Configuration</h2>
                          <p className="text-[10px] opacity-40">Choose the language model engine powering the optimization.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 font-black">Select Engine</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['gemini', 'openai', 'hybrid-gemini', 'hybrid-openai'] as const).map((eng) => (
                              <button
                                key={eng}
                                onClick={() => setSelectedEngine(eng)}
                                className={`py-2 text-[10px] font-black rounded-lg border transition-all capitalize tracking-wider ${
                                  selectedEngine === eng 
                                    ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                                }`}
                              >
                                {eng.replace('hybrid-', 'Hybrid ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {!selectedEngine.startsWith('hybrid') && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 font-black">Model Version</label>
                            <div className="relative">
                              <select 
                                className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-neutral-900 text-white border-white/10"
                                value={engineConfig[selectedEngine === 'gemini' ? 'gemini' : 'openai']?.model || ''}
                                onChange={(e) => setEngineConfig({
                                  ...engineConfig,
                                  [selectedEngine === 'gemini' ? 'gemini' : 'openai']: { 
                                    ...engineConfig[selectedEngine === 'gemini' ? 'gemini' : 'openai'], 
                                    model: e.target.value 
                                  }
                                })}
                              >
                                {selectedEngine === 'gemini' && (
                                  <>
                                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                                  </>
                                )}
                                {selectedEngine === 'openai' && (
                                  <>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="o1-preview">o1 Preview</option>
                                    <option value="o1-mini">o1 Mini</option>
                                  </>
                                )}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Optimization Settings Card */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Pipeline Settings</h2>
                          <p className="text-[10px] opacity-40">Fine-tune translation strictness and simulation components.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Optimization Mode */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 font-black">Optimization Mode</label>
                            <button 
                              onClick={() => setShowModeInfo(!showModeInfo)}
                              className="text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>
                          <AnimatePresence>
                            {showModeInfo && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-3 p-3 rounded-xl text-xs leading-relaxed border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              >
                                <p className="font-bold mb-1 uppercase tracking-wider text-[9px]">Mode Details:</p>
                                <ul className="space-y-1 text-[10px]">
                                  <li><span className="font-bold text-emerald-400">Conservative:</span> {MODE_DESCRIPTIONS.conservative}</li>
                                  <li><span className="font-bold text-emerald-400">Balanced:</span> {MODE_DESCRIPTIONS.balanced}</li>
                                  <li><span className="font-bold text-emerald-400">Aggressive:</span> {MODE_DESCRIPTIONS.aggressive}</li>
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="grid grid-cols-3 gap-2">
                            {(['conservative', 'balanced', 'aggressive'] as const).map((m) => (
                              <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`py-2.5 text-[10px] font-black rounded-lg border transition-all capitalize tracking-wider ${
                                  mode === m 
                                    ? 'bg-emerald-500 text-black border-emerald-500'
                                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Recruiter Simulation Toggle */}
                        <div>
                          <button
                            onClick={() => setRecruiterSimulationMode(!recruiterSimulationMode)}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                              recruiterSimulationMode
                                ? 'bg-red-500/15 border-red-500/30 text-red-200 shadow-md shadow-red-500/10'
                                : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                            }`}
                          >
                            <span className="font-black uppercase tracking-wider text-[10px]">Recruiter Simulation</span>
                            <div className={`w-2.5 h-2.5 rounded-full ${recruiterSimulationMode ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'}`} />
                          </button>
                        </div>

                        {/* Additional Checklist options */}
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={fastMode} 
                              onChange={(e) => setFastMode(e.target.checked)}
                              className="accent-emerald-500 w-4 h-4 rounded border-white/10"
                            />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">Fast Mode (Use Flash Model)</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={strictAtsMode} 
                              onChange={(e) => setStrictAtsMode(e.target.checked)}
                              className="accent-emerald-500 w-4 h-4 rounded border-white/10"
                            />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">Strict ATS Mode (Zero Hallucination)</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={generateCoverLetter} 
                              onChange={(e) => setGenerateCoverLetter(e.target.checked)}
                              className="accent-emerald-500 w-4 h-4 rounded border-white/10"
                            />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">Auto-Generate Cover Letter</span>
                          </label>
                        </div>

                        {/* API keys credentials & save under settings */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-2">API Credentials</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1 font-black">Gemini Key</label>
                              <input 
                                type="password"
                                placeholder={isApiKeySaved ? "••••••••••••" : "Gemini API key..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500 transition-all"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1 font-black">OpenAI Key</label>
                              <input 
                                type="password"
                                placeholder={isApiKeySaved ? "••••••••••••" : "OpenAI API key..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500 transition-all"
                                value={openaiApiKey}
                                onChange={(e) => setOpenaiApiKey(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            {isApiKeySaved && (
                              <button 
                                onClick={handleResetKeys}
                                className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/5 transition-all"
                              >
                                Reset Keys
                              </button>
                            )}
                            <button 
                              onClick={handleSaveProfile}
                              disabled={isSavingProfile}
                              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                              {isSavingProfile ? 'Saving...' : 'Save Settings & Keys'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Job Analysis: Select Target Audiences Card */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Job Analysis (Target Audiences)</h2>
                          <p className="text-[10px] opacity-40">Choose which sector profiles to auto-optimize during pipeline runs.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="relative" ref={audienceDropdownRef}>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 font-black">Audience Scope</label>
                          <button
                            onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                            className="w-full px-4 py-3 text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl flex items-center justify-between transition-all"
                          >
                            <span className="font-bold text-white">
                              {selectedAudiences.length === 0 ? 'Select Audiences...' : `${selectedAudiences.length} Scope(s) Active`}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isAudienceDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {isAudienceDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 mt-2 p-2 rounded-xl border border-white/10 bg-neutral-950 shadow-2xl z-50 space-y-1 max-h-60 overflow-y-auto"
                              >
                                {AUDIENCES.map((aud) => (
                                  <button
                                    key={aud.id}
                                    onClick={() => {
                                      if (selectedAudiences.includes(aud.id)) {
                                        setSelectedAudiences(selectedAudiences.filter((a: string) => a !== aud.id));
                                      } else {
                                        setSelectedAudiences([...selectedAudiences, aud.id]);
                                      }
                                    }}
                                    className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all text-left ${
                                      selectedAudiences.includes(aud.id) 
                                        ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                                        : 'hover:bg-white/5 text-white/70'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={selectedAudiences.includes(aud.id)}
                                      readOnly
                                      className="accent-emerald-500 w-3.5 h-3.5 rounded border-white/10 pointer-events-none"
                                    />
                                    <span className="text-xs flex-1">{aud.label}</span>
                                    {selectedAudiences.includes(aud.id) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {selectedAudiences.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {selectedAudiences.map((audId) => {
                                const aud = AUDIENCES.find(a => a.id === audId);
                                return (
                                  <div 
                                    key={audId} 
                                    className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-1.5 font-bold"
                                  >
                                    <span>{aud ? aud.label : audId}</span>
                                    <button 
                                      onClick={() => setSelectedAudiences(selectedAudiences.filter(a => a !== audId))}
                                      className="text-emerald-400/60 hover:text-emerald-400 font-black transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedAudiences([])}
                            className="flex-1 py-2 text-[10px] font-bold rounded-lg border border-white/10 text-white/60 hover:bg-white/5 transition-all uppercase tracking-wider"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleAutoSelectAudiences}
                            disabled={isAutoSelectingAudiences || !jobDescription}
                            className="flex-1 py-2 text-[10px] font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            {isAutoSelectingAudiences ? (
                              <>
                                <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              'Auto-Select'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Job Tracker Tab */}
            {activeNav === 'tracker' && (
              <motion.div 
                key="tracker"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <JobTracker 
                  isDarkMode={isDarkMode} 
                  engineConfig={engineConfig} 
                  selectedEngine={selectedEngine} 
                  user={user} 
                />
              </motion.div>
            )}

            {/* 4. Audiences Tab */}
            {activeNav === 'audiences' && (
              <motion.div 
                key="audiences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs leading-relaxed max-w-3xl">
                  <strong>Audience Matching:</strong> Review tailored variants generated dynamically. Click on each panel card to activate specific resume versions or audit matching keyphrase lists.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'startup', label: 'Startup / High-Growth', score: 91, desc: 'Optimized for cross-functional agility and ownership metrics.', color: 'border-emerald-500/30 bg-emerald-500/5' },
                    { id: 'fintech', label: 'Finance / Fintech', score: 83, desc: 'Tailored for transaction scalability and strict audit compliance.', color: 'border-orange-500/30 bg-orange-500/5' },
                    { id: 'enterprise', label: 'Enterprise Corporates', score: 78, desc: 'Optimized for process integration and legacy migrations.', color: 'border-blue-500/30 bg-blue-500/5' },
                    { id: 'tech', label: 'Technical Engineering', score: 65, desc: 'Focused on raw stack proficiency and architecture design.', color: 'border-purple-500/30 bg-purple-500/5' }
                  ].map(aud => (
                    <div 
                      key={aud.id}
                      onClick={() => setActiveAudience(aud.id)}
                      className={`p-5 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all flex justify-between items-start gap-4 ${
                        activeAudience === aud.id ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/10' : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-neutral-400">Target Variant</span>
                        <h4 className="font-bold text-sm text-white">{aud.label}</h4>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">{aud.desc}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-black text-emerald-400">{aud.score}</div>
                        <span className="text-[9px] uppercase tracking-wider text-white/50">ATS Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. AI Insights Tab */}
            {activeNav === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <NexusProInsights 
                  isDarkMode={isDarkMode} 
                  starStories={activeAudience && results[activeAudience] ? results[activeAudience]?.star_stories : undefined} 
                  auditReport={activeAudience && results[activeAudience] ? results[activeAudience]?.audit : undefined} 
                />
              </motion.div>
            )}

            {/* 6. Quota Dashboard Tab */}
            {activeNav === 'quota' && (
              <motion.div 
                key="quota"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Engine usage comparison metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monthly Limits usage tracker */}
                  <div className="p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">API Token Limits & Costs</h3>
                    <div className="space-y-4">
                      {[
                        { model: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Optimization)', limit: quotaLimits['gemini-3.1-pro-preview'] || 1000000 },
                        { model: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash (Default/Tools)', limit: quotaLimits['gemini-3.1-flash'] || 5000000 },
                        { model: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Fallback)', limit: quotaLimits['gemini-3-flash-preview'] || 10000000 }
                      ].map((eng, idx) => {
                        const used = usageStats?.totalTokens ? Math.round(usageStats.totalTokens * (idx === 0 ? 0.3 : idx === 1 ? 0.6 : 0.1)) : 0;
                        const pct = Math.min(100, Math.round((used / eng.limit) * 100));
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold">{eng.name}</span>
                              <span className="text-neutral-400">{used.toLocaleString()} / {eng.limit.toLocaleString()} tokens ({pct}%)</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Engine costs summary */}
                  <div className="p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Cost & Quota Estimator</h3>
                      <p className="text-[10px] opacity-40 leading-relaxed">
                        Calculated based on actual server costs and API token pricing metrics.
                      </p>
                    </div>

                    <div className="py-4 border-y border-white/5 my-4 flex items-baseline gap-2">
                      <span className="text-4xl font-black text-emerald-400">${usageStats?.totalCost ? usageStats.totalCost.toFixed(4) : '0.0000'}</span>
                      <span className="text-xs opacity-50 uppercase font-bold">Estimated Cost (30d)</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-emerald-400/80 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Quota balances automatically reset on the first day of each calendar month.</span>
                    </div>
                  </div>
                </div>

                {/* Engine stats table */}
                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Engine Endpoint Configuration</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-neutral-400 font-black tracking-widest uppercase">
                          <th className="pb-3">Engine Endpoint</th>
                          <th className="pb-3">Monthly Limit</th>
                          <th className="pb-3">Est. cost / 1k Tokens</th>
                          <th className="pb-3">Usage Priority</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { model: 'gemini-3.1-pro-preview', limit: quotaLimits['gemini-3.1-pro-preview'] || 1000000, rate: '$0.00125', priority: 'Primary Optimization', status: 'Healthy' },
                          { model: 'gemini-3.1-flash', limit: quotaLimits['gemini-3.1-flash'] || 5000000, rate: '$0.000075', priority: 'Default Engine', status: 'Healthy' },
                          { model: 'gemini-3-flash-preview', limit: quotaLimits['gemini-3-flash-preview'] || 10000000, rate: '$0.000075', priority: 'Secondary Fallback', status: 'Healthy' }
                        ].map((q, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="py-3.5 font-bold">{q.model}</td>
                            <td className="py-3.5 text-neutral-300">{q.limit.toLocaleString()} tokens</td>
                            <td className="py-3.5 font-medium">{q.rate}</td>
                            <td className="py-3.5">
                              <span className="text-[10px] font-bold text-emerald-400">{q.priority}</span>
                            </td>
                            <td className="py-3.5 text-right">
                              <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full">
                                {q.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. Career Tools Tab */}
            {activeNav === 'tools' && (
              <motion.div 
                key="tools"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6 h-full"
              >
                {/* Master Resumes Panel */}
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl shrink-0">
                  <MasterResumeManager
                    resumes={masterResumes}
                    onAdd={handleAddMasterResume}
                    onUpdate={handleUpdateMasterResume}
                    onDelete={handleDeleteMasterResume}
                    onSetActive={handleSetActiveResume}
                    onDuplicate={handleDuplicateResume}
                    selectedId={selectedResumeId}
                    onSelect={setSelectedResumeId}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* Career Tools Suite */}
                <div className="flex-1 min-h-0">
                  <CareerTools 
                    isDarkMode={isDarkMode} 
                    engineConfig={engineConfig} 
                    selectedEngine={selectedEngine as any} 
                    resumeData={results[activeAudience] || JSON.parse(resumeText || '{}')}
                    jobDescription={jobDescription}
                    user={user}
                    linkedinProps={{}}
                    resumeText={resumeText}
                    targetRole={targetRole}
                    companyName={companyName}
                    masterResumes={masterResumes}
                    setMasterResumes={setMasterResumes}
                    selectedResumeId={selectedResumeId}
                    setSelectedResumeId={setSelectedResumeId}
                    handleSetActiveResume={handleSetActiveResume}
                    handleDuplicateResume={handleDuplicateResume}
                    results={results}
                    activeAudience={activeAudience}
                    selectedAudiences={selectedAudiences}
                    setResumeText={setResumeText}
                    handleOptimizeResume={handleOptimizeResume}
                  />
                </div>
              </motion.div>
            )}

            {/* Skills Extractor Tab */}
            {activeNav === 'skills' && (
              <motion.div 
                key="skills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <SkillExtractor 
                  isDarkMode={isDarkMode} 
                  resumeData={results[activeAudience] || (resumeText ? JSON.parse(resumeText) : {})} 
                  onBack={() => setActiveNav('dashboard')} 
                  engineConfig={engineConfig} 
                  initialJd={jobDescription} 
                />
              </motion.div>
            )}

            {/* 8. Profile Settings Tab */}

            {activeNav === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-3xl"
              >
                {/* Account details and API key setups */}
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">API Credentials</h2>
                      <p className="text-[10px] opacity-40">Optionally configure custom API keys. Left empty to use system default quotas.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 font-black">Gemini API Key</label>
                      <input 
                        type="password"
                        placeholder={isApiKeySaved ? "••••••••••••••••••••••••••••••••" : "Paste your Gemini API key here..."}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5 font-black">OpenAI API Key</label>
                      <input 
                        type="password"
                        placeholder={isApiKeySaved ? "••••••••••••••••••••••••••••••••" : "Paste your OpenAI API key here..."}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-white/5 justify-end">
                    {isApiKeySaved && (
                      <button 
                        onClick={handleResetKeys}
                        className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/5 transition-all"
                      >
                        Reset API Keys
                      </button>
                    )}
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Settings & Keys'}
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-widest">Logout from Workpace</h3>
                    <p className="text-[10px] opacity-40 mt-1">Clears local cached sessions and cookies.</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-5 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/35 transition-all"
                  >
                    Logout Session
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>


      {/* Resume Preview & Export Modal */}
      <AnimatePresence>
        {previewModalOpen && activePreviewResume && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="flex flex-col w-full max-w-4xl h-[85vh] bg-[#0c0d14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Optimized Resume Preview</h2>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <p className="text-[10px] text-white/50">
                        Tailored for {activePreviewResume.personal_info?.name || 'Professional Profile'}
                      </p>
                      {activePreviewResume.baseline_score !== undefined && activePreviewResume.match_score !== undefined && (
                        <>
                          <div className="w-[1px] h-3 bg-white/10 hidden sm:block" />
                          <span className="text-[9px] uppercase tracking-wider font-bold text-white/40">ATS Score:</span>
                          <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Old: {activePreviewResume.baseline_score}%</span>
                          <span className="text-[9px] text-neutral-450">➔</span>
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">New: {activePreviewResume.match_score}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar & Tabs */}
              <div className="px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-black/20">
                <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    onClick={() => setPreviewTab('formatted')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewTab === 'formatted' 
                        ? 'bg-emerald-500 text-black shadow' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Formatted Preview
                  </button>
                  <button
                    onClick={() => setPreviewTab('json')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewTab === 'json' 
                        ? 'bg-emerald-500 text-black shadow' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Raw JSON Data
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePrintPDF(activePreviewResume)}
                    disabled={isPdfGenerating}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isPdfGenerating ? (
                      <><div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Download PDF</>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadJSON(activePreviewResume)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Code className="w-3.5 h-3.5" /> Download JSON
                  </button>
                  {previewTab === 'json' && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(activePreviewResume, null, 2));
                        showToast('JSON copied to clipboard!', 'success');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy JSON
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyText(activePreviewResume)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Markdown
                  </button>
                  <button
                    onClick={() => handleImportToMaster(activePreviewResume)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Save as Master
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-neutral-950/40">
                {previewTab === 'formatted' ? (
                  <div id="resume-container" className="max-w-3xl mx-auto p-8 bg-white text-neutral-800 rounded-2xl shadow-xl space-y-6 font-sans">
                    {/* Header */}
                    <div className="text-center pb-4 border-b border-neutral-200">
                      <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                        {activePreviewResume.personal_info?.name || 'Candidate Name'}
                      </h1>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500">
                        {activePreviewResume.personal_info?.email && <span>📧 {activePreviewResume.personal_info.email}</span>}
                        {activePreviewResume.personal_info?.phone && <span>📞 {activePreviewResume.personal_info.phone}</span>}
                        {activePreviewResume.personal_info?.location && <span>📍 {activePreviewResume.personal_info.location}</span>}
                        {activePreviewResume.personal_info?.linkedin && <span>🔗 {activePreviewResume.personal_info.linkedin}</span>}
                      </div>
                    </div>

                    {/* Summary */}
                    {activePreviewResume.summary && (
                      <div className="space-y-1.5">
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-1">
                          Professional Summary
                        </h3>
                        <p className="text-xs text-neutral-700 leading-relaxed text-justify">
                          {activePreviewResume.summary}
                        </p>
                      </div>
                    )}

                    {/* Work Experience */}
                    {activePreviewResume.experience?.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-1">
                          Work Experience
                        </h3>
                        <div className="space-y-4">
                          {activePreviewResume.experience.map((exp: any, i: number) => {
                            const highlightsArray = Array.isArray(exp.highlights) ? exp.highlights : (typeof exp.highlights === 'string' ? [exp.highlights] : []);
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between items-start text-xs font-bold text-neutral-900">
                                  <span>{exp.role || exp.title || 'Role'} @ {exp.company || exp.organization || 'Company'}</span>
                                  <span className="text-neutral-500 font-medium">{exp.duration || exp.dates || ''}</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1">
                                  {highlightsArray.map((bullet: string, j: number) => (
                                    <li key={j} className="text-xs text-neutral-700 leading-relaxed">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {activePreviewResume.projects?.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-1">
                          Key Projects
                        </h3>
                        <div className="space-y-4">
                          {activePreviewResume.projects.map((proj: any, i: number) => {
                            const highlightsArray = Array.isArray(proj.highlights) ? proj.highlights : (typeof proj.highlights === 'string' ? [proj.highlights] : []);
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between items-start text-xs font-bold text-neutral-900">
                                  <span>{proj.name || proj.title || 'Project'} {proj.technologies && <span className="text-neutral-500 font-normal">({proj.technologies})</span>}</span>
                                </div>
                                {proj.description && (
                                  <p className="text-xs text-neutral-600 italic">{proj.description}</p>
                                )}
                                <ul className="list-disc pl-5 space-y-1">
                                  {highlightsArray.map((bullet: string, j: number) => (
                                    <li key={j} className="text-xs text-neutral-700 leading-relaxed">
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {activePreviewResume.skills && Object.keys(activePreviewResume.skills).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-1">
                          Skills & Expertises
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(activePreviewResume.skills).map(([category, list]: [string, any], i: number) => {
                            const skillList = Array.isArray(list) ? list : (typeof list === 'string' ? [list] : []);
                            if (skillList.length === 0) return null;
                            return (
                              <div key={i} className="text-xs flex items-start gap-2">
                                <strong className="w-32 shrink-0 text-neutral-800">{category}:</strong>
                                <div className="flex flex-wrap gap-1.5">
                                  {skillList.map((skill: string, j: number) => (
                                    <span key={j} className="bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {activePreviewResume.education?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-1">
                          Education
                        </h3>
                        <div className="space-y-2">
                          {activePreviewResume.education.map((edu: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-neutral-800">
                              <div>
                                <span className="font-bold">{edu.degree || edu.degree_name || ''}</span> {edu.major ? `in ${edu.major}` : ''}
                                <div className="text-neutral-500 text-[11px]">{edu.school || edu.institution || ''}</div>
                              </div>
                              <span className="text-neutral-500">{edu.date || edu.duration || edu.gradYear || ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <pre className="max-w-3xl mx-auto p-5 rounded-2xl bg-black/60 border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                    {JSON.stringify(activePreviewResume, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
