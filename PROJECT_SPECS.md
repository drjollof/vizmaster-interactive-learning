
**Role:** You are an Expert Full-Stack Developer and EdTech Architect. Your task is to build the MVP (Minimum Viable Product) for an interactive coding platform dedicated solely to practicing Python Data Visualization (from beginner to advanced).

**Project Vision:** 
The platform will replicate the core learning style of DataCamp: task-based, hands-on practice where users solve visualization challenges by writing Python code directly in their browser. 
*Crucial Note:* To keep this MVP manageable, we are NOT building a massive enterprise platform with social features, payments, or leaderboards. We are focusing strictly on building a flawless, lightweight, interactive workspace and a simple progress tracker.

---

### 1. THE CORE WORKSPACE (SPLIT-SCREEN UI)
The main interface must be a responsive split-screen:
*   **Left Panel (Context & Task):**
    *   Displays markdown-based instructions (The scenario and the goal).
    *   Displays a small HTML table previewing the active dataset (e.g., first 5 rows).
*   **Right Panel (Interactive Workspace):**
    *   **Top Half:** A Monaco Code Editor with Python syntax highlighting. It should load boilerplate code (e.g., `import pandas as pd`).
    *   **Bottom Half:** An Output window with two tabs:
        *   *Plot Tab:* Renders the visual output of the user's Matplotlib/Seaborn/Plotly code.
        *   *Console Tab:* Shows standard output (print statements) or execution errors.
*   **Action Bar:** A "Run Code" button (to test and see the plot) and a "Submit" button (to validate against the grading script).

---

### 2. THE EXECUTION & VALIDATION ENGINE (MVP Focus)
To avoid expensive backend infrastructure, all Python execution must happen **in the user's browser**.
*   **Execution:** Use **Pyodide** (WebAssembly). The system must initialize Pyodide, load packages (`pandas`, `matplotlib`, `seaborn`), and execute the code from the Monaco editor.
*   **Plot Rendering:** Catch the Matplotlib output and render it as an image/base64 string into the "Plot Tab".
*   **Validation:** When "Submit" is clicked, run a hidden Python validation script. Instead of complex AST parsing, use simple object inspection. 
    *   *Example:* If the task is to create a bar chart with specific labels, the hidden script will check `matplotlib.pyplot.gca()` to verify `ax.get_xlabel()` and `len(ax.patches)` to ensure the plot is correct. Return a pass/fail boolean and a feedback string.

---

### 3. CONTENT & DATA STRUCTURE
We need a simple way to feed exercises from Beginner (basic line charts) to Advanced (complex subplots or Plotly interactives). 
Design a JSON schema for exercises. Each exercise object should contain:
*   `id`, `title`, `difficulty`
*   `markdown_instructions`
*   `csv_data_url` (or raw JSON data to load into a Pandas DataFrame)
*   `initial_code` (What the user sees first)
*   `validation_code` (The hidden Pyodide script to check the user's plot)

---

### 4. TECH STACK (Manageable & Modern)
*   **Frontend:** Next.js (React), Tailwind CSS.
*   **Editor:** `@monaco-editor/react`.
*   **Execution:** `pyodide` (Client-side execution).
*   **State/Storage:** For the MVP, just use `localStorage` or a lightweight DB (like Supabase/SQLite via Prisma) to track which `exercise_ids` the user has completed. 

---

### 5. YOUR REQUIRED OUTPUT
Please provide the following to help me start building immediately:

1.  **Architecture & Data Flow Summary:** Briefly explain how Next.js, Monaco, and Pyodide will communicate.
2.  **The Pyodide Integration Code:** This is the hardest part. Provide a working React hook or utility function (`usePyodide`) that initializes WebAssembly, runs user code, intercepts a Matplotlib plot, and returns it as an image URL to be displayed.
3.  **The Split-Screen UI Component:** Provide the Next.js/Tailwind code for the main workspace view.
4.  **A Sample Exercise JSON:** Provide ONE complete example of a beginner exercise (e.g., creating a simple scatter plot) including the markdown, starting code, and the exact Python validation code needed to grade it.
5.  **Next Steps:** A brief, 3-step actionable plan for what I should code first.