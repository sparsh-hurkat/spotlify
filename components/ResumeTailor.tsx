import React from 'react';
import { KnowledgeSnippet, ResumeTabState } from '../types';
import { analyzeAndTailorResume } from '../services/geminiService';
import { queryVectorDB } from '../services/vectorStore';
import { IconSparkles, IconCheck, IconX, IconPlus } from './icons';

interface Props {
  knowledgeBase: KnowledgeSnippet[];
  state: ResumeTabState;
  setState: React.Dispatch<React.SetStateAction<ResumeTabState>>;
}

const ResumeTailor: React.FC<Props> = ({ knowledgeBase, state, setState }) => {
  const { jobTitle, companyName, jobDescription, selectedResumeId, currentResumeContent, analysis, isAnalyzing } = state;

  const resumeOptions = knowledgeBase.filter(k => k.category === 'resume');

  const updateState = (updates: Partial<ResumeTabState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const selected = resumeOptions.find(r => r.id === newId);
    updateState({ 
        selectedResumeId: newId,
        currentResumeContent: selected ? selected.content : '' 
    });
  };

  const handleAnalyze = async () => {
    if (!currentResumeContent.trim()) {
      alert("Please provide resume content to analyze.");
      return;
    }
    if (!jobDescription.trim()) {
      alert("Please enter a job description.");
      return;
    }

    updateState({ isAnalyzing: true, analysis: null });

    try {
      // RAG Step 1: Retrieve context based on the Job Description
      // We search for things in the knowledge base that match the Job Description
      // to see what we might be missing or should highlight.
      const relevantContext = await queryVectorDB(jobDescription, 5);

      // RAG Step 2: Analyze using the retrieved context
      const result = await analyzeAndTailorResume(
        relevantContext,
        currentResumeContent,
        { jobTitle, companyName, jobDescription }
      );
      updateState({ analysis: result });
    } catch (e) {
      console.error(e);
      alert("Error analyzing resume. Ensure Pinecone keys are set and DB is populated.");
    } finally {
      updateState({ isAnalyzing: false });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Column: Inputs */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-2">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold mb-4 text-purple-400 flex items-center gap-2">
            Target Job & Resume
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Job Title</label>
              <input 
                type="text" 
                value={jobTitle}
                onChange={e => updateState({ jobTitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Senior Engineer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company</label>
              <input 
                type="text" 
                value={companyName}
                onChange={e => updateState({ companyName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">Job Description</label>
             <textarea 
               value={jobDescription}
               onChange={e => updateState({ jobDescription: e.target.value })}
               className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
               placeholder="Paste job description..."
             />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-slate-400">Select Resume Source</label>
                {resumeOptions.length > 0 && (
                    <select 
                        className="bg-slate-900 text-xs border border-slate-700 rounded p-1 text-slate-300"
                        value={selectedResumeId}
                        onChange={handleResumeSelect}
                    >
                        <option value="">-- Manual Paste --</option>
                        {resumeOptions.map(r => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                    </select>
                )}
            </div>
            <textarea 
              value={currentResumeContent}
              onChange={e => updateState({ currentResumeContent: e.target.value })}
              className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono"
              placeholder="Paste your resume content here or select from Knowledge Base..."
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all
              ${isAnalyzing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
              }`}
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Retrieving & Analyzing...</span>
            ) : (
              <>
                <IconSparkles className="w-5 h-5" /> Analyze Resume
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Analysis Results */}
      <div className="flex flex-col h-full min-h-[500px]">
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-sm font-semibold text-slate-300">Analysis & Suggestions</h2>
          </div>
          <div className="flex-1 p-6 overflow-auto bg-slate-900/50 space-y-6">
            {analysis ? (
              <>
                {/* Scorecard style Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/80 p-4 rounded-lg border border-green-900/50">
                     <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <IconCheck className="w-4 h-4" /> Highly Relevant
                     </h3>
                     <ul className="space-y-2">
                        {analysis.relevant.map((point, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                                {point}
                            </li>
                        ))}
                     </ul>
                  </div>

                  <div className="bg-slate-800/80 p-4 rounded-lg border border-red-900/50">
                     <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <IconX className="w-4 h-4" /> Irrelevant / Fluff
                     </h3>
                     <ul className="space-y-2">
                        {analysis.irrelevant.length > 0 ? analysis.irrelevant.map((point, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                                {point}
                            </li>
                        )) : <span className="text-slate-500 text-sm italic">None found. Good job!</span>}
                     </ul>
                  </div>
                </div>

                {/* Missing Skills from Context */}
                {analysis.missing_from_kb.length > 0 && (
                     <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50">
                        <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <IconPlus className="w-4 h-4" /> Add from Knowledge Base
                        </h3>
                        <p className="text-xs text-blue-300/70 mb-3">
                            RAG identified these relevant skills/projects from your database that are missing here.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {analysis.missing_from_kb.map((point, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded border border-blue-500/30">
                                    {point}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggestions */}
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                     <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <IconSparkles className="w-4 h-4" /> Suggested Changes
                     </h3>
                     <ul className="space-y-3">
                        {analysis.suggestions.map((point, i) => (
                            <li key={i} className="text-sm text-slate-300 p-3 bg-slate-900 rounded border border-slate-800">
                                {point}
                            </li>
                        ))}
                     </ul>
                </div>

              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <IconSparkles className="w-12 h-12 mb-4 opacity-20" />
                <p>Paste your resume & job description to see actionable insights.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeTailor;