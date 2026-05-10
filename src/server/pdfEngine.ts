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
    --accent: #111827;
    --border: #d1d5db;
  }

  * { box-sizing: border-box; }

  @page {
    size: A4;
    margin: 14mm 16mm;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
    color: var(--text-main);
    line-height: 1.45;
    background: white;
    overflow-x: hidden;
  }

  .resume-container {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding-left: 4px;
    padding-right: 4px;
    box-sizing: border-box;
  }

  /* Page Break Management */
  .page-container {
    width: 100%;
    position: relative;
    page-break-after: always;
  }

  /* Section Styling */
  section {
    margin-bottom: 18px;
  }

  .section-header {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid var(--border);
    padding-bottom: 5px;
    margin-bottom: 10px;
    margin-top: 18px;
    color: var(--accent);
  }

  /* Name Formatting */
  .resume-name {
    font-size: 24pt;
    font-weight: 700;
    letter-spacing: -0.5px;
    text-transform: uppercase;
    line-height: 1.1;
    margin-bottom: 4px;
  }

  .contact-info {
    font-size: 9pt;
    color: var(--text-dim);
    display: flex;
    justify-content: center;
    gap: 8pt;
    flex-wrap: wrap;
    margin-bottom: 18pt;
  }

  /* Bullets */
  ul {
    list-style: none;
    padding-left: 18px;
    margin-top: 6px;
    margin-bottom: 0;
  }

  li {
    position: relative;
    padding-left: 10px;
    margin-bottom: 5px;
    line-height: 1.45;
    font-size: 10pt;
  }

  li::before {
    content: "•";
    position: absolute;
    left: -2px;
    top: 0.02em;
    font-size: 11pt;
    color: var(--text-main);
  }

  /* Skills List */
  .skills-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    margin-top: 6px;
    font-size: 10pt;
  }

  .skill-row {
    margin-bottom: 4pt;
  }

  .skill-row b {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9pt;
  }

  /* Certifications */
  .certifications-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
  }

  .certification-item {
    font-size: 10pt;
    font-weight: 500;
  }

  .education-section {
    break-before: avoid;
    page-break-before: avoid;
  }

`;

/**
 * PRODUCTION HTML RENDERER
 * Generates semantic HTML optimized for ATS and high-fidelity PDF.
 */
export function generateProfessionalHTML(data: ResumeData): string {
  const { personal_info, summary, skills, experience, projects, education, certifications } = data;

  // Helper to sanitize bullets (Verb filtering and length constraint)
  const sanitizeBullet = (bullet: string) => {
    let text = bullet
      .replace(/\b(Spearheaded|Orchestrated|Championed|Visionary|Dynamic|Massive-scale|World-class|Cutting-edge)\b/gi, 'Led')
      .replace(/\b(Architected|Engineered)\b/gi, 'Designed');
    
    // Constraint: Max words ~20
    const words = text.split(' ');
    if (words.length > 22) {
      text = words.slice(0, 22).join(' ') + '...';
    }
    return text;
  };

  // Distribute content for 2-page executive format
  const page1Exp = experience.slice(0, 3);
  const page2Exp = experience.slice(3);

  const renderExperience = (item: any) => `
    <div class="experience-item">
      <div class="experience-header">
        <div>
          <h3 class="role-title">${item.role}</h3>
          <div class="company-name">${item.company}</div>
        </div>
        <div class="date">${item.duration}</div>
      </div>
      <ul>
        ${item.bullets.map((b: string) => `<li>${sanitizeBullet(b)}</li>`).join('')}
      </ul>
    </div>
  `;

  const renderProject = (item: any) => `
    <div class="experience-item">
      <div class="experience-header">
        <div>
          <h3 class="role-title">${item.name}</h3>
          <div class="company-name">${item.role}</div>
        </div>
        <div class="date">${item.duration}</div>
      </div>
      <ul>
        ${item.bullets.map((b: string) => `<li>${sanitizeBullet(b)}</li>`).join('')}
      </ul>
    </div>
  `;

  const header = `
    <header>
      <h1 class="resume-name">${personal_info.name}</h1>
      <div class="contact-info">
        <span>${personal_info.email}</span>
        <span>${personal_info.phone}</span>
        <span>${personal_info.location}</span>
        ${personal_info.linkedin ? `<span>${personal_info.linkedin}</span>` : ''}
        ${personal_info.website ? `<span>${personal_info.website}</span>` : ''}
      </div>
    </header>
  `;

  const page1Content = `
    <div class="page-container">
      ${header}
      <section>
        <div class="section-header">Executive Summary</div>
        <p style="font-size: 10pt; text-align: justify; line-height: 1.5;">${summary}</p>
      </section>
      <section>
        <div class="section-header">Core Competencies</div>
        <div class="skills-body">
            ${Object.entries(skills).map(([cat, items]) => `
                <div class="skill-row">
                  <b>${cat}:</b> <span style="color: var(--text-dim);">${items.join(', ')}</span>
                </div>
            `).join('')}
        </div>
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
          <div class="section-header">Professional Experience (Continued)</div>
          ${page2Exp.map(renderExperience).join('')}
        </section>
      ` : ''}
      ${projects && projects.length > 0 ? `
        <section>
          <div class="section-header">Selected Projects</div>
          ${projects.map(renderProject).join('')}
        </section>
      ` : ''}
      <section class="education-section">
        <div class="section-header">Education</div>
        ${education.map(e => `
          <div class="experience-item edu-entry" style="margin-bottom: 8pt;">
            <div class="experience-header">
              <div>
                <h3 class="role-title">${e.degree}</h3>
                <div class="company-name">${e.institution}</div>
              </div>
              <div class="date">${e.duration}</div>
            </div>
            <div style="font-size: 9pt; color: #6b7280; margin-top: -2px;">${e.location}${e.gpa ? ` | GPA: ${e.gpa}` : ''}</div>
          </div>
        `).join('')}
      </section>
      ${certifications && certifications.length > 0 ? `
        <section>
          <div class="section-header">Certifications & Training</div>
          <div class="certifications-list">
            ${certifications.map(c => `<span class="certification-item">${c}</span>`).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>${PROFESSIONAL_CSS}</style>
    </head>
    <body class="ats-target">
      <main class="resume-container">
        ${page1Content}
        ${page2Content}
      </main>
    </body>
    </html>
  `;
}
