const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js' });
  
  const result = await page.evaluate(async () => {
    const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
    try {
      await pyodide.runPythonAsync("assert False, 'My Custom Error'");
    } catch (err) {
      return {
        name: err.name,
        message: err.message,
        type: err.type,
        stack: err.stack,
        isPythonError: err && err.type !== undefined
      };
    }
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
