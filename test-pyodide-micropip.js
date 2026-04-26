const { loadPyodide } = require('pyodide');

async function main() {
  const py = await loadPyodide();
  await py.loadPackage(['micropip']);
  const micropip = py.pyimport('micropip');
  
  const code = `
import seaborn as sns
import numpy as np
import scipy
`;
  
  // Use pyodide's built in AST analyzer to get imports
  const imports = py.runPython(`
import ast
code = '''` + code + `'''
tree = ast.parse(code)
imports = set()
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        for name in node.names:
            imports.add(name.name.split('.')[0])
    elif isinstance(node, ast.ImportFrom):
        if node.module:
            imports.add(node.module.split('.')[0])
list(imports)
`).toJs();
  
  console.log('Detected imports:', imports);
  
  // Now tell micropip to install them
  console.log('Installing imports via micropip...');
  await micropip.install(imports);
  console.log('Done installing.');
}
main().catch(console.error);
