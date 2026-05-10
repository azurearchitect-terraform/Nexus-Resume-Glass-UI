import { v4 as uuidv4 } from 'uuid';

/**
 * PRODUCTION-GRADE RESUME PDF RENDERING ENGINE
 * Designed for ATS compatibility and FAANG-level executive appearance.
 */

export interface ResumeData {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  skills: {
    [category: string]: string[];
  };
  experience: {
    id: string;
    role: string;
    company: string;
    location: string;
    duration: string;
    bullets: string[];
  }[];
  projects?: {
    name: string;
    role: string;
    duration: string;
    bullets: string[];
    link?: string;
  }[];
  education: {
    institution: string;
    degree: string;
    location: string;
    duration: string;
    gpa?: string;
  }[];
  certifications?: string[];
}

/**
 * PROFESSIONAL CSS SYSTEM
 * Optimized for Inter font and A4 print rendering.
 */
const PROFESSIONAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --text-main: #111827;
    --text-dim: #374151;
    --text-light: #6b7280;
    --accent: #000000;
    --border: #d1d5db;
    --page-margin: 15mm;
    
    /* Executive Typography Scale */
    --size-name: 22pt;
    --size-section-head: 11pt;
    --size-job-title: 10.5pt;
    --size-body: 9.5pt;
    --size-contact: 8.5pt;
    
    --line-height: 1.4;
    --section-spacing: 12pt;
    --entry-spacing: 8pt;
  }

  * { box-sizing: border-box; -webkit-print-color-adjust: exact; }

  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
    color: var(--text-main);
    line-height: var(--line-height);
    background: white;
  }

  .resume-wrapper {
    width: 210mm;
    margin: 0 auto;
    background: white;
  }

  /* Page Break Management */
  .page-container {
    background: white;
    width: 210mm;
    height: 297mm;
    padding: var(--page-margin);
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }

  /* Section Styling */
  section {
    margin-bottom: var(--section-spacing);
  }

  .section-header {
    font-size: var(--size-section-head);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1.5pt solid var(--accent);
    padding-bottom: 2pt;
    margin-bottom: 6pt;
    color: var(--accent);
  }

  /* Header / Personal Info */
  header {
    text-align: center;
    margin-bottom: 14pt;
  }

  header h1 {
    font-size: var(--size-name);
    font-weight: 800;
    margin: 0 0 2pt 0;
    letter-spacing: -0.015em;
    text-transform: uppercase;
  }

  .contact-info {
    font-size: var(--size-contact);
    color: var(--text-dim);
    display: flex;
    justify-content: center;
    gap: 12pt;
    flex-wrap: wrap;
    font-weight: 500;
  }

  .contact-info span:not(:last-child)::after {
    content: "|";
    margin-left: 12pt;
    opacity: 0.3;
    font-weight: 400;
  }

  /* Summary */
  .summary-text {
    font-size: var(--size-body);
    color: var(--text-dim);
    text-align: left;
    margin-bottom: 4pt;
  }

  /* Skills List */
  .skills-list {
    font-size: var(--size-body);
    display: flex;
    flex-direction: column;
    gap: 2pt;
  }

  .skill-row {
    display: flex;
    gap: 4pt;
  }

  .skill-row b {
    min-width: 120pt;
    font-weight: 600;
    color: var(--accent);
  }

  /* Experience / Projects Items */
  .entry {
    margin-bottom: var(--entry-spacing);
    break-inside: avoid;
  }

  .entry-primary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: 700;
    font-size: var(--size-job-title);
    margin-bottom: 0;
  }

  .entry-secondary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--size-body);
    color: var(--text-light);
    font-weight: 500;
    margin-bottom: 2pt;
  }

  .company-name {
    color: var(--text-dim);
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding-left: 12pt;
    font-size: var(--size-body);
    list-style-type: disc;
  }

  li {
    margin-bottom: 2pt;
    color: var(--text-dim);
    padding-left: 2pt;
  }

  /* Education Specific */
  .edu-entry {
    margin-bottom: 6pt;
  }
`;

/**
 * PRODUCTION HTML RENDERER
 * Generates semantic HTML optimized for ATS and high-fidelity PDF.
 */
export function generateProfessionalHTML(data: ResumeData): string {
  const { personal_info, summary, skills, experience, projects, education, certifications } = data;

  // HEURISTIC PAGINATION: Split at index 3 for experience if long, or handle logically.
  // FAANG Executive resumes usually have Top 2-3 detailed experiences on Page 1.
  const page1Exp = experience.slice(0, 3);
  const page2Exp = experience.slice(3);

  const renderExperience = (item: any) => `
    <article class="entry">
      <div class="entry-primary">
        <span>${item.role}</span>
        <span class="company-name">${item.company}</span>
      </div>
      <div class="entry-secondary">
        <span>${item.location}</span>
        <span>${item.duration}</span>
      </div>
      <ul>
        ${item.bullets.map((b: string) => `<li>${b}</li>`).join('')}
      </ul>
    </article>
  `;

  const renderProject = (item: any) => `
    <article class="entry">
      <div class="entry-primary">
        <span>${item.name}${item.link ? ` <a href="${item.link}" style="font-weight: 400; font-size: 8pt; color: #3b82f6; text-decoration: none;">[Link]</a>` : ''}</span>
        <span>${item.duration}</span>
      </div>
      <div class="entry-secondary">
        <span>${item.role}</span>
      </div>
      <ul>
        ${item.bullets.map((b: string) => `<li>${b}</li>`).join('')}
      </ul>
    </article>
  `;

  const header = `
    <header>
      <h1>${personal_info.name}</h1>
      <nav class="contact-info">
        <span>${personal_info.email}</span>
        <span>${personal_info.phone}</span>
        <span>${personal_info.location}</span>
        ${personal_info.linkedin ? `<span>${personal_info.linkedin}</span>` : ''}
        ${personal_info.website ? `<span>${personal_info.website}</span>` : ''}
      </nav>
    </header>
  `;

  const skillsHtml = `
    <div class="skills-list">
      ${Object.entries(skills).map(([cat, items]) => `
        <div class="skill-row">
          <b>${cat}:</b> <span>${items.join(', ')}</span>
        </div>
      `).join('')}
    </div>
  `;

  const page1Content = `
    <div class="page-container">
      ${header}
      <section>
        <div class="section-header">Executive Summary</div>
        <div class="summary-text">${summary}</div>
      </section>
      <section>
        <div class="section-header">Core Competencies</div>
        ${skillsHtml}
      </section>
      <section>
        <div class="section-header">Professional Experience</div>
        ${page1Exp.map(renderExperience).join('')}
      </section>
    </div>
  `;

  const page2Content = `
    <div class="page-container">
      ${page2Exp.length > 0 ? `
        <section>
          <div class="section-header">Experience (Continued)</div>
          ${page2Exp.map(renderExperience).join('')}
        </section>
      ` : ''}
      ${projects && projects.length > 0 ? `
        <section>
          <div class="section-header">Technical Projects</div>
          ${projects.map(renderProject).join('')}
        </section>
      ` : ''}
      <section>
        <div class="section-header">Education</div>
        ${education.map(e => `
          <div class="entry edu-entry">
            <div class="entry-primary">
              <span>${e.degree}</span>
              <span class="company-name">${e.institution}</span>
            </div>
            <div class="entry-sub" style="display: flex; justify-content: space-between; font-size: 9.5pt; color: #6b7280;">
              <span>${e.location}</span>
              <span>${e.duration}${e.gpa ? ` | GPA: ${e.gpa}` : ''}</span>
            </div>
          </div>
        `).join('')}
      </section>
      ${certifications && certifications.length > 0 ? `
        <section>
          <div class="section-header">Certifications & Training</div>
          <ul style="margin-top: 4pt;">
            ${certifications.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </section>
      ` : ''}
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Professional Resume</title>
      <style>${PROFESSIONAL_CSS}</style>
    </head>
    <body class="ats-target">
      <main class="resume-wrapper">
        ${page1Content}
        ${page2Content}
      </main>
    </body>
    </html>
  `;
}
