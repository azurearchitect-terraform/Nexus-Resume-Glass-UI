import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

async function buildZip() {
  const publicDir = path.join(process.cwd(), 'public');
  const extensionDir = path.join(publicDir, 'extension');

  if (!fs.existsSync(extensionDir)) {
    console.log('Skipping extension zip creation because public/extension does not exist.');
    return;
  }

  return new Promise((resolve, reject) => {
    fs.mkdirSync(publicDir, { recursive: true });

    const output = fs.createWriteStream(path.join(publicDir, 'extension.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      resolve(null);
    });
    archive.on('error', (err) => {
      reject(err);
    });
    archive.pipe(output);
    archive.directory(extensionDir, false);
    archive.finalize();
  });
}

await buildZip();
