import React, { useState } from 'react';
import { ArrowLeft, Copy, CheckCircle2, Download, ExternalLink, AlertCircle, RefreshCw, Pause, Play, Sparkles } from 'lucide-react';

interface ATSAutofillHelperProps {
  isDarkMode: boolean;
  resumeData: any;
  onBack: () => void;
}

export const ATSAutofillHelper: React.FC<ATSAutofillHelperProps> = ({ isDarkMode, resumeData, onBack }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<'active' | 'paused' | 'completed' | 'idle'>('idle');

  const handleReset = () => {
    setCopiedField(null);
    setStatus('idle');
  };

  const handlePause = () => {
    setStatus(prev => prev === 'active' ? 'paused' : 'active');
  };

  const handleComplete = () => {
    setStatus('completed');
  };

  const handleCopy = (text: string, fieldId: string) => {
    if (!text || status === 'paused' || status === 'completed') return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadExtension = async () => {
    try {
      const response = await fetch('/extension.zip');
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'AI_Resume_ATS_Autofill.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download the extension. Please try again or check your connection.');
    }
  };

  const renderField = (label: string, value: string | undefined, id: string) => {
    const displayValue = value || '';
    return (
      <div className={`p-3 rounded-lg border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-black/10'}`}>
        <div className="flex-1 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">{label}</div>
          <div className="text-sm truncate">{displayValue || <span className="opacity-30 italic">Not provided</span>}</div>
        </div>
        <button
          onClick={() => handleCopy(displayValue, id)}
          disabled={!displayValue}
          className={`p-2 rounded-md transition-all ${
            copiedField === id 
              ? 'bg-emerald-500 text-white' 
              : isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Copy to clipboard"
        >
          {copiedField === id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  };

  const formatDateToMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length < 2) return dateStr;
    const monthMap: { [key: string]: string } = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[parts[0].toLowerCase().substring(0, 3)];
    if (!month) return dateStr;
    return `${month} ${parts[1]}`;
  };

  const getExtensionJson = () => {
    if (!resumeData) return "{}";
    const payload = {
      firstName: resumeData.personal_info?.name?.split(' ')[0] || '',
      lastName: resumeData.personal_info?.name?.split(' ').slice(1).join(' ') || '',
      email: resumeData.personal_info?.email || '',
      phone: resumeData.personal_info?.phone || '',
      linkedin: resumeData.personal_info?.linkedin || '',
      github: resumeData.personal_info?.github || '',
      portfolio: resumeData.personal_info?.portfolio || '',
      experience: resumeData.experience?.map((exp: any) => {
        const dateStr = exp.duration || exp.date || '';
        const parts = dateStr.split(/[-–—]| to /i);
        return {
          company: exp.company,
          title: exp.role || exp.title,
          location: exp.location || '',
          startDate: formatDateToMMYYYY(parts[0]?.trim() || ''),
          endDate: formatDateToMMYYYY(parts[1]?.trim() || ''),
          description: exp.bullets?.join('\n') || ''
        };
      }) || [],
      education: resumeData.education?.map((edu: any) => {
        const dateStr = edu.date || edu.expected_completion || '';
        const parts = dateStr.split(/[-–—]| to /i);
        return {
          school: edu.institution || edu.school,
          degree: edu.degree,
          field: edu.field || '',
          startDate: formatDateToMMYYYY(parts[0]?.trim() || ''),
          endDate: formatDateToMMYYYY(parts[1]?.trim() || '')
        };
      }) || []
    };
    return JSON.stringify(payload, null, 2);
  };

  const getBookmarkletCode = () => {
    return `javascript:(function(){ 
      console.log('Autofill: Magic Bookmarklet Launched');
      try {
        const formatStr = (str) => str ? str.trim() : '';

        const formatDateToMMYYYY = (dateStr) => {
          if (!dateStr || dateStr.toLowerCase().includes('present')) return dateStr;
          const parts = dateStr.trim().split(/\\s+/);
          if (parts.length < 2) return dateStr;
          const monthMap = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
          };
          const month = monthMap[parts[0].toLowerCase().substring(0, 3)];
          return month ? (month + ' ' + parts[1]) : dateStr;
        };

        const json = prompt('Paste your Resume JSON payload here:');
        if(!json) { console.log('Autofill: No JSON provided.'); return; }
        const data = JSON.parse(json);
        console.log('Autofill: Loaded data:', data);
        
        function triggerInput(el, value) {
            console.log('Autofill: Attempting to fill', el, 'with', value);
            try {
                // Try React-specific property descriptors
                const nativeValueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set || 
                    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
                
                if (nativeValueSetter) {
                    nativeValueSetter.call(el, value);
                } else {
                    el.value = value;
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
                console.log('Autofill: Successfully triggered events for', el);
            } catch (err) {
                console.error('Autofill: Error filling element', el, err);
            }
        }

        function fillContainer(container, exp) {
            console.log('Autofill: Filling container', container);
            const inputs = Array.from(container.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select'));
            const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
            
            console.log('Autofill: Found', inputs.length, 'inputs and', checkboxes.length, 'checkboxes');

            const mappings = {
                'company': ['company', 'employer', 'organization'],
                'role': ['title', 'role', 'position', 'job-title'],
                'startDate': ['start', 'from', 'started', 'date-from'],
                'endDate': ['end', 'to', 'finished', 'until', 'date-to'],
                'description': ['description', 'responsibility', 'summary', 'about-this-role']
            };

            inputs.forEach(input => {
                const combined = ((input.name || '') + (input.id || '') + (input.getAttribute('aria-label') || '') + (input.getAttribute('placeholder') || '') + (input.getAttribute('title') || '')).toLowerCase();
                
                if (mappings.company.some(k => combined.includes(k))) triggerInput(input, formatStr(exp.company));
                else if (mappings.role.some(k => combined.includes(k))) triggerInput(input, formatStr(exp.title));
                else if (mappings.startDate.some(k => combined.includes(k))) triggerInput(input, formatDateToMMYYYY(exp.startDate));
                else if (mappings.endDate.some(k => combined.includes(k))) triggerInput(input, formatDateToMMYYYY(exp.endDate));
                else if (mappings.description.some(k => combined.includes(k))) triggerInput(input, formatStr(exp.description));
            });

            checkboxes.forEach(cb => {
                const label = (cb.parentElement?.innerText || cb.getAttribute('aria-label') || '').toLowerCase();
                if (['currently', 'present', 'work-here'].some(k => label.includes(k))) {
                     console.log('Autofill: found "currently working" checkbox:', cb);
                    if ((!exp.endDate || exp.endDate.toLowerCase().includes('present')) && !cb.checked) cb.click();
                }
            });
        }

        const experiences = data.experience || [];
        if (experiences.length === 0) {
            alert('No experience data found in JSON');
            return;
        }
        
        console.log('Autofill: Found', experiences.length, 'experiences');
        
        // Workday can have complex nested structures. Try filling document.body, 
        // but if it fails, the user might need to click on the specific section.
        fillContainer(document.body, experiences[0]);
        alert('Autofill attempt finished. Open Browser Console (F12) to see detailed logs.');

      } catch(e) { 
        console.error('Autofill: Fatal Error:', e);
        alert('Autofill Error: ' + e.message); 
      }
    })();`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-inherit overflow-hidden">
      <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${isDarkMode ? 'bg-[#141414] border-white/5' : 'bg-white border-black/5'} pt-16`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`p-3 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Portal Autofill Magic Helper</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm opacity-70 italic font-medium">Full Screen Mode Enabled • Optimized for Workday, Greenhouse & Lever</p>
              <div className={`w-1.5 h-1.5 rounded-full ${
                status === 'active' ? 'bg-emerald-500 animate-pulse' : 
                status === 'paused' ? 'bg-amber-500' : 
                status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
              }`} />
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'completed' && (
            <button
              onClick={handlePause}
              disabled={status === 'idle'}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
              } ${status === 'paused' ? 'text-amber-500 bg-amber-500/10' : ''}`}
              title={status === 'paused' ? "Resume" : "Pause"}
            >
              {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          
          <button
            onClick={handleReset}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
            }`}
            title="Start New Session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {status !== 'completed' && (
            <button
              onClick={handleComplete}
              disabled={status === 'idle'}
              className={`p-2 rounded-lg transition-all text-emerald-500 hover:bg-emerald-500/10`}
              title="Complete Session"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          <div className={`px-4 py-2 rounded-full text-xs font-bold border ml-2 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-500/20 text-emerald-700'}`}>
            SESSION ACTIVE
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
        {status === 'paused' && (
          <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className={`px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-2xl border ${
              isDarkMode ? 'bg-neutral-900 border-white/10 text-amber-500' : 'bg-white border-black/10 text-amber-600'
            }`}>
              Session Paused
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
          {/* Column 1: Browser Extension */}
          <div className="space-y-6 flex flex-col">
            <div className={`p-6 rounded-3xl border flex-1 shadow-xl ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'}`}>
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <ExternalLink className="w-6 h-6 text-emerald-500" />
                1. Browser Extension
              </h3>
              <p className="text-sm opacity-70 mb-6">
                Professional grade automation. Requires "Developer Mode" in Chrome or Edge.
              </p>
              
              <div className={`p-5 rounded-2xl mb-6 text-[12px] leading-relaxed ${isDarkMode ? 'bg-blue-500/10 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                <h4 className="font-bold mb-3 uppercase tracking-widest text-[10px]">Setup Instruction:</h4>
                <ol className="list-decimal list-inside space-y-2 opacity-90 mb-6">
                  <li>Download and Extract ZIP.</li>
                  <li>Open <code>chrome://extensions/</code></li>
                  <li>Switch on <strong>Developer mode</strong>.</li>
                  <li>Click <strong>Load unpacked</strong> and select folder.</li>
                </ol>
                <button 
                  onClick={downloadExtension}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-bold shadow-lg shadow-blue-500/20"
                >
                  <Download className="w-5 h-5" />
                  Download Extension ZIP
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-widest opacity-40">Your Data Payload:</h4>
                <div className="relative group">
                  <textarea 
                    readOnly 
                    value={getExtensionJson()}
                    className={`w-full h-48 p-4 rounded-2xl border font-mono text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-black/50 border-white/10 text-white/70 group-hover:border-emerald-500/50' : 'bg-gray-50 border-black/10 text-black/70'}`}
                  />
                  <button
                    onClick={() => handleCopy(getExtensionJson(), 'json_payload')}
                    className="absolute top-4 right-4 p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {copiedField === 'json_payload' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Bookmarklet */}
          <div className="space-y-6 flex flex-col">
            <div className={`p-6 rounded-3xl border flex-1 shadow-xl ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'}`}>
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                2. Magic Bookmarklet
              </h3>
              <p className="text-sm opacity-70 mb-6">
                <strong>Instant Fill.</strong> No installation needed. Works on any browser.
              </p>
              
              <div className={`p-5 rounded-2xl mb-6 text-[12px] leading-relaxed ${isDarkMode ? 'bg-purple-500/10 text-purple-200' : 'bg-purple-50 text-purple-800'}`}>
                <h4 className="font-bold mb-3 uppercase tracking-widest text-[10px]">How to install:</h4>
                <ol className="list-decimal list-inside space-y-3 opacity-90">
                  <li>Copy the code below accurately.</li>
                  <li>Right-click your <strong>Bookmarks Bar</strong> {'>'} <strong>Add Page</strong>.</li>
                  <li>Name it <strong>"Magic Fill"</strong>.</li>
                  <li>Paste the code into the <strong>URL</strong> field.</li>
                  <li>Go to any Job Portal (Workday etc) and click it!</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-widest opacity-40">Bookmarklet Snippet:</h4>
                <div className="relative group">
                  <textarea 
                    readOnly 
                    value={getBookmarkletCode()}
                    className={`w-full h-32 p-4 rounded-2xl border font-mono text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-black/50 border-white/10 text-white/70 group-hover:border-purple-500/50' : 'bg-gray-50 border-black/10 text-black/70'}`}
                  />
                  <button
                    onClick={() => handleCopy(getBookmarkletCode(), 'bookmarklet_code')}
                    className="absolute top-4 right-4 p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
                  >
                    {copiedField === 'bookmarklet_code' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] opacity-60 italic leading-snug">Note: When prompted by the bookmarklet on a portal, paste the JSON payload from the first column or your current resume data.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Copy-Paste Helper */}
          <div className="space-y-6 flex flex-col">
            <div className={`p-6 rounded-3xl border flex-1 shadow-xl ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'}`}>
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Copy className="w-6 h-6 text-blue-500" />
                3. Manual Copy Vault
              </h3>
              <p className="text-sm opacity-70 mb-6">
                Hyper-organized fields for selective manual entry.
              </p>

              {!resumeData ? (
                <div className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4 ${isDarkMode ? 'bg-amber-500/5 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
                  <AlertCircle className="w-10 h-10 opacity-30" />
                  <p className="font-bold">No Resume Data Loaded</p>
                  <p className="text-xs opacity-70">Please optimize or load a profile first.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-4">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] opacity-30 border-b pb-2">Identity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {renderField("First Name", resumeData.personal_info?.name?.split(' ')[0], "fname")}
                      {renderField("Last Name", resumeData.personal_info?.name?.split(' ').slice(1).join(' '), "lname")}
                    </div>
                    {renderField("Primary Email", resumeData.personal_info?.email, "email")}
                    {renderField("Phone Number", resumeData.personal_info?.phone, "phone")}
                    {renderField("LinkedIn URL", resumeData.personal_info?.linkedin, "linkedin")}
                    {renderField("Location", resumeData.personal_info?.location, "loc")}
                  </div>

                  {/* Experience */}
                  {resumeData.experience && resumeData.experience.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-[0.2em] opacity-30 border-b pb-2 mt-8">Employment History</h4>
                      {resumeData.experience.map((exp: any, idx: number) => {
                         const dateStr = exp.duration || exp.date || '';
                         const dateParts = dateStr.split(/[-–—]| to /i);
                         return (
                          <div key={idx} className={`p-6 rounded-2xl border space-y-4 transition-all hover:border-blue-500/30 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-gray-50'}`}>
                            {renderField("Company Name", exp.company, `exp_comp_${idx}`)}
                            {renderField("Job Title", exp.role || exp.title, `exp_title_${idx}`)}
                            <div className="grid grid-cols-2 gap-4">
                              {renderField("Started", formatDateToMMYYYY(dateParts[0]?.trim()), `exp_start_${idx}`)}
                              {renderField("Ended", formatDateToMMYYYY(dateParts[1]?.trim()), `exp_end_${idx}`)}
                            </div>
                            {renderField("Impact Bullets", exp.bullets?.join('\n'), `exp_desc_${idx}`)}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Education */}
                  {resumeData.education && resumeData.education.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-[0.2em] opacity-30 border-b pb-2 mt-8">Top Education</h4>
                      {resumeData.education.map((edu: any, idx: number) => (
                        <div key={idx} className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-black/5 bg-gray-50'}`}>
                          {renderField("Institution", edu.institution || edu.school, `edu_school_${idx}`)}
                          {renderField("Degree Earned", edu.degree, `edu_degree_${idx}`)}
                          {renderField("Field of Study", edu.field, `edu_field_${idx}`)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
