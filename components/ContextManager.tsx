
import React, { useState } from 'react';
import { KnowledgeSnippet } from '../types';
import { IconDatabase, IconTrash, IconPlus, IconSparkles } from './icons';
import { upsertToVectorDB, deleteFromVectorDB } from '../services/vectorStore';

interface Props {
  data: KnowledgeSnippet[];
  // Replaced direct setData with a refresh trigger passed from parent or handles internally?
  // We keep structure simple: Parent handles fetching, this triggers updates.
  onRefresh: () => void;
  isLoading: boolean;
}

const ContextManager: React.FC<Props> = ({ data, onRefresh, isLoading }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeSnippet['category']>('resume');
  const [newContent, setNewContent] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    setIsSyncing(true);
    const newItem: KnowledgeSnippet = {
      id: Date.now().toString(),
      title: newTitle,
      category: newCategory,
      content: newContent,
    };

    try {
      // 1. Vectorize and Store in Pinecone (Source of Truth)
      await upsertToVectorDB(newItem);
      
      // 2. Trigger refresh to fetch updated list from DB
      onRefresh();

      // Reset form
      setNewTitle('');
      setNewContent('');
    } catch (error) {
      alert("Failed to sync to Vector DB. Check console/API Keys.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this from the Vector Database?")) return;
    
    setIsDeletingId(id);
    try {
        await deleteFromVectorDB(id);
        onRefresh();
    } catch(e) {
        alert("Failed to delete from Vector DB.");
    } finally {
        setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-blue-400">
          <IconDatabase className="w-5 h-5" />
          Knowledge Base (Pinecone DB)
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Add your resume versions, project details, bio, and skills here. 
          Data is stored directly in your Pinecone Vector Database and retrieved on load.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Title (e.g., 'React Resume 2024')"
            className="md:col-span-2 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as any)}
          >
            <option value="resume">Resume</option>
            <option value="cover_letter">Cover Letter</option>
            <option value="project">Project Detail</option>
            <option value="bio">Bio / Soft Skills</option>
            <option value="skill">Technical Skills</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={isSyncing}
            className={`rounded-lg p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${isSyncing ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                 <IconSparkles className="w-4 h-4 animate-spin" /> Uploading...
              </span>
            ) : (
              <><IconPlus className="w-4 h-4" /> Save to DB</>
            )}
          </button>
        </div>
        <textarea
          placeholder="Paste content here..."
          className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-white font-mono"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && data.length === 0 ? (
            <div className="text-center py-12 text-slate-500 animate-pulse">
                Loading from Pinecone...
            </div>
        ) : (
            <>
                {data.map((item) => (
                <div key={item.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex justify-between items-start group hover:border-slate-600 transition-colors">
                    <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                        ${item.category === 'resume' ? 'bg-purple-900/50 text-purple-300' : 
                            item.category === 'cover_letter' ? 'bg-indigo-900/50 text-indigo-300' :
                            item.category === 'project' ? 'bg-emerald-900/50 text-emerald-300' :
                            item.category === 'skill' ? 'bg-amber-900/50 text-amber-300' :
                            'bg-slate-700 text-slate-300'}`}>
                        {item.category.replace('_', ' ')}
                        </span>
                        <h3 className="font-medium text-slate-200">{item.title}</h3>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-2 font-mono">{item.content}</p>
                    </div>
                    <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeletingId === item.id}
                    className="text-slate-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
                    >
                    {isDeletingId === item.id ? <IconSparkles className="w-4 h-4 animate-spin"/> : <IconTrash className="w-4 h-4" />}
                    </button>
                </div>
                ))}
                {!isLoading && data.length === 0 && (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                    No data found in Vector DB.
                </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default ContextManager;
