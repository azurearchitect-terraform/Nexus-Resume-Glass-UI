import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

async function buildZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(process.cwd(), 'public', 'extension.zip'));
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
    archive.directory(path.join(process.cwd(), 'public', 'extension'), false);
    archive.finalize();
  });
}

await buildZip();
