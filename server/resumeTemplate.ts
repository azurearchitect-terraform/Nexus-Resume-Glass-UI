import { readFileSync } from 'fs';
import path from 'path';

export function renderResumeToHTML(): string {
  const resumeJson = JSON.parse(readFileSync(path.join(process.cwd(), 'src/services/master_resume.json'), 'utf8'));
  const { personal_info, summary, experience, education, certifications } = resumeJson;

  let html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
          h1 { text-align: center; color: #333; }
          h2 { border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #555; }
          .contact { text-align: center; margin-bottom: 20px; }
          .summary { margin-bottom: 20px; }
          .job { margin-bottom: 15px; }
          .job-header { display: flex; justify-content: space-between; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${personal_info.name}</h1>
        <div class="contact">
          ${personal_info.email} | ${personal_info.phone} | ${personal_info.location}
        </div>
        
        <h2>Summary</h2>
        <div class="summary">${summary}</div>
        
        <h2>Professional Experience</h2>
        ${experience.map((job: any) => `
          <div class="job">
            <div class="job-header">
              <span>${job.role} - ${job.company}</span>
              <span>${job.duration}</span>
            </div>
            <ul>
              ${job.bullets.map((bullet: any) => `<li>${bullet.text}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
        
        <h2>Education</h2>
        <div>
          ${education.degree} at ${education.institution}, Expected: ${education.expected_completion}
        </div>
      </body>
    </html>
  `;
  return html;
}
