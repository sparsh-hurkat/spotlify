import React from 'react';
import { KnowledgeSnippet, CoverLetterTabState } from '../types';
import { analyzeAndTailorCoverLetter } from '../services/geminiService';
import { queryVectorDB } from '../services/vectorStore';
import { IconFileText, IconSparkles, IconCheck, IconX, IconPlus } from './icons';

interface Props {
  knowledgeBase: KnowledgeSnippet[];
  state: CoverLetterTabState;
  setState: React.Dispatch<React.SetStateAction<CoverLetterTabState>>;
}

const CoverLetterGen: React.FC<Props> = ({ knowledgeBase, state, setState }) => {
  const { jobTitle, companyName, jobDescription, selectedLetterId, currentLetterContent, analysis, isAnalyzing } = state;

  const letterOptions = knowledgeBase.filter(k => k.category === 'cover_letter');

  const updateState = (updates: Partial<CoverLetterTabState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleDraftSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const selected = letterOptions.find(r => r.id === newId);
    updateState({ 
        selectedLetterId: newId,
        currentLetterContent: selected ? selected.content : '' 
    });
  };

  const handleAnalyze = async () => {
    if (!currentLetterContent.trim()) {
      alert("Please provide cover letter content.");
      return;
    }
    if (!jobDescription.trim()) {
        alert("Please enter a job description.");
        return;
    }

    updateState({ isAnalyzing: true, analysis: null });

    try {
      // RAG Step: Retrieve context based on the Job Description and the current letter
      // We mix JD and Letter content for the query to find supporting evidence
      const query = `${jobDescription}\n${currentLetterContent}`.slice(0, 1000);
      const relevantContext = await queryVectorDB(query, 5);

      const result = await analyzeAndTailorCoverLetter(
        relevantContext,
        currentLetterContent,
        { jobTitle, companyName, jobDescription }
      );
      updateState({ analysis: result });
    } catch (e) {
      alert("Error analyzing cover letter.");
    } finally {
      updateState({ isAnalyzing: false });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col gap-4 overflow-y-auto pr-2">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
            Application Details & Draft
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Job Title</label>
                <input 
                  type="text" 
                  value={jobTitle}
                  onChange={e => updateState({ jobTitle: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={e => updateState({ companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Job Description</label>
              <textarea 
                value={jobDescription}
                onChange={e => updateState({ jobDescription: e.target.value })}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                placeholder="Paste context here..."
              />
            </div>

            <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-slate-400">Select Draft Source</label>
                {letterOptions.length > 0 && (
                    <select 
                        className="bg-slate-900 text-xs border border-slate-700 rounded p-1 text-slate-300"
                        value={selectedLetterId}
                        onChange={handleDraftSelect}
                    >
                        <option value="">-- Manual Paste --</option>
                        {letterOptions.map(r => (
                            <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                    </select>
                )}
            </div>
            <textarea 
              value={currentLetterContent}
              onChange={e => updateState({ currentLetterContent: e.target.value })}
              className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              placeholder="Paste your cover letter draft here..."
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all
              ${isAnalyzing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
              }`}
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Retrieving & Critiquing...</span>
            ) : (
              <>
                <IconFileText className="w-5 h-5" /> Analyze Draft
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col h-full min-h-[500px]">
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-sm font-semibold text-slate-300">Critique & Feedback</h2>
          </div>
          <div className="flex-1 p-6 overflow-auto bg-slate-900/50 space-y-6">
            {analysis ? (
              <>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/80 p-4 rounded-lg border border-green-900/50">
                     <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <IconCheck className="w-4 h-4" /> Strong Points
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
                        <IconX className="w-4 h-4" /> Weak / Irrelevant
                     </h3>
                     <ul className="space-y-2">
                        {analysis.irrelevant.length > 0 ? analysis.irrelevant.map((point, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="block w-1 h-1 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                                {point}
                            </li>
                        )) : <span className="text-slate-500 text-sm italic">None found.</span>}
                     </ul>
                  </div>
                </div>

                 {/* Missing Skills from Context */}
                 {analysis.missing_from_kb.length > 0 && (
                     <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-800/50">
                        <h3 className="text-indigo-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <IconPlus className="w-4 h-4" /> Missing Key Info
                        </h3>
                         <p className="text-xs text-indigo-300/70 mb-3">
                            RAG identified these items from your profile to strengthen the application.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {analysis.missing_from_kb.map((point, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-200 text-xs rounded border border-indigo-500/30">
                                    {point}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                 {/* Suggestions */}
                 <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                     <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <IconSparkles className="w-4 h-4" /> Improvement Suggestions
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
                <p>Paste your cover letter draft to receive feedback.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterGen;