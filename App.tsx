
import React, { useState, useEffect } from 'react';
import { AppTab, KnowledgeSnippet, ResumeTabState, CoverLetterTabState, QATabState } from './types';
import ContextManager from './components/ContextManager';
import ResumeTailor from './components/ResumeTailor';
import CoverLetterGen from './components/CoverLetterGen';
import QuestionAssistant from './components/QuestionAssistant';
import { IconDatabase, IconBriefcase, IconFileText, IconMessageSquare } from './components/icons';
import { fetchKnowledgeBase } from './services/vectorStore';

const App = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CONTEXT);
  
  // -- Knowledge Base (Synced with Vector DB) --
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeSnippet[]>([]);
  const [isKBLoading, setIsKBLoading] = useState(true);

  const loadKB = async () => {
    setIsKBLoading(true);
    try {
      const data = await fetchKnowledgeBase();
      setKnowledgeBase(data);
    } catch (e) {
      console.error("Failed to fetch knowledge base from DB", e);
    } finally {
      setIsKBLoading(false);
    }
  };

  useEffect(() => {
    loadKB();
  }, []);


  // -- Persistent Resume Tab State --
  const [resumeState, setResumeState] = useState<ResumeTabState>(() => {
    const defaultState: ResumeTabState = {
      jobTitle: '',
      companyName: '',
      jobDescription: '',
      selectedResumeId: '',
      currentResumeContent: '',
      analysis: null,
      isAnalyzing: false
    };
    try {
      const saved = localStorage.getItem('jobai_resume_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed, isAnalyzing: false };
      }
    } catch (e) {}
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('jobai_resume_state', JSON.stringify(resumeState));
  }, [resumeState]);


  // -- Persistent Cover Letter Tab State --
  const [coverLetterState, setCoverLetterState] = useState<CoverLetterTabState>(() => {
    const defaultState: CoverLetterTabState = {
      jobTitle: '',
      companyName: '',
      jobDescription: '',
      selectedLetterId: '',
      currentLetterContent: '',
      analysis: null,
      isAnalyzing: false
    };
    try {
      const saved = localStorage.getItem('jobai_cover_letter_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed, isAnalyzing: false };
      }
    } catch (e) {}
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('jobai_cover_letter_state', JSON.stringify(coverLetterState));
  }, [coverLetterState]);


  // -- Persistent QA Tab State --
  const [qaState, setQaState] = useState<QATabState>(() => {
    const defaultState: QATabState = {
      question: '',
      answer: null,
      isGenerating: false
    };
    try {
      const saved = localStorage.getItem('jobai_qa_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed, isGenerating: false };
      }
    } catch (e) {}
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('jobai_qa_state', JSON.stringify(qaState));
  }, [qaState]);


  const renderContent = () => {
    switch (activeTab) {
      case AppTab.CONTEXT:
        return (
            <ContextManager 
                data={knowledgeBase} 
                onRefresh={loadKB} 
                isLoading={isKBLoading} 
            />
        );
      case AppTab.RESUME:
        return (
          <ResumeTailor 
            knowledgeBase={knowledgeBase} 
            state={resumeState}
            setState={setResumeState}
          />
        );
      case AppTab.COVER_LETTER:
        return (
          <CoverLetterGen 
            knowledgeBase={knowledgeBase} 
            state={coverLetterState}
            setState={setCoverLetterState}
          />
        );
      case AppTab.QA:
        return (
          <QuestionAssistant 
            knowledgeBase={knowledgeBase} 
            state={qaState}
            setState={setQaState}
          />
        );
      default:
        return (
            <ContextManager 
                data={knowledgeBase} 
                onRefresh={loadKB} 
                isLoading={isKBLoading} 
            />
        );
    }
  };

  const NavItem = ({ tab, label, icon: Icon }: { tab: AppTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium transition-all duration-200
        ${activeTab === tab 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
      <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-blue-400' : 'text-slate-500'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <img 
              src="./logo1.png" 
              alt="Spotlify Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Spotlify
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-2">Personal Job Hunt Assistant</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem tab={AppTab.CONTEXT} label="Knowledge Base" icon={IconDatabase} />
          <NavItem tab={AppTab.RESUME} label="Resume Tailor" icon={IconBriefcase} />
          <NavItem tab={AppTab.COVER_LETTER} label="Cover Letter" icon={IconFileText} />
          <NavItem tab={AppTab.QA} label="Q&A Helper" icon={IconMessageSquare} />
        </nav>

        <div className="p-4 border-t border-slate-800 text-center">
           <div className="text-xs text-slate-600 font-mono">
             Made by Sparsh Hurkat
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen bg-slate-950 relative">
        <div className="max-w-7xl mx-auto p-6 md:p-12">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeTab === AppTab.CONTEXT && "Knowledge Base"}
                {activeTab === AppTab.RESUME && "Resume Tailor"}
                {activeTab === AppTab.COVER_LETTER && "Cover Letter Generator"}
                {activeTab === AppTab.QA && "Application Question Assistant"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {activeTab === AppTab.CONTEXT && "Manage your resume versions, skills, and bio data here."}
                {activeTab === AppTab.RESUME && "Generate a targeted resume for specific job openings."}
                {activeTab === AppTab.COVER_LETTER && "Draft personalized cover letters in seconds."}
                {activeTab === AppTab.QA && "Get help answering specific application questions using STAR method."}
              </p>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
