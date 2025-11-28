import React from 'react';
import { KnowledgeSnippet, QATabState } from '../types';
import { answerApplicationQuestion } from '../services/geminiService';
import { queryVectorDB } from '../services/vectorStore';
import { IconMessageSquare, IconSparkles } from './icons';

interface Props {
  knowledgeBase: KnowledgeSnippet[];
  state: QATabState;
  setState: React.Dispatch<React.SetStateAction<QATabState>>;
}

const QuestionAssistant: React.FC<Props> = ({ knowledgeBase, state, setState }) => {
  const { question, answer, isGenerating } = state;

  const updateState = (updates: Partial<QATabState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleGenerate = async () => {
    if (!question.trim()) return;

    updateState({ isGenerating: true, answer: null });

    try {
      // RAG Step: Retrieve context strictly relevant to the specific question
      const relevantContext = await queryVectorDB(question, 3);
      
      const result = await answerApplicationQuestion(relevantContext, question);
      updateState({ answer: result });
    } catch (e) {
      alert("Error generating answer.");
    } finally {
      updateState({ isGenerating: false });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-lg font-semibold mb-2 text-amber-400 flex items-center gap-2">
          <IconMessageSquare className="w-5 h-5" />
          Application Q&A
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Paste specific questions from the application portal (e.g., "Describe a difficult challenge you overcame"). 
          The AI will search your Pinecone vector DB for relevant stories and answer using the STAR method.
        </p>

        <textarea 
          value={question}
          onChange={e => updateState({ question: e.target.value })}
          className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none mb-4"
          placeholder="Paste the question here..."
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !question}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all
            ${isGenerating || !question
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
            }`}
        >
          {isGenerating ? (
            <span className="animate-pulse">Retrieving & Thinking...</span>
          ) : (
            <>
              <IconSparkles className="w-5 h-5" /> Generate Answer
            </>
          )}
        </button>
      </div>

      {answer && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-300">Suggested Answer</h3>
          </div>
          <div className="p-6 bg-slate-900/30">
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionAssistant;