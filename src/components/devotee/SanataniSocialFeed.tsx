import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, MessageCircle, Heart, Share2, Send, Image as ImageIcon, Sparkles, 
  Calendar, Flame, Sun, Filter, Plus, Clock, MapPin, 
  Volume2, VolumeX, CheckCircle2, X, Bell, Award, User, RefreshCw,
  Globe, Users, Lock, ShieldCheck, ChevronDown, Check, Smile,
  Tag, Palette, Trash2, AlertTriangle, Radio, ShieldAlert, Activity, Battery
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { OfflineSyncManager } from '../../services/OfflineSyncManager';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { DirectMessageChat } from '../common/DirectMessageChat';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom pulsing red dot icon for victims
const emergencyIcon = L.divIcon({
  className: 'custom-emergency-icon',
  html: '<div class="animate-pulse" style="width: 20px; height: 20px; background-color: #dc2626; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(220,38,38,0.8);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export type PostAudience = 'public' | 'devotees' | 'members' | 'trustees' | 'gotra' | 'private';

export interface FeedComment {
  id: string;
  authorName: string;
  authorId?: string;
  authorRole?: string;
  avatarLetter: string;
  text: string;
  timestamp: string;
}

export interface FeedPost {
  id: string;
  workspaceId: string;
  authorId?: string;
  authorName: string;
  authorRole: 'Head Priest' | 'Trustee' | 'Devotee' | 'Volunteer' | 'Purohit';
  authorCity?: string;
  avatarLetter: string;
  isOfficial?: boolean;
  category: string; // standard or custom
  customCategoryName?: string;
  customCategoryEmoji?: string;
  audience: PostAudience;
  feeling?: string;
  location?: string;
  bgGradient?: string;
  title?: string;
  content: string;
  imageUrl?: string;
  shloka?: {
    sanskrit: string;
    translation: string;
    source: string;
  };
  eventDate?: string;
  pranams: number;
  hasPranamed?: boolean;
  flowersOffered: number;
  diyasLit: number;
  comments: FeedComment[];
  createdAt: string;
  tags: string[];
}

export const AUDIENCE_OPTIONS: Array<{
  key: PostAudience;
  label: string;
  icon: string;
  desc: string;
  badge: string;
}> = [
  {
    key: 'public',
    label: 'Public',
    icon: '🌐',
    desc: 'Anyone on or off Sanatani Bandhan network can see this post',
    badge: 'Public'
  },
  {
    key: 'devotees',
    label: 'Fellow Devotees',
    icon: '👥',
    desc: 'Your connected devotees and spiritual community',
    badge: 'Devotees'
  },
  {
    key: 'members',
    label: 'Mandir Members Only',
    icon: '🏛️',
    desc: 'Only registered members & sevadars of this Mandir',
    badge: 'Members'
  },
  {
    key: 'trustees',
    label: 'Purohits & Trustees',
    icon: '📜',
    desc: 'Verified Vedic scholars, purohits, managers, and trustees',
    badge: 'Purohits & Admin'
  },
  {
    key: 'gotra',
    label: 'Family & Gotra Circle',
    icon: '🌿',
    desc: 'Devotees sharing common Gotra or family kula circles',
    badge: 'Gotra Circle'
  },
  {
    key: 'private',
    label: 'Only Me',
    icon: '🔒',
    desc: 'Private spiritual journal & personal Sankalp notes',
    badge: 'Only Me'
  }
];

export const STANDARD_CATEGORIES = [
  { key: 'darshan', label: '🌺 Daily Darshan & Aarti', emoji: '🌺', name: 'Daily Darshan' },
  { key: 'announcement', label: '📢 Mandir Notices & Events', emoji: '📢', name: 'Notices' },
  { key: 'katha', label: '📜 Shloka, Katha & Sanskrit', emoji: '📜', name: 'Katha & Shloka' },
  { key: 'seva', label: '🐄 Goshala & Seva Drives', emoji: '🐄', name: 'Seva & Annadanam' },
  { key: 'DEVOTEE', label: '🙏 Devotee Reflection', emoji: '🙏', name: 'Devotee Reflection' },
  { key: 'bhajan', label: '🎵 Bhajan, Kirtan & Stotram', emoji: '🎵', name: 'Bhajan & Stotram' },
  { key: 'yajna', label: '🔥 Yajna, Havan & Sankalp', emoji: '🔥', name: 'Yajna & Sankalp' },
  { key: 'yatra', label: '🚩 Tirth Yatra & Pilgrimage', emoji: '🚩', name: 'Tirth Yatra' },
  { key: 'other', label: '✨ Other (Custom Category)', emoji: '✨', name: 'Custom Category' },
];

export const FEELING_OPTIONS = [
  '🙏 Feeling Blessed',
  '🧘 Doing Japa & Dhyana',
  '🪔 In Deep Prayer',
  '🌺 At Morning Mangala Aarti',
  '📖 Reading Bhagavad Gita',
  '🚩 On Sacred Tirth Yatra',
  '🐄 Serving at Goshala',
  '🕉️ In Devotional Bliss',
  '✨ Feeling Grateful'
];

export const BG_GRADIENTS = [
  { label: 'None', value: '' },
  { label: 'Saffron Sun', value: 'from-saffron-600 to-saffron-700 text-white' },
  { label: 'Temple Crimson', value: 'from-red-800 to-saffron-900 text-white' },
  { label: 'Deep Twilight', value: 'from-temple-900 to-temple-800 text-saffron-200' },
  { label: 'Sacred Ganga', value: 'from-indigo-900 to-blue-900 text-white' },
  { label: 'Tulsi Green', value: 'from-emerald-800 to-teal-900 text-white' }
];

export const CUSTOM_EMOJIS = ['🪷', '🚩', '🪔', '🕉️', '📚', '🔔', '🌿', '🕊️', '🏛️', '✨', '🐄', '🪙', '🎵', '🧘', '🤝', '🌺'];

export const SanataniSocialFeed: React.FC = () => {
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const { showToast } = useToast();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showFeelingsModal, setShowFeelingsModal] = useState(false);
  
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<{id: string, name: string} | null>(null);
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});
  
  // New Post Form State (Facebook Style)
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('DEVOTEE');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryEmoji, setCustomCategoryEmoji] = useState('✨');
  const [newPostAudience, setNewPostAudience] = useState<PostAudience>('public');
  const [newPostFeeling, setNewPostFeeling] = useState<string>('');
  const [newPostLocation, setNewPostLocation] = useState<string>('');
  const [newPostBgGradient, setNewPostBgGradient] = useState<string>('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [newPostTag, setNewPostTag] = useState('');

  // Daily Darshan Offering State
  const [offeringAnimation, setOfferingAnimation] = useState<'flower' | 'diya' | null>(null);
  const [isSpeakingShloka, setIsSpeakingShloka] = useState(false);

  // Cross-app / Global Active Emergencies
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);

  // Online SOS Modal State
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosSituation, setSosSituation] = useState('ACCIDENT'); 
  const [sosDetails, setSosDetails] = useState('');

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const q = query(
      collection(db, 'yatra_broadcasts'),
      where('communityId', '==', activeWorkspace.id),
      where('type', '==', 'RICH_SOS')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emergencies = snapshot.docs.map((doc, idx) => ({ id: doc.id, ...doc.data() })) as any[];
      // Filter out resolved emergencies client-side
      setActiveEmergencies(emergencies.filter(e => e.sosStatus !== 'RESOLVED').sort((a, b) => b.originalTimestamp - a.originalTimestamp));
    }, (err) => console.warn("Firebase social feed sync:", err.message));
    
    return () => unsubscribe();
  }, [activeWorkspace?.id]);

  const handleOnlineSOS = async () => {
    if (!activeWorkspace?.id) {
      showToast('Please select a workspace before broadcasting.', 'error');
      return;
    }

    // Attempt to get battery level
    let batteryLevel = null;
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch (e) {}

    // Attempt to get location
    let location = null;
    try {
      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 10000 }
          );
        });
      }
    } catch (e) {}

    const payload = {
      senderId: currentUser?.id || 'anonymous_user',
      senderName: currentUser?.name || 'Devotee',
      senderPhoto: (currentUser as any)?.photoUrl || null,
      communityId: activeWorkspace.id,
      situation: sosSituation,
      details: sosDetails,
      location,
      batteryLevel,
      text: `🚨 URGENT [${sosSituation.replace('_', ' ')}]: ${sosDetails}`,
    };

    OfflineSyncManager.addToQueue('RICH_SOS', payload);
    setShowSOSModal(false);
    setSosDetails('');
    showToast('EMERGENCY BROADCASTED TO ALL NETWORKS', 'success');
  };

  // Storage Key
  const storageKey = `sanatani_feed_${activeWorkspace?.id || 'default'}`;

  // Initial Seed Data
  const getInitialPosts = (): FeedPost[] => {
    const wsName = activeWorkspace?.name || 'Sanatani Mandir';
    const city = activeWorkspace?.city || 'Varanasi';
    return [
      {
        id: 'post-1',
        workspaceId: activeWorkspace?.id || 'demo',
        authorName: `${wsName} Devasthanam`,
        authorRole: 'Trustee',
        isOfficial: true,
        authorCity: city,
        avatarLetter: '🕉️',
        category: 'darshan',
        audience: 'public',
        feeling: '🌺 At Morning Mangala Aarti',
        location: `${wsName}, ${city}`,
        title: 'Shubh Prabhat • Sacred Mangala Darshan & Shringar',
        content: `Divine Mangala Aarti completed this morning at 5:30 AM with Vedic chantings of Purusha Suktam. Today's Shringar is adorned with fresh Bilva patra, Rajnigandha malas, and Chandan lep. May all devotees receive peace and prosperity.`,
        imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
        pranams: 108,
        hasPranamed: false,
        flowersOffered: 342,
        diyasLit: 216,
        comments: [
          {
            id: 'c1',
            authorName: 'Pandit Radheshyam',
            authorRole: 'Head Priest',
            avatarLetter: 'R',
            text: 'हर हर महादेव! अत्यंत पावन एवं अलौकिक दर्शन। समस्त भक्तों पर कृपा बनी रहे।',
            timestamp: '2 hours ago'
          },
          {
            id: 'c2',
            authorName: 'Sunita Devi',
            authorRole: 'Devotee',
            avatarLetter: 'S',
            text: 'Jai Shri Ram! 🙏 Feeling blessed witnessing today’s Mangala Aarti.',
            timestamp: '1 hour ago'
          }
        ],
        createdAt: 'Today at 6:15 AM',
        tags: ['DailyDarshan', 'MangalaAarti', 'Shringar']
      },
      {
        id: 'post-2',
        workspaceId: activeWorkspace?.id || 'demo',
        authorName: 'Vedic Dharma Sabha',
        authorRole: 'Purohit',
        isOfficial: true,
        avatarLetter: '📜',
        category: 'katha',
        audience: 'public',
        feeling: '📖 Reading Bhagavad Gita',
        title: 'Daily Shloka of Wisdom • Adhyaya 2, Shloka 47',
        content: 'Focus entirely on righteous action without craving fruit or falling into inaction.',
        shloka: {
          sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
          translation: 'You have a right to perform your prescribed duty, but not to the fruits of action. Never consider yourself the cause of the results, nor be attached to inaction.',
          source: 'Bhagavad Gita 2.47'
        },
        pranams: 84,
        hasPranamed: true,
        flowersOffered: 120,
        diyasLit: 98,
        comments: [],
        createdAt: '5 hours ago',
        tags: ['GitaWisdom', 'KarmaYoga', 'Sanskrit']
      },
      {
        id: 'post-3',
        workspaceId: activeWorkspace?.id || 'demo',
        authorName: 'Shri Goshala Seva Samiti',
        authorRole: 'Trustee',
        isOfficial: true,
        avatarLetter: '🐄',
        category: 'seva',
        audience: 'members',
        location: 'Mandir Goshala Complex',
        title: 'Amrit Grass & Annadanam Seva Drive Completed',
        content: 'With the blessings of Gau Mata, 450 kg of fresh green fodder, jaggery, and mineral churna were distributed across all 84 Desi Gir and Sahiwal cows today. Special Gratitude to all Yajaman patrons.',
        imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1000&q=80',
        pranams: 92,
        hasPranamed: false,
        flowersOffered: 154,
        diyasLit: 88,
        comments: [],
        createdAt: 'Yesterday',
        tags: ['GauSeva', 'Annadanam', 'KarmaSeva']
      }
    ];
  };

  const [posts, setPosts] = useState<FeedPost[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialPosts();
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(posts));
    } catch (e) {
      console.error(e);
    }
  }, [posts, storageKey]);

  // Sync remote posts from Firestore
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const feedRef = collection(db, `communities/${activeWorkspace.id}/social_feed`);
    const unsubscribe = onSnapshot(feedRef, (snapshot) => {
      const remotePosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeedPost[];
      
      setPosts(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        
        // Enhance remote posts with local transient UI states (like hasPranamed)
        const enhancedRemote = remotePosts.map(rp => {
          const localMatch = prevMap.get(rp.id);
          if (localMatch) {
            return { ...rp, hasPranamed: localMatch.hasPranamed };
          }
          return rp;
        });

        const remoteMap = new Map(enhancedRemote.map(p => [p.id, p]));
        const localOnly = prev.filter(p => !remoteMap.has(p.id) && String(p.id).startsWith('post-'));
        
        const combined = [...localOnly, ...enhancedRemote].sort((a, b) => {
          return String(b.id).localeCompare(String(a.id));
        });
        
        return combined;
      });
    }, (err) => console.warn("Firebase social feed sync:", err.message));
    return () => unsubscribe();
  }, [activeWorkspace?.id]);


  // Handle Pranam Reaction
  const handlePranam = (postId: string) => {
    setPosts(prev => prev.map((p, idx) => {
      if (p.id === postId) {
        const newStatus = !p.hasPranamed;
        const inc = newStatus ? 1 : -1;
        OfflineSyncManager.addToQueue('PRANAM_POST', { workspaceId: activeWorkspace?.id, postId, pranams: inc });
        return {
          ...p,
          hasPranamed: newStatus,
          pranams: newStatus ? p.pranams + 1 : Math.max(0, p.pranams - 1)
        };
      }
      return p;
    }));
  };

  // Handle Flower Offering Animation
  const handleOfferFlower = (postId: string) => {
    setOfferingAnimation('flower');
    setTimeout(() => setOfferingAnimation(null), 1200);
    OfflineSyncManager.addToQueue('PRANAM_POST', { workspaceId: activeWorkspace?.id, postId, flowersOffered: 1 });
    setPosts(prev => prev.map((p, idx) => {
      if (p.id === postId) {
        return { ...p, flowersOffered: p.flowersOffered + 1 };
      }
      return p;
    }));
    showToast('Offered Pushpam with devotion 🌺', 'success');
  };

  // Handle Diya Offering Animation
  const handleOfferDiya = (postId: string) => {
    setOfferingAnimation('diya');
    setTimeout(() => setOfferingAnimation(null), 1200);
    OfflineSyncManager.addToQueue('PRANAM_POST', { workspaceId: activeWorkspace?.id, postId, diyasLit: 1 });
    setPosts(prev => prev.map((p, idx) => {
      if (p.id === postId) {
        return { ...p, diyasLit: p.diyasLit + 1 };
      }
      return p;
    }));
    showToast('Lit a sacred Deepam 🪔', 'success');
  };

  // Recite Shloka TTS
  const playShlokaRecitation = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeakingShloka) {
        window.speechSynthesis.cancel();
        setIsSpeakingShloka(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeakingShloka(false);
      utterance.onerror = () => setIsSpeakingShloka(false);
      setIsSpeakingShloka(true);
      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Audio recitation not supported on this browser', 'info');
    }
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const text = commentInput[postId]?.trim();
    if (!text) return;

    const newComment: FeedComment = {
      id: 'c_' + Date.now(),
      authorName: currentUser?.name || 'Devotee',
      authorRole: (['Trustee', 'SuperAdmin'].includes(currentUser?.role || '') ? 'Trustee' : currentUser?.role === 'Sevadar' ? 'Staff' : 'Devotee'),
      avatarLetter: (currentUser?.name || 'D').charAt(0).toUpperCase(),
      text,
      timestamp: 'Just now'
    };

    OfflineSyncManager.addToQueue('COMMENT_SOCIAL', { workspaceId: activeWorkspace?.id, postId, comment: newComment });

    setPosts(prev => prev.map((p, idx) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    }));

    setCommentInput(prev => ({ ...prev, [postId]: '' }));
    showToast('Comment posted 🙏', 'success');
  };

  // Share Post
  const handleShare = (post: FeedPost) => {
    if (navigator.share) {
      navigator.share({
        title: post.title || 'Sanatani Social Feed',
        text: `${post.authorName || 'Devotee'}: ${(post.content || '').slice(0, 100)}...`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  // Create New Post (Full Facebook style)
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImageUrl.trim()) {
      showToast('Please write some content or attach a photo', 'error');
      return;
    }

    const isCustomCat = newPostCategory === 'other';
    const finalCategoryName = isCustomCat ? (customCategoryName.trim() || 'Custom') : newPostCategory;

    const newPost: FeedPost = {
      id: 'post-' + Date.now(),
      workspaceId: activeWorkspace?.id || 'demo',
      authorName: currentUser?.name || 'Acharya Devotee',
      authorRole: (['Trustee', 'SuperAdmin'].includes(currentUser?.role || '') ? 'Trustee' : currentUser?.role === 'Sevadar' ? 'Volunteer' : 'Devotee'),
      authorCity: activeWorkspace?.city || 'Varanasi',
      avatarLetter: (currentUser?.name || 'D').charAt(0).toUpperCase(),
      isOfficial: ['Trustee', 'SuperAdmin', 'Sevadar'].includes(currentUser?.role || ''),
      category: finalCategoryName,
      customCategoryName: isCustomCat ? customCategoryName.trim() : undefined,
      customCategoryEmoji: isCustomCat ? customCategoryEmoji : undefined,
      audience: newPostAudience,
      feeling: newPostFeeling || undefined,
      location: newPostLocation.trim() || undefined,
      bgGradient: newPostBgGradient || undefined,
      title: newPostTitle.trim() || undefined,
      content: newPostContent.trim(),
      imageUrl: newPostImageUrl.trim() || undefined,
      pranams: 1,
      hasPranamed: true,
      flowersOffered: 1,
      diyasLit: 1,
      comments: [],
      createdAt: 'Just now',
      tags: newPostTag ? newPostTag.split(',').map((t, idx) => t.trim()).filter(Boolean) : [finalCategoryName.replace(/\s+/g, '')]
    };

    setPosts([newPost, ...posts]);
    OfflineSyncManager.addToQueue('POST_SOCIAL', newPost);
    
    // Reset form
    setNewPostContent('');
    setNewPostTitle('');
    setNewPostCategory('DEVOTEE');
    setCustomCategoryName('');
    setCustomCategoryEmoji('✨');
    setNewPostAudience('public');
    setNewPostFeeling('');
    setNewPostLocation('');
    setNewPostBgGradient('');
    setNewPostImageUrl('');
    setNewPostTag('');
    setShowCreateModal(false);
    showToast('Post published to Sanatani Feed! ✨', 'success');
  };

  // Get unique dynamic category filters from posts
  const dynamicCategories = Array.from(new Set(posts.map((p, idx) => p.category))).filter(
    cat => !STANDARD_CATEGORIES.some(sc => sc.key === cat)
  );

  const filteredPosts = posts.filter(p => {
    if (selectedFilter === 'all') return true;
    return p.category === selectedFilter;
  });

  const currentAudienceObj = AUDIENCE_OPTIONS.find(a => a.key === newPostAudience) || AUDIENCE_OPTIONS[0];

  return (
    <div className="h-full flex flex-col bg-temple-50 overflow-hidden relative">
      {/* Floating Pushpam / Diya Animation Overlay */}
      {offeringAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce text-6xl drop-shadow-2xl filter transform scale-150 transition-all">
            {offeringAnimation === 'flower' ? '🌺 🌸 🌼' : '🪔 ✨ 🔥'}
          </div>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="bg-white border-b border-temple-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-temple-900 flex items-center gap-2">
              <Sun className="w-5 h-5 text-saffron-500 fill-saffron-400" />
              {safeTranslate('social_feed', 'Sanatani Social Feed', 'সনাতনী সোশ্যাল ফিড', 'सनातनी सोशल फीड')}
            </h2>
            <p className="text-xs text-temple-500 font-medium">
              {activeWorkspace?.name || 'Sanatani Mandir'} • Live Darshan, Seva & Community
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{safeTranslate('create_post', 'Share Post', 'পোস্ট করুন', 'पोस्ट करें')}</span>
          </button>
        </div>

        {/* Global Online SOS Trigger */}
        <button 
          onClick={() => setShowSOSModal(true)}
          className="mt-4 w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 transition-transform active:scale-95 border border-red-500"
        >
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <div className="text-center sm:text-left">
            <h3 className="text-sm font-semibold tracking-widest uppercase">Emergency Panic SOS</h3>
            <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest">Broadcast Alert Globally • Send Location to Rescuers</p>
          </div>
        </button>

        {/* Facebook-style Quick Share Box */}
        <div 
          onClick={() => setShowCreateModal(true)}
          className="mt-3 p-3 bg-temple-50 hover:bg-temple-50/80 rounded-xl border border-temple-200 cursor-pointer flex items-center gap-3 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-saffron-500 text-white font-semibold flex items-center justify-center text-sm shadow-xs shrink-0">
            {(currentUser?.name || 'D').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-xs text-temple-500 font-medium">
            Share Darshan, Shloka reflection, Gau Seva, or Mandir update...
          </div>
          <div className="flex items-center gap-1 text-temple-400 shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-temple-600 hidden sm:inline">Photo</span>
          </div>
        </div>

        {/* Global / Cross-App Active Yatra Emergencies Banner */}
        {activeEmergencies.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeEmergencies.map((emergency, idx) => (
              <div key={`${emergency.id}-${idx}`} className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm animate-in fade-in zoom-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
                    <span className="text-xs font-semibold text-red-700 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> ACTIVE EMERGENCY
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                    <Radio className="w-3 h-3" /> MESH RELAY
                  </span>
                </div>
                
                <p className="text-sm font-bold text-red-900 border-l-2 border-red-400 pl-2 ml-1">{emergency.text}</p>
                
                {emergency.location && (
                  <div className="h-32 w-full rounded-xl overflow-hidden border border-red-200 z-0 relative isolate mt-1">
                    <MapContainer 
                      center={[emergency.location.lat, emergency.location.lng]} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Circle center={[emergency.location.lat, emergency.location.lng]} radius={emergency.location.accuracy} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, weight: 1 }} />
                      <Marker position={[emergency.location.lat, emergency.location.lng]} icon={emergencyIcon} />
                    </MapContainer>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1 text-[11px] text-red-800 bg-red-100/50 p-2 rounded-xl">
                  <span className="font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {emergency.senderName}
                  </span>
                  {emergency.location && (
                    <span className="font-bold flex items-center gap-1.5 text-blue-700">
                      <MapPin className="w-3.5 h-3.5" /> GPS Linked
                    </span>
                  )}
                  <span className="font-bold flex items-center gap-1.5 text-temple-600">
                    <Clock className="w-3.5 h-3.5" /> {new Date(emergency.originalTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {emergency.sosStatus === 'RESPONDED' && (
                  <div className="mt-1 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> 
                    <span>Help is on the way (Responded by: {emergency.responderName})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              selectedFilter === 'all'
                ? 'bg-temple-900 text-white shadow-xs'
                : 'bg-temple-50 text-temple-600 hover:bg-temple-200'
            }`}
          >
            {safeTranslate('filter_all', 'All Posts', 'সকল', 'सभी')}
          </button>

          {STANDARD_CATEGORIES.filter(c => c.key !== 'other').map((f, idx) => (
            <button
              key={`${f.key}-${idx}`}
              onClick={() => setSelectedFilter(f.key)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                selectedFilter === f.key
                  ? 'bg-saffron-600 text-white shadow-xs'
                  : 'bg-temple-50 text-temple-600 hover:bg-temple-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Dynamic User Custom Categories */}
          {dynamicCategories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                selectedFilter === cat
                  ? 'bg-saffron-600 text-white shadow-xs'
                  : 'bg-saffron-50 text-saffron-900 border border-saffron-200 hover:bg-saffron-100'
              }`}
            >
              ✨ {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Feed List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-w-xl mx-auto w-full custom-scrollbar pb-24">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-temple-200 shadow-xs">
            <Sparkles className="w-12 h-12 text-saffron-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-temple-900">No posts in this category yet</h3>
            <p className="text-xs text-temple-500 mt-1">Be the first devotee to share Darshan, reflections, or Seva updates.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-saffron-500 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Create First Post 🙏
            </button>
          </div>
        ) : (
          filteredPosts.map((post, idx) => {
            const audienceInfo = AUDIENCE_OPTIONS.find(a => a.key === post.audience) || AUDIENCE_OPTIONS[0];
            return (
              <div 
                key={`${post.id}-${idx}`} 
                className="bg-white rounded-xl border border-temple-200/90 shadow-xs overflow-hidden transition-all hover:border-saffron-300"
              >
                {/* Post Header */}
                <div className="p-4 pb-2 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-saffron-100 border border-saffron-200 flex items-center justify-center text-temple-800 font-semibold text-sm shadow-xs shrink-0">
                      {post.avatarLetter}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-temple-900 flex items-center gap-2">
                           {post.authorName}
                           <button 
                             onClick={(e) => { e.stopPropagation(); setActiveChatUser({ id: post.authorId || post.id + "_author", name: post.authorName || 'Author' }); }}
                             className="text-saffron-500 hover:text-saffron-600 transition-colors p-1 bg-saffron-50 hover:bg-saffron-100 rounded-md"
                             title="Direct Message"
                           >
                             <MessageSquare size={14} />
                           </button>
                        </span>
                        {post.isOfficial && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-saffron-100 text-saffron-800 border border-saffron-300">
                            <CheckCircle2 className="w-3 h-3 text-saffron-600" />
                            Official
                          </span>
                        )}
                        {post.feeling && (
                          <span className="text-xs font-medium text-temple-500">
                            is {post.feeling}
                          </span>
                        )}
                      </div>
                      
                      {/* Meta line with Audience badge and Location */}
                      <div className="flex items-center gap-2 text-[11px] text-temple-500 mt-0.5 flex-wrap">
                        <span className="font-semibold text-temple-700">{post.authorRole}</span>
                        <span>•</span>
                        <span>{post.createdAt}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 bg-temple-50 px-2 py-0.5 rounded-md font-bold text-temple-600 text-[10px]" title={audienceInfo.desc}>
                          <span>{audienceInfo.icon}</span>
                          <span>{audienceInfo.badge}</span>
                        </span>
                        {post.location && (
                          <span className="text-temple-500 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-saffron-600" />
                            {post.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Category Tag Badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-saffron-50 text-saffron-900 border border-saffron-200">
                      {post.customCategoryEmoji ? `${post.customCategoryEmoji} ` : ''}
                      {post.customCategoryName || post.category}
                    </span>
                    <button
                      onClick={() => handleShare(post)}
                      className="p-1.5 text-temple-400 hover:text-temple-600 rounded-lg hover:bg-temple-50 transition-colors"
                      title="Share post"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Post Title & Content */}
                <div className="px-4 py-2">
                  {post.title && (
                    <h3 className="text-base font-bold text-temple-900 mb-1.5 leading-snug">
                      {post.title}
                    </h3>
                  )}

                  {/* Optional Background Gradient for quotes/thoughts */}
                  {post.bgGradient ? (
                    <div className={`p-6 rounded-xl bg-gradient-to-br ${post.bgGradient} text-center font-bold text-base my-2 leading-relaxed shadow-sm`}>
                      {post.content}
                    </div>
                  ) : (
                    <p className="text-sm text-temple-700 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  )}

                  {/* Shloka Card if present */}
                  {post.shloka && (
                    <div className="mt-3 p-4 bg-white border border-temple-200 rounded-xl relative overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-md">
                          {post.shloka.source}
                        </span>
                        <button
                          onClick={() => playShlokaRecitation(post.shloka!.sanskrit)}
                          className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isSpeakingShloka 
                              ? 'bg-saffron-600 text-white' 
                              : 'bg-saffron-100 text-saffron-800 hover:bg-saffron-200'
                          }`}
                          title="Listen to Shloka recitation"
                        >
                          {isSpeakingShloka ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{isSpeakingShloka ? 'Stop' : 'Recite'}</span>
                        </button>
                      </div>
                      <div className="text-sm font-serif font-bold text-saffron-950 text-center my-2 whitespace-pre-line leading-relaxed tracking-wide">
                        {post.shloka.sanskrit}
                      </div>
                      <div className="text-xs text-temple-600 italic text-center mt-2 border-t border-saffron-200/50 pt-2">
                        "{post.shloka.translation}"
                      </div>
                    </div>
                  )}

                  {/* Event Tag / Notice highlight */}
                  {post.eventDate && (
                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-saffron-50 border border-saffron-200 rounded-xl text-xs font-bold text-saffron-800">
                      <Calendar className="w-4 h-4 text-saffron-600 shrink-0" />
                      <span>Schedule: {post.eventDate}</span>
                    </div>
                  )}

                  {/* Post Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.tags.map((tag, idx) => (
                        <span key={tag} className="text-[10px] font-semibold text-saffron-800 bg-saffron-50 px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Image */}
                {post.imageUrl && (
                  <div className="mt-2 relative bg-temple-50 max-h-96 overflow-hidden">
                    <img
                      src={post.imageUrl || undefined}
                      alt={post.title || 'Post image'}
                      className="w-full h-auto object-cover max-h-96"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Devotional Offerings & Reaction Counters */}
                <div className="px-4 py-2 border-t border-temple-100 flex items-center justify-between text-xs text-temple-500 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      🙏 <strong className="text-temple-700">{post.pranams}</strong> {safeTranslate('pranams', 'Pranams', 'প্রণাম', 'प्रणाम')}
                    </span>
                    <span className="flex items-center gap-1">
                      🌺 <strong className="text-temple-700">{post.flowersOffered}</strong> {safeTranslate('pushpam', 'Flowers', 'পুষ্প', 'पुष्प')}
                    </span>
                    <span className="flex items-center gap-1">
                      🪔 <strong className="text-temple-700">{post.diyasLit}</strong> {safeTranslate('deepam', 'Diyas', 'প্রদীপ', 'दीपक')}
                    </span>
                  </div>
                  <div>
                    <button 
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="hover:underline text-temple-600 font-semibold"
                    >
                      {post.comments.length} {safeTranslate('comments', 'Comments', 'মন্তব্য', 'टिप्पणियां')}
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Pranam, Flower, Diya, Comment */}
                <div className="px-3 py-2 border-t border-temple-100 bg-temple-50/50 grid grid-cols-4 gap-1">
                  {/* 1. Pranam Button */}
                  <button
                    onClick={() => handlePranam(post.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      post.hasPranamed
                        ? 'bg-saffron-100 text-saffron-800 border border-saffron-300'
                        : 'hover:bg-temple-50 text-temple-700'
                    }`}
                  >
                    <span className="text-base">🙏</span>
                    <span className="hidden xs:inline">{post.hasPranamed ? 'Pranamed' : 'Pranam'}</span>
                  </button>

                  {/* 2. Offer Flower Button */}
                  <button
                    onClick={() => handleOfferFlower(post.id)}
                    className="py-2 px-1 rounded-xl text-xs font-bold hover:bg-rose-50 text-rose-700 flex items-center justify-center gap-1.5 transition-all"
                    title="Offer Pushpam"
                  >
                    <span className="text-base">🌺</span>
                    <span className="hidden xs:inline">Pushpam</span>
                  </button>

                  {/* 3. Offer Diya Button */}
                  <button
                    onClick={() => handleOfferDiya(post.id)}
                    className="py-2 px-1 rounded-xl text-xs font-bold hover:bg-saffron-50 text-saffron-700 flex items-center justify-center gap-1.5 transition-all"
                    title="Light Diya"
                  >
                    <span className="text-base">🪔</span>
                    <span className="hidden xs:inline">Deepam</span>
                  </button>

                  {/* 4. Comments Toggle */}
                  <button
                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      activeCommentPostId === post.id
                        ? 'bg-temple-200 text-temple-900'
                        : 'hover:bg-temple-50 text-temple-700'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-temple-600" />
                    <span className="hidden xs:inline">Comment</span>
                  </button>
                </div>

                {/* Comments Section Drawer */}
                {activeCommentPostId === post.id && (
                  <div className="p-4 border-t border-temple-200 bg-temple-50 space-y-3">
                    {/* List comments */}
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {post.comments.length === 0 ? (
                        <p className="text-xs text-temple-400 italic text-center py-2">
                          No comments yet. Write the first devotional reflection!
                        </p>
                      ) : (
                        post.comments.map((c, idx) => (
                          <div key={`${c.id}-${idx}`} className="bg-white p-2.5 rounded-xl border border-temple-200/80 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-temple-900">{c.authorName}</span>
                              <span className="text-[10px] text-temple-400">{c.timestamp}</span>
                            </div>
                            <p className="text-temple-700">{c.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comment box */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={commentInput[post.id] || ''}
                        onChange={(e) => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Write your reflection or Jai Shri Ram..."
                        className="flex-1 px-3 py-2 bg-white border border-temple-200 rounded-xl text-xs text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="p-2 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE POST MODAL - FACEBOOK STYLE FULL SYSTEM */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-temple-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-temple-200 flex items-center justify-between bg-temple-50">
              <div className="w-6"></div>
              <h3 className="font-semibold text-temple-900 text-base text-center">
                {safeTranslate('create_post', 'Create Post', 'পোস্ট তৈরি করুন', 'पोस्ट बनाएं')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-temple-200/70 hover:bg-temple-300 flex items-center justify-center text-temple-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Author Profile & Audience Section (Facebook style) */}
            <div className="p-4 border-b border-temple-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-saffron-500 text-white font-semibold flex items-center justify-center text-base shadow-sm">
                {(currentUser?.name || 'D').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-temple-900 text-sm">{currentUser?.name || 'Devotee'}</h4>
                  {newPostFeeling && (
                    <span className="text-xs text-temple-500 font-medium">
                      is {newPostFeeling}
                    </span>
                  )}
                </div>

                {/* Facebook-style Audience Button & Category Pill */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Audience Selector Button */}
                  <button
                    type="button"
                    onClick={() => setShowAudienceModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-temple-50 hover:bg-temple-200 text-temple-700 text-xs font-bold transition-all border border-temple-200/80"
                  >
                    <span>{currentAudienceObj.icon}</span>
                    <span>{currentAudienceObj.label}</span>
                    <ChevronDown className="w-3 h-3 text-temple-500" />
                  </button>

                  {/* Category Dropdown */}
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-saffron-50 hover:bg-saffron-100 text-saffron-900 text-xs font-bold border border-saffron-200 focus:outline-none cursor-pointer"
                  >
                    {STANDARD_CATEGORIES.map((c, idx) => (
                      <option key={`${c.key}-${idx}`} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="p-4 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
              {/* "OTHER" CUSTOM CATEGORY INPUT */}
              {newPostCategory === 'other' && (
                <div className="p-3.5 bg-gradient-to-r from-saffron-50 to-saffron-50 rounded-xl border border-saffron-300 space-y-2 animate-in slide-in-from-top-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-saffron-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
                      Specify Your Custom Category
                    </label>
                    <span className="text-[10px] font-bold text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-full">New Category</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Emoji Selector */}
                    <div className="relative">
                      <select
                        value={customCategoryEmoji}
                        onChange={(e) => setCustomCategoryEmoji(e.target.value)}
                        className="w-11 h-10 bg-white border border-saffron-300 rounded-xl text-lg text-center cursor-pointer shadow-xs focus:ring-2 focus:ring-saffron-500"
                        title="Pick icon emoji"
                      >
                        {CUSTOM_EMOJIS.map((em, idx) => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      required
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="e.g. Youth Sangha, Sanskrit Chanting, Vedic Camp, Renovation..."
                      className="flex-1 px-3 py-2 bg-white border border-saffron-300 rounded-xl text-xs font-bold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Title Input (Optional) */}
              <div>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Post title or headline (Optional)..."
                  className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl text-xs font-bold text-temple-900 focus:bg-white focus:ring-2 focus:ring-saffron-500"
                />
              </div>

              {/* Main Content Area */}
              <div>
                <textarea
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={`What's on your mind, ${currentUser?.name || 'Devotee'}? Share reflections, Darshan, or questions...`}
                  className={`w-full p-3.5 bg-temple-50 border border-temple-200 rounded-xl text-sm text-temple-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron-500 ${
                    newPostBgGradient ? `bg-gradient-to-br ${newPostBgGradient} font-bold text-center` : ''
                  }`}
                />
              </div>

              {/* Facebook-style Color Themes for Quotes */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[11px] font-bold text-temple-500 flex items-center gap-1 shrink-0">
                  <Palette className="w-3.5 h-3.5" /> Background:
                </span>
                {BG_GRADIENTS.map((bg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewPostBgGradient(bg.value)}
                    className={`h-6 px-2 rounded-lg text-[10px] font-bold shrink-0 border transition-all ${
                      newPostBgGradient === bg.value
                        ? 'ring-2 ring-saffron-500 scale-105 border-saffron-500'
                        : 'border-temple-200'
                    } ${bg.value ? `bg-gradient-to-r ${bg.value}` : 'bg-temple-50 text-temple-700'}`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>

              {/* Add to Your Post Controls Box (Facebook-style Toolbar) */}
              <div className="p-3 bg-temple-50 rounded-xl border border-temple-200 space-y-2.5">
                <div className="text-xs font-bold text-temple-700">Add to your post</div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Feeling button */}
                  <button
                    type="button"
                    onClick={() => setShowFeelingsModal(true)}
                    className="flex items-center gap-1.5 p-2 bg-white hover:bg-temple-50 rounded-xl border border-temple-200 text-xs font-bold text-temple-700 transition-colors"
                  >
                    <Smile className="w-4 h-4 text-saffron-500" />
                    <span className="truncate">{newPostFeeling || 'Feeling / Activity'}</span>
                  </button>

                  {/* Location button */}
                  <button
                    type="button"
                    onClick={() => {
                      const loc = prompt('Enter Mandir / Location (e.g. Kashi Vishwanath Mandir):', newPostLocation);
                      if (loc !== null) setNewPostLocation(loc);
                    }}
                    className="flex items-center gap-1.5 p-2 bg-white hover:bg-temple-50 rounded-xl border border-temple-200 text-xs font-bold text-temple-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="truncate">{newPostLocation || 'Check in'}</span>
                  </button>

                  {/* Tags button */}
                  <button
                    type="button"
                    onClick={() => {
                      const tag = prompt('Enter hashtags (comma separated):', newPostTag);
                      if (tag !== null) setNewPostTag(tag);
                    }}
                    className="flex items-center gap-1.5 p-2 bg-white hover:bg-temple-50 rounded-xl border border-temple-200 text-xs font-bold text-temple-700 transition-colors"
                  >
                    <Tag className="w-4 h-4 text-blue-500" />
                    <span className="truncate">{newPostTag || 'Hashtags'}</span>
                  </button>
                </div>

                {/* Photo / Image Attachment */}
                <div className="pt-2 border-t border-temple-200/60">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      type="url"
                      value={newPostImageUrl}
                      onChange={(e) => setNewPostImageUrl(e.target.value)}
                      placeholder="Paste Image URL (https://...)"
                      className="flex-1 px-3 py-1.5 bg-white border border-temple-200 rounded-xl text-xs text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                    {newPostImageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewPostImageUrl('')}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {newPostImageUrl && (
                    <div className="mt-2 relative rounded-xl overflow-hidden max-h-40 border border-temple-200">
                      <img src={newPostImageUrl || undefined} alt="Preview" className="w-full h-40 object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Post Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-98"
                >
                  Publish Post 🙏
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIENCE SELECTOR DIALOG (FACEBOOK-STYLE MODAL) */}
      {showAudienceModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-temple-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-temple-200 flex items-center justify-between bg-temple-50">
              <h4 className="font-semibold text-temple-900 text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-saffron-600" />
                Select Audience
              </h4>
              <button
                onClick={() => setShowAudienceModal(false)}
                className="w-7 h-7 rounded-full bg-temple-200 hover:bg-temple-300 flex items-center justify-center text-temple-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <p className="text-xs text-temple-500 mb-3">
                Who can see your post on Sanatani Social Feed?
              </p>

              {AUDIENCE_OPTIONS.map((opt, idx) => {
                const isSelected = newPostAudience === opt.key;
                return (
                  <div
                    key={`${opt.key}-${idx}`}
                    onClick={() => {
                      setNewPostAudience(opt.key);
                      setShowAudienceModal(false);
                    }}
                    className={`p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-saffron-50/80 border-saffron-500 shadow-xs'
                        : 'bg-white border-temple-200 hover:bg-temple-50'
                    }`}
                  >
                    <div className="text-2xl pt-0.5">{opt.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-sm text-temple-900">{opt.label}</h5>
                        {isSelected && <Check className="w-4 h-4 text-saffron-600 font-semibold" />}
                      </div>
                      <p className="text-xs text-temple-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FEELINGS / ACTIVITIES SELECTOR MODAL */}
      {showFeelingsModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-temple-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-temple-200 flex items-center justify-between bg-temple-50">
              <h4 className="font-semibold text-temple-900 text-base flex items-center gap-2">
                <Smile className="w-5 h-5 text-saffron-600" />
                How are you feeling?
              </h4>
              <button
                onClick={() => setShowFeelingsModal(false)}
                className="w-7 h-7 rounded-full bg-temple-200 hover:bg-temple-300 flex items-center justify-center text-temple-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => {
                  setNewPostFeeling('');
                  setShowFeelingsModal(false);
                }}
                className="p-2.5 text-left text-xs font-bold text-temple-500 hover:bg-temple-50 rounded-xl"
              >
                Clear feeling
              </button>
              {FEELING_OPTIONS.map((f, idx) => (
                <button
                  key={f}
                  onClick={() => {
                    setNewPostFeeling(f);
                    setShowFeelingsModal(false);
                  }}
                  className={`p-3 text-left rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    newPostFeeling === f ? 'bg-saffron-100 text-saffron-900' : 'bg-temple-50 hover:bg-temple-50 text-temple-800'
                  }`}
                >
                  <span>{f}</span>
                  {newPostFeeling === f && <Check className="w-4 h-4 text-saffron-700" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ONLINE SOS MODAL */}
      {showSOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-red-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                INITIATE GLOBAL SOS
              </h3>
              <button onClick={() => setShowSOSModal(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-temple-500 uppercase tracking-widest">Type of Emergency</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setSosSituation('ACCIDENT_MEDICAL')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-colors ${sosSituation === 'ACCIDENT_MEDICAL' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-temple-200 text-temple-600'}`}
                  >
                    <Activity className="w-5 h-5" /> Accident / Medical
                  </button>
                  <button 
                    onClick={() => setSosSituation('ROBBERY_ATTACK')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-colors ${sosSituation === 'ROBBERY_ATTACK' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-temple-200 text-temple-600'}`}
                  >
                    <ShieldAlert className="w-5 h-5" /> Robbery / Attack
                  </button>
                  <button 
                    onClick={() => setSosSituation('FIRE_DISASTER')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-colors ${sosSituation === 'FIRE_DISASTER' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-temple-200 text-temple-600'}`}
                  >
                    <Flame className="w-5 h-5" /> Fire / Disaster
                  </button>
                  <button 
                    onClick={() => setSosSituation('OTHER_CRITICAL')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-colors ${sosSituation === 'OTHER_CRITICAL' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-temple-200 text-temple-600'}`}
                  >
                    <AlertTriangle className="w-5 h-5" /> Other Critical
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-temple-500 uppercase tracking-widest">Emergency Details</label>
                <textarea 
                  value={sosDetails}
                  onChange={e => setSosDetails(e.target.value)}
                  placeholder="Describe the situation urgently... (e.g. Trapped in car, need ambulance at Highway 4)"
                  className="w-full p-4 rounded-xl border border-temple-200 bg-temple-50 text-sm font-medium min-h-[100px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                />
              </div>

              <div className="bg-temple-50 p-4 rounded-xl text-xs font-bold text-temple-600 flex flex-col gap-2">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> Auto-attaching Live GPS Location</span>
                <span className="flex items-center gap-2"><Battery className="w-4 h-4 text-emerald-600" /> Auto-attaching Device Battery %</span>
                <div className="mt-2 pt-2 border-t border-temple-200">
                  <span className="flex items-center gap-2 text-indigo-700">
                    <Radio className="w-4 h-4" /> 
                    <span>
                      <strong>DUAL-BAND BROADCAST ACTIVE:</strong><br />
                      • Sending to Global Cloud (via Internet)<br />
                      • Sending to Local Mesh (via Bluetooth / Wi-Fi Direct)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-temple-200 bg-temple-50">
              <button 
                onClick={handleOnlineSOS}
                disabled={!sosDetails.trim()}
                className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold uppercase tracking-widest shadow-xl shadow-red-600/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                <Radio className="w-5 h-5 animate-pulse" /> BROADCAST DUAL-BAND SOS
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CHAT OVERLAY */}
      {activeChatUser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-temple-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl h-full max-h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <DirectMessageChat 
              recipientId={activeChatUser.id}
              recipientName={activeChatUser.name}
              recipientPhone="919876543210"
              contextType="SOCIAL"
              onClose={() => setActiveChatUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SanataniSocialFeed;
