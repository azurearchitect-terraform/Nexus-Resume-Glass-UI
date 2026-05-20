import fs from 'fs';

const logPath = 'C:\\Users\\Harnish\\.gemini\\antigravity\\brain\\849aa0e6-1d89-40fa-a466-c7a81b992714\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const firstLine = content.split('\n')[0];
  const parsed = JSON.parse(firstLine);
  
  console.log('Parsed step_index:', parsed.step_index);
  console.log('Source:', parsed.source);
  console.log('Type:', parsed.type);
  
  const userRequest = parsed.content;
  console.log('Length of user request:', userRequest.length);
  
  // Let's write the full user request to a local file in the workspace so we can read it easily
  fs.writeFileSync('full_user_request.txt', userRequest, 'utf8');
  console.log('Wrote full user request to full_user_request.txt');
  
  // Find where other files' codes start in the text
  const serverIndex = userRequest.indexOf('This is server.ts code');
  console.log('Server code index:', serverIndex);
  
  const pdfEngineIndex = userRequest.indexOf('pdfEngine.ts');
  console.log('pdfEngine code index:', pdfEngineIndex);
} catch (err) {
  console.error('Error:', err);
}
