'use client';

import React, { useState } from 'react';
import { Show } from '@clerk/nextjs';
import { Copy, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [startingCode, setStartingCode] = useState('');
  const [validationCode, setValidationCode] = useState('');
  const [solutionCode, setSolutionCode] = useState('');
  const [hints, setHints] = useState('');
  const [datasetPreview, setDatasetPreview] = useState('');
  
  const [generatedJSON, setGeneratedJSON] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    try {
      const parsedPreview = datasetPreview.trim() ? JSON.parse(datasetPreview) : null;
      const parsedHints = hints.split('\n').map(h => h.trim()).filter(h => h !== '');

      const exerciseObj = {
        id,
        title,
        markdown,
        starting_code: startingCode,
        validation_code: validationCode,
        dataset_preview: parsedPreview,
        hints: parsedHints,
        solution_code: solutionCode
      };

      setGeneratedJSON(JSON.stringify(exerciseObj, null, 4));
    } catch (err) {
      alert('Error generating JSON. Please check if the Dataset Preview is valid JSON.');
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (!generatedJSON) return;
    navigator.clipboard.writeText(generatedJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClasses = "w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all";
  const textareaClasses = "resize-y w-full bg-gray-800/50 border border-gray-700 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono";
  const labelClasses = "block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-200 p-4 md:p-8 flex flex-col">
      <Show when="signed-out">
        <div className="flex flex-1 items-center justify-center">
          <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center shadow-2xl max-w-sm w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-3">Access Denied</h1>
            <p className="text-zinc-400">Admin access only. Please sign in to view this page.</p>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col h-[calc(100vh-80px)] gap-6">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-5 shrink-0 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Exercise Builder</h1>
              <p className="text-sm text-zinc-400 mt-1">Generate perfectly formatted JSON for new Data Science exercises.</p>
            </div>
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md shadow-lg transition-colors whitespace-nowrap"
            >
              Generate JSON
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
            {/* Left Column: Form */}
            <div className="flex flex-col gap-6 overflow-y-auto pb-20 pr-4 custom-scrollbar">
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className={labelClasses}>ID</label>
                  <input type="text" className={inputClasses} value={id} onChange={e => setId(e.target.value)} placeholder="e.g., pandas-filtering" />
                </div>
                <div className="flex-1">
                  <label className={labelClasses}>Title</label>
                  <input type="text" className={inputClasses} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Filtering DataFrames" />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Markdown Instructions</label>
                <textarea className={`${textareaClasses} font-sans`} rows={6} value={markdown} onChange={e => setMarkdown(e.target.value)} placeholder="Explain the exercise here..." />
              </div>

              <div>
                <label className={labelClasses}>Starting Code</label>
                <textarea className={textareaClasses} rows={8} value={startingCode} onChange={e => setStartingCode(e.target.value)} placeholder="import pandas as pd&#10;..." />
              </div>

              <div>
                <label className={labelClasses}>Validation Code</label>
                <textarea className={textareaClasses} rows={8} value={validationCode} onChange={e => setValidationCode(e.target.value)} placeholder="def validate(user_vars):..." />
              </div>

              <div>
                <label className={labelClasses}>Solution Code</label>
                <textarea className={textareaClasses} rows={8} value={solutionCode} onChange={e => setSolutionCode(e.target.value)} placeholder="Solution..." />
              </div>

              <div>
                <label className={labelClasses}>Hints</label>
                <p className="text-xs text-zinc-500 mb-2">Separate each hint with a new line.</p>
                <textarea className={`${textareaClasses} font-sans`} rows={4} value={hints} onChange={e => setHints(e.target.value)} placeholder="Hint 1&#10;Hint 2" />
              </div>

              <div>
                <label className={labelClasses}>Dataset Preview (JSON)</label>
                <p className="text-xs text-zinc-500 mb-2">Paste raw JSON object here, e.g. {`{"columns":["A"], "rows":[["B"]]}`}.</p>
                <textarea className={textareaClasses} rows={6} value={datasetPreview} onChange={e => setDatasetPreview(e.target.value)} placeholder='{"columns":["A"], "rows":[["B"]]}' />
              </div>
            </div>

            {/* Right Column: Output */}
            <div className="h-full overflow-y-auto relative rounded-lg border border-gray-800 bg-[#0f1115] shadow-inner custom-scrollbar">
              
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={handleCopy}
                  disabled={!generatedJSON}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-md text-sm font-medium transition-colors border border-zinc-700/50"
                >
                  {copied ? <><CheckCircle2 size={16} className="text-emerald-400"/> Copied!</> : <><Copy size={16} /> Copy</>}
                </button>
              </div>

              <div className="p-6 pt-16">
                {generatedJSON ? (
                  <pre className="font-mono text-[13px] leading-relaxed text-[#7ee787] whitespace-pre-wrap break-all">
                    <code>{generatedJSON}</code>
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-600 font-mono text-sm min-h-[300px]">
                    {`// Generated JSON will appear here...`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
