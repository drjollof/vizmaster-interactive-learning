/**
 * pyodide.worker.js
 * Place at: public/pyodide.worker.js
 *
 * Runs entirely off the main thread. Responsibilities:
 *  1. Bootstrap Pyodide from its CDN
 *  2. Load pandas + matplotlib once on first init
 *  3. Install a custom matplotlib backend that captures figures as base64 PNG
 *  4. Execute arbitrary Python strings sent by the usePyodide hook
 *  5. Post structured result messages back to the hook
 */

// ---------------------------------------------------------------------------
// Message shape contract (shared with usePyodide hook)
// ---------------------------------------------------------------------------
// Incoming  → { id, type: 'run', code: string }
//           → { id, type: 'init' }          (optional explicit warm-up)
// Outgoing  → { id, type: 'ready' }
//           → { id, type: 'result',  stdout: string, images: string[] }
//           → { id, type: 'error',   message: string, traceback: string }
//           → { id, type: 'stdout',  text: string }   (streaming stdout lines)
// ---------------------------------------------------------------------------

importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');

let pyodide = null;
let initPromise = null;

// ---------------------------------------------------------------------------
// Initialise Pyodide + packages (runs once; subsequent calls return the same
// promise so concurrent messages don't trigger a double-init race).
// ---------------------------------------------------------------------------
async function initPyodide() {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
    });

    // Redirect Python stdout/stderr so we can capture it per-execution
    await pyodide.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

    // Load micropip, then pandas + matplotlib
    await pyodide.loadPackage(['micropip', 'pandas', 'matplotlib', 'numpy']);

    // Install the custom "wasm_agg" backend shim.
    // We override plt.show() so that instead of trying to open a GUI window
    // it serialises every current figure to a base64 PNG, appends it to our
    // capture list, then clears the figure so the next plot starts fresh.
    await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('agg')          # non-interactive, raster backend – safe in WASM

import matplotlib.pyplot as _plt
import base64, io as _io

# Storage for captured images in the current execution run
_captured_images = []

def _show_override(*args, **kwargs):
    """Replace plt.show() with base64 capture."""
    for fig_num in _plt.get_fignums():
        fig = _plt.figure(fig_num)
        buf = _io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode('utf-8')
        _captured_images.append(b64)
        buf.close()
    _plt.close('all')

_plt.show = _show_override

# Convenience alias so user code feels natural
import matplotlib.pyplot as plt
plt.show = _show_override
`);

    return pyodide;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Execute a user code string and return { stdout, images } or throw.
// ---------------------------------------------------------------------------
async function runCode(code) {
  const py = await initPyodide();

  // Reset stdout / stderr and the image capture list before each run
  py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

# Clear the image capture list from the previous run
import builtins
try:
    _captured_images.clear()
except NameError:
    _captured_images = []

import matplotlib.pyplot as _plt_run
# Restore plt.show in case a previous run crashed while it was mocked
try:
    _plt_run.show = _show_override
except NameError:
    pass
_plt_run.close('all')
`);

  // Pass the user's code safely into the Python environment
  py.globals.set('_user_code', code);

  // We wrap the user code execution in Python so we have 100% control over the traceback formatting
  // and we don't rely on Pyodide's JS Error mapping which can sometimes drop the traceback string.
  const wrapperCode = `
import sys, traceback

_run_err_msg = ""
_run_err_tb = ""
try:
    exec(_user_code, globals())
except BaseException as e:
    _run_err_msg = str(e)
    if not _run_err_msg:
        _run_err_msg = e.__class__.__name__
    _run_err_tb = "".join(traceback.format_exception(type(e), e, e.__traceback__))

try:
    if hasattr(_plt_run, 'get_fignums') and _plt_run.get_fignums():
        _show_override() # auto-capture any left-open figures
except Exception:
    pass

_output = sys.stdout.getvalue()
_err    = sys.stderr.getvalue()
_combined = _output + (('\\nSTDERR:\\n' + _err) if _err.strip() else '')

(_combined, _run_err_msg, _run_err_tb)
`;

  let stdout = '';
  let errMsg = '';
  let errTb = '';

  try {
    const pyResult = await py.runPythonAsync(wrapperCode);
    const arr = pyResult.toJs();
    if (pyResult.destroy) pyResult.destroy();
    
    stdout = arr[0];
    errMsg = arr[1];
    errTb = arr[2];
  } catch (err) {
    // This only catches absolute catastrophic failures (e.g., syntax error in wrapperCode itself)
    errMsg = err.message || String(err);
    errTb = err.stack || String(err);
  }

  // Pull the base64 image list back to JS
  const imageProxy = py.globals.get('_captured_images');
  const images = imageProxy ? imageProxy.toJs() : [];
  if (imageProxy && imageProxy.destroy) imageProxy.destroy();

  if (errTb) {
    // If it's a grading assertion, the error message is often just the bare string without "AssertionError:"
    // Prefixing it makes it identical to standard Python output so regexes don't break.
    let finalMsg = errMsg;
    if (errTb.includes('AssertionError') && !finalMsg.includes('AssertionError')) {
      finalMsg = 'AssertionError: ' + finalMsg;
    }

    return { 
      isError: true, 
      message: finalMsg, 
      traceback: errTb, 
      stdout: stdout || '', 
      images: images || [] 
    };
  }

  return { isError: false, stdout: stdout || '', images: images || [] };
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------
self.onmessage = async (event) => {
  const { id, type, code } = event.data;

  try {
    if (type === 'init') {
      await initPyodide();
      self.postMessage({ id, type: 'ready' });
      return;
    }

    if (type === 'run') {
      // Ensure Pyodide is ready (lazy-init on first run message)
      await initPyodide();
      const result = await runCode(code);
      
      if (result.isError) {
        self.postMessage({
          id,
          type: 'error',
          message: result.message,
          traceback: result.traceback,
          stdout: result.stdout,
          images: result.images,
        });
      } else {
        self.postMessage({ 
          id, 
          type: 'result', 
          stdout: result.stdout, 
          images: result.images 
        });
      }
      return;
    }

    // Unknown message type – ignore gracefully
    self.postMessage({
      id,
      type: 'error',
      message: `Unknown message type: ${type}`,
      traceback: '',
    });
  } catch (err) {
    const isPythonError = err && err.type !== undefined;
    const fullStr = (err && err.message) || String(err);
    
    self.postMessage({
      id,
      type: 'error',
      message: isPythonError ? fullStr.split('\n').pop() || fullStr : fullStr,
      traceback: isPythonError ? fullStr : (err.stack || fullStr),
      stdout: '',
      images: [],
    });
  }
};
