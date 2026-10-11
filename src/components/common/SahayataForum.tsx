import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Search, MessageSquare, CheckCircle2, Lock, 
  Image as ImageIcon, Plus, ShieldCheck, ChevronRight, MessageCircle 
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { executeSafeUpdate } from '../../lib/dbUtils';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface Thread {
  id: string;
  title: string;
  body: string;
  category: string;
  authorId: string;
  authorName: string;
  workspaceType: string;
  timestamp: number;
  status: 'Open' | 'Resolved' | 'Pinned';
  attachmentUrl?: string;
  upvotes: number;
  replyCount?: number;
}

interface Reply {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  timestamp: number;
  isOfficialTrackIQ: boolean;
  isAcceptedAnswer: boolean;
}

export const SahayataForum: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { safeTranslate } = useLanguage();
  const { activeWorkspace, currentRole, currentDevotee } = useAuthWorkspace();
  const { showToast } = useToast();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('How-To');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  
  const [replyBody, setReplyBody] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const CATEGORIES = ['All', 'Bugs', 'How-To', 'Feature Requests', 'Best Practice', 'My Posts'];
  const isSuperAdmin = (currentRole as string) === 'SUPER_ADMIN' || currentRole === 'SuperAdmin';

  const pushToDataLayer = (event: string, data: any) => {
    if ((window as any).dataLayer) {
      (window as any).dataLayer.push({
        event,
        ...data
      });
    }
  };

  // Fetch Threads
  useEffect(() => {
    const q = query(collection(db, 'global_support_threads'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Thread[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Thread);
      });
      setThreads(fetched);
    }, (error) => {
      console.warn("Firebase SahayataForum sync (threads):", error.message);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Replies when a thread is selected
  useEffect(() => {
    if (!selectedThread) return;
    const q = query(
      collection(db, 'global_support_replies'),
      where('threadId', '==', selectedThread.id),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Reply[] = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Reply);
      });
      setReplies(fetched);
    }, (error) => {
      // If index is missing, it will throw. Fallback to fetching all and filtering in memory if needed.
      console.warn("Firebase SahayataForum sync (replies):", error.message);
    });
    return () => unsubscribe();
  }, [selectedThread]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length > 2) {
      pushToDataLayer('search_support', { search_term: val });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImageFile } = await import('../../utils/imageCompression');
      const base64Str = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
      setAttachmentUrl(base64Str);
    } catch (err) {
      console.error('Failed to compress attachment image:', err);
      showToast('Failed to process image attachment.', 'error');
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      showToast('Title and body are required.', 'error');
      return;
    }

    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
    const currentAuthorId = currentDevotee ? currentDevotee.id : activeWorkspace.id + '_' + currentRole;
    const currentAuthorName = currentDevotee ? currentDevotee.name : (isSuperAdmin ? 'TrackIQ Support' : 'Workspace Admin');

    const newThread: Omit<Thread, 'id'> = {
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCategory,
      authorId: currentAuthorId,
      authorName: currentAuthorName,
      workspaceType: activeWorkspace.type,
      timestamp: Date.now(),
      status: 'Open',
      attachmentUrl,
      upvotes: 0,
      replyCount: 0
    };

    await executeSafeUpdate('global_support_threads', threadId, newThread, 'set');
    
    pushToDataLayer('create_support_thread', { category: newCategory });
    showToast('Post created successfully.', 'success');
    
    setIsComposeOpen(false);
    setNewTitle('');
    setNewBody('');
    setAttachmentUrl('');
  };

  const handleCreateReply = async () => {
    if (!selectedThread || !replyBody.trim()) return;

    const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
    const currentAuthorId = currentDevotee ? currentDevotee.id : activeWorkspace.id + '_' + currentRole;
    const currentAuthorName = currentDevotee ? currentDevotee.name : (isSuperAdmin ? 'TrackIQ Support' : 'Workspace Admin');

    const newReply: Omit<Reply, 'id'> = {
      threadId: selectedThread.id,
      body: replyBody.trim(),
      authorId: currentAuthorId,
      authorName: currentAuthorName,
      timestamp: Date.now(),
      isOfficialTrackIQ: isSuperAdmin,
      isAcceptedAnswer: false
    };

    await executeSafeUpdate('global_support_replies', replyId, newReply, 'set');
    
    // Update thread reply count implicitly (or explicitly)
    await executeSafeUpdate('global_support_threads', selectedThread.id, {
      replyCount: (selectedThread.replyCount || 0) + 1
    }, 'update');

    setReplyBody('');
    showToast('Reply posted.', 'success');
  };

  const handleAcceptAnswer = async (reply: Reply) => {
    if (!selectedThread) return;
    const currentAuthorId = currentDevotee ? currentDevotee.id : activeWorkspace.id + '_' + currentRole;
    
    // Only the author of the thread can mark as resolved
    if (selectedThread.authorId !== currentAuthorId && !isSuperAdmin) {
      showToast('Only the original author can mark an answer as accepted.', 'error');
      return;
    }

    await executeSafeUpdate('global_support_replies', reply.id, {
      isAcceptedAnswer: true
    }, 'update');

    await executeSafeUpdate('global_support_threads', selectedThread.id, {
      status: 'Resolved'
    }, 'update');

    showToast('Marked as accepted solution.', 'success');
  };

  // Filter threads
  const filteredThreads = threads.filter(t => {
    const currentAuthorId = currentDevotee ? currentDevotee.id : activeWorkspace.id + '_' + currentRole;
    let matchCat = true;
    if (activeFilter === 'My Posts') {
      matchCat = t.authorId === currentAuthorId;
    } else if (activeFilter !== 'All') {
      matchCat = t.category.includes(activeFilter) || activeFilter.includes(t.category);
    }
    
    const matchSearch = t.title?.toLowerCase().includes(searchQuery?.toLowerCase()) || 
                        t.body?.toLowerCase().includes(searchQuery?.toLowerCase());
                        
    return matchCat && matchSearch;
  });

  const renderDashboard = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 md:p-8 bg-slate-900 text-white shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black">{safeTranslate('sahayata_title', 'Sahayata Forum', 'সহায়তা ফোরাম', 'सहायता फोरम')}</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Global Community Support & Discussion Desk</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder={safeTranslate('search_forum', 'Search discussions...', 'আলোচনা খুঁজুন...', 'चर्चा खोजें...')}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-saffron-500 transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-saffron-500/20 shrink-0"
          >
            <Plus className="w-5 h-5" />
            {safeTranslate('ask_community', 'Ask the Community', 'কমিউনিটিকে জিজ্ঞাসা করুন', 'समुदाय से पूछें')}
          </button>
        </div>

        <div className="flex gap-2 mt-6 overflow-x-auto custom-scrollbar pb-2">
          {CATEGORIES.map((cat, idx) => (
            <button 
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeFilter === cat 
                  ? 'bg-white text-slate-900' 
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No discussions found.</p>
              <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            filteredThreads.map((thread, idx) => (
              <div 
                key={`${thread.id}-${idx}`} 
                onClick={() => setSelectedThread(thread)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-saffron-500/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">
                        {thread.category}
                      </span>
                      {thread.status === 'Resolved' && (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      )}
                      {thread.status === 'Pinned' && (
                        <span className="flex items-center gap-1 text-indigo-600 text-xs font-bold bg-indigo-50 px-2.5 py-0.5 rounded-md">
                          Pinned
                        </span>
                      )}
                      {thread.status === 'Open' && (
                        <span className="text-slate-400 text-xs font-bold px-2.5 py-0.5 border border-slate-200 rounded-md">
                          Open
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-saffron-500 transition-colors mb-2">
                      {thread.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                      {thread.body}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                          {thread.authorName.charAt(0)}
                        </div>
                        <span className="text-slate-600">{thread.authorName}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">{thread.workspaceType}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(thread.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-saffron-50 group-hover:border-saffron-100 transition-colors">
                    <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-saffron-500 mb-1" />
                    <span className="font-bold text-slate-700 group-hover:text-saffron-700">{thread.replyCount || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderThreadView = () => {
    if (!selectedThread) return null;
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <button 
            onClick={() => setSelectedThread(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Discussions
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-4xl mx-auto">
            {/* Original Post */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md uppercase tracking-wider">
                  {selectedThread.category}
                </span>
                {selectedThread.status === 'Resolved' && (
                  <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Resolved
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">{selectedThread.title}</h1>
              
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                  {selectedThread.authorName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedThread.authorName}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold">{selectedThread.workspaceType}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{new Date(selectedThread.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="prose prose-slate max-w-none mb-6">
                <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">{selectedThread.body}</p>
              </div>

              {selectedThread.attachmentUrl && (
                <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLightboxImage(selectedThread.attachmentUrl!)}>
                  <img src={selectedThread.attachmentUrl || undefined} alt="Attachment" className="max-h-96 w-auto object-contain bg-slate-100" />
                </div>
              )}
            </div>

            {/* Replies */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-black text-slate-900 mb-4">{replies.length} Replies</h3>
              {replies.map((reply, idx) => (
                <div 
                  key={`${reply.id}-${idx}`} 
                  className={`bg-white rounded-2xl p-6 shadow-sm border ${
                    reply.isOfficialTrackIQ ? 'border-indigo-300 bg-indigo-50/30' : 
                    reply.isAcceptedAnswer ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        reply.isOfficialTrackIQ ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {reply.isOfficialTrackIQ ? <ShieldCheck className="w-5 h-5" /> : reply.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${reply.isOfficialTrackIQ ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {reply.authorName}
                          </span>
                          {reply.isOfficialTrackIQ && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1">
                              Official TrackIQ Support
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{new Date(reply.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {reply.isAcceptedAnswer && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" /> Accepted Solution
                      </div>
                    )}
                  </div>
                  
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                  
                  {/* Mark as accepted logic */}
                  {!reply.isAcceptedAnswer && selectedThread.status !== 'Resolved' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      {(selectedThread.authorId === (currentDevotee ? currentDevotee.id : activeWorkspace.id + '_' + currentRole) || isSuperAdmin) && (
                        <button 
                          onClick={() => handleAcceptAnswer(reply)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm transition-colors border border-emerald-200"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark as Solution
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Reply Box */}
            {selectedThread.status !== 'Resolved' && selectedThread.status !== 'Pinned' ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-12">
                <h4 className="font-bold text-slate-900 mb-4">Post a Reply</h4>
                <textarea 
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 resize-none mb-4"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleCreateReply}
                    disabled={!replyBody.trim()}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors"
                  >
                    Post Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 rounded-2xl border border-slate-200 p-6 text-center mb-12 flex flex-col items-center">
                <Lock className="w-8 h-8 text-slate-400 mb-2" />
                <h4 className="font-bold text-slate-700">Thread Closed</h4>
                <p className="text-sm text-slate-500 mt-1">This discussion has been marked as resolved or locked and is not accepting new replies.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderComposeModal = () => {
    if (!isComposeOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Ask the Community</h2>
            <button onClick={() => setIsComposeOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
              <select 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white font-medium"
              >
                {CATEGORIES.filter(c => c !== 'All' && c !== 'My Posts').map((cat, idx) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
              <input 
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Brief summary of your question or issue"
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 font-medium"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Details</label>
              <textarea 
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Provide as much context as possible..."
                className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-saffron-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Attach Screenshot (Optional)</label>
              {attachmentUrl ? (
                <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img src={attachmentUrl || undefined} alt="Preview" className="max-h-48 object-contain" />
                  <button 
                    onClick={() => setAttachmentUrl('')} 
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full transition-colors backdrop-blur-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 hover:border-saffron-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-saffron-50/30 transition-colors group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-saffron-500 mb-2 transition-colors" />
                    <p className="text-sm text-slate-500 font-medium group-hover:text-slate-700">Click to upload an image</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={() => setIsComposeOpen(false)}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreatePost}
              disabled={!newTitle.trim() || !newBody.trim()}
              className="px-8 py-2.5 bg-saffron-500 hover:bg-saffron-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              Post Thread
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLightbox = () => {
    if (!lightboxImage) return null;
    return (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in"
        onClick={() => setLightboxImage(null)}
      >
        <button 
          onClick={() => setLightboxImage(null)}
          className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <img src={lightboxImage || undefined} alt="Attachment Full" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-bottom-4 duration-300">
      {selectedThread ? renderThreadView() : renderDashboard()}
      {renderComposeModal()}
      {renderLightbox()}
    </div>,
    document.body
  );
};
