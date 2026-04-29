# 📊 VizMaster: Interactive Python Data Visualization

VizMaster is a serverless, browser-based interactive learning platform designed to practice Python data visualization. Inspired by platforms like DataCamp, it allows users to write, execute, and validate Python code (Pandas, Matplotlib, Seaborn) entirely in the browser using WebAssembly.



## ✨ Features
* **In-Browser Execution:** Powered by Pyodide, Python code compiles and runs locally in the user's browser—no backend servers required.
* **Auto-Grading Engine:** A robust hidden validation script inspects Matplotlib and Seaborn Python objects (AST/Axes inspection) to accurately grade user code and plots.
* **Dynamic Data Previews:** Automatically parses Python code and JSON schema to provide HTML table previews of the datasets being used.
* **Progressive Hint System:** Localized, multi-step hints to guide users without spoiling the solution.
* **Professional IDE UI:** A fully responsive, draggable split-pane interface using Monaco Editor and React Resizable Panels.

## 🛠️ Tech Stack
* **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
* **Code Editor:** `@monaco-editor/react`
* **Execution Engine:** `pyodide` (WebAssembly)
* **Layout:** `react-resizable-panels`
* **State Management:** LocalStorage & React Hooks

## 🚀 Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/drjollof/vizmaster-interactive-learning.git