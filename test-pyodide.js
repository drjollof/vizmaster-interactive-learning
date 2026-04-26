const { loadPyodide } = require('pyodide');

async function main() {
  const py = await loadPyodide();
  
  await py.loadPackage(['micropip', 'numpy', 'pandas', 'matplotlib']);
  
  const code = `
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
`;
  
  console.log('calling loadPackagesFromImports...');
  await py.loadPackagesFromImports(code);
  console.log('done calling loadPackagesFromImports');
  
  try {
    await py.runPythonAsync(code);
    console.log('runPythonAsync succeeded!');
  } catch (err) {
    console.error('runPythonAsync failed:', err);
  }
}

main().catch(console.error);
