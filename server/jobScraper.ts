import puppeteer from 'puppeteer';

export async function scrapeJobs(url: string) {
  console.log(`[Scraper] Scaping ${url}...`);
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Simple extraction logic - would be more complex for a real scraper
    const text = await page.evaluate(() => document.body.innerText);
    
    await browser.close();
    return text.substring(0, 10000);
  } catch (err) {
    console.error("[Scraper] Failed:", err);
    return "";
  }
}
