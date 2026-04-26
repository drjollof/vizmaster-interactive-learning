# Initialize Next.js & Build Split-Screen UI MVP

This plan outlines the initialization of the Next.js 14+ project with the App Router and Tailwind CSS, and the development of a pixel-perfect, premium split-screen layout for the VizMaster MVP.

## User Review Required

> [!IMPORTANT]
> - I will initialize the project using TypeScript, as it is standard and highly recommended for modern Next.js. Let me know if you prefer plain JavaScript instead.
> - I will install `lucide-react` for beautiful iconography and `react-markdown` to render the instructions nicely on the left panel. Please confirm if this is acceptable.

## Proposed Changes

### Setup & Dependencies
- Initialize the Next.js project in the current directory (`c:\Users\dell\Documents\vizmaster-mvp`) using `npx create-next-app` with App Router and Tailwind CSS.
- Install `@monaco-editor/react`.
- Install `lucide-react` (for icons) and `react-markdown` (for rendering the instructions).

---

### Global Styles & Theming
#### [MODIFY] `src/app/globals.css`
- Apply a premium, deep dark mode aesthetic (using rich colors like slate/zinc mixed with subtle brand colors).
- Set up a clean font stack (e.g., Inter or standard sans-serif with good readability for code and instructions).
- Define custom scrollbars and utility classes for glassmorphism effects to give the UI a polished feel.

---

### Components
#### [NEW] `src/components/Workspace.tsx`
- The core split-screen layout component.
- **Left Panel (Instructions):**
  - Renders markdown content outlining a sample task.
  - Displays a static, styled HTML table representing the Pandas DataFrame preview.
- **Right Panel (Editor & Output):**
  - **Action Bar:** Contains a "Run Code" button (with a Play icon) and a "Submit" button. Clicking "Run Code" will `console.log` the current editor content.
  - **Editor Pane:** Integrates `@monaco-editor/react` configured for Python with a matching dark theme and default boilerplate code.
  - **Output Pane:** A lower panel with two tabs ("Plot Output" and "Console"). Selecting a tab toggles the visible content area.

#### [NEW] `src/components/ui/Tabs.tsx` (Optional, if abstracted)
- Simple, elegant tab buttons with active state styling.

---

### Application Entry
#### [MODIFY] `src/app/page.tsx`
- Remove the default Next.js boilerplate.
- Import and render the `Workspace` component to take up the full screen height (`100vh`) with no scrolling on the body.

## Verification Plan

### Automated Steps
- The build will be checked using `npm run build` or by starting the dev server and ensuring it compiles without errors.

### Manual Verification
- Start the Next.js dev server.
- The UI should perfectly reflect a 50/50 split screen with a highly polished, interactive design.
- Typing in the Monaco editor and clicking "Run Code" should output the code string to the browser console.
- Clicking the "Plot Output" and "Console" tabs should switch the view in the bottom right panel.
