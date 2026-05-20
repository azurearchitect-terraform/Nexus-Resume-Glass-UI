import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

async function test() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ]
    });
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.setContent('<h1>Hello World</h1>');
    const pdf = await page.pdf({ format: 'A4' });
    console.log('PDF generated successfully, size:', pdf.length);
  } catch (err) {
    console.error('Error during puppeteer execution:', err);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

test();
