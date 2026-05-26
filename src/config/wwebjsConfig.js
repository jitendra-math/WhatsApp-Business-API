export const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process', // RAM bachane ke liye sabse zaroori
    '--disable-gpu',
    '--disable-extensions',
    '--disable-infobars',
    '--hide-scrollbars',
    '--disable-notifications',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--max-old-space-size=250' // Node.js ke garbage collector ko strict kiya
  ]
};
