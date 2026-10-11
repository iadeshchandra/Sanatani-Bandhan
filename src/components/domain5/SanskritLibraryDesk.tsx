import React, { useState } from 'react';
import { BookOpen, Search, Download, Sparkles, BookMarked, Layers, ExternalLink } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';

interface ShastraBook {
  id: string;
  title: string;
  sanskritTitle: string;
  category: 'Vedas' | 'Upanishads' | 'Gita' | 'Puranas' | 'Dharmashastras' | 'Stotrams';
  authorOrRishi: string;
  totalChapters: number;
  description: string;
  language: string;
  downloadUrl?: string;
}

export const SanskritLibraryDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const shastras: ShastraBook[] = [
    {
      id: 'shastra-1',
      title: 'Srimad Bhagavad Gita',
      sanskritTitle: 'श्रीमद्भगवद्गीता',
      category: 'Gita',
      authorOrRishi: 'Bhagavan Veda Vyasa (Mahabharata Bhishma Parva)',
      totalChapters: 18,
      description: 'The supreme dialogue between Sri Krishna and Arjuna imparting Jnana, Karma, and Bhakti Yoga.',
      language: 'Sanskrit with Devanagari & Transliteration',
    },
    {
      id: 'shastra-2',
      title: 'Rigveda Samhita',
      sanskritTitle: 'ऋग्वेदसंहिता',
      category: 'Vedas',
      authorOrRishi: 'Saptarshis',
      totalChapters: 10,
      description: 'The oldest sacred scripture of humanity containing 1,028 hymns dedicated to Cosmic Devatas.',
      language: 'Vedic Sanskrit',
    },
    {
      id: 'shastra-3',
      title: 'Mandukya Upanishad',
      sanskritTitle: 'माण्डूक्योपनिषत्',
      category: 'Upanishads',
      authorOrRishi: 'Atharvaveda Parishad',
      totalChapters: 1,
      description: 'Exposition on the sacred syllable OM (A-U-M) and the four states of consciousness (Turiya).',
      language: 'Sanskrit',
    },
    {
      id: 'shastra-4',
      title: 'Sri Rudram & Chamakam',
      sanskritTitle: 'श्रीरुद्रम् चमकम्',
      category: 'Stotrams',
      authorOrRishi: 'Krishna Yajurveda Taittiriya Samhita',
      totalChapters: 11,
      description: 'The supreme hymn of homage to Bhagavan Shiva invoking cosmic peace and material/spiritual prosperity.',
      language: 'Vedic Sanskrit',
    },
    {
      id: 'shastra-5',
      title: 'Sri Vishnu Sahasranama Stotram',
      sanskritTitle: 'श्रीविष्णुसहस्रनामस्तोत्रम्',
      category: 'Stotrams',
      authorOrRishi: 'Bhishma Pitamaha (Mahabharata Anushasana Parva)',
      totalChapters: 1,
      description: 'The 1,000 transcendental holy names of Bhagavan Maha Vishnu chanted for universal victory.',
      language: 'Sanskrit',
    },
  ];

  const filteredShastras = shastras.filter((s) => {
    const matchSearch =
      s.title?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      s.sanskritTitle.includes(searchTerm) ||
      s.category?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      s.authorOrRishi?.toLowerCase().includes(searchTerm?.toLowerCase());

    const matchCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleRead = (s: ShastraBook) => {
    showToast(`Opening digital manuscript for ${s.title} (${s.sanskritTitle})`, 'info', 'Vedic Granthalaya');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Vedic Granthalaya & Digital Shastras
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Preserving Vedic Sanatana Dharma Manuscripts
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Sanskrit Library & Scripture Repository Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Original Devanagari manuscripts, translations, audio chanting stotrams, and authentic commentaries
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Vedas, Upanishads, Gita, Stotrams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-9 pr-3 py-2 text-xs text-temple-200 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-temple-400 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-temple-800 border border-temple-700 rounded-xl px-2.5 py-1.5 text-xs text-temple-200"
          >
            <option value="all">All Shastra Categories</option>
            <option value="Vedas">Vedas</option>
            <option value="Upanishads">Upanishads</option>
            <option value="Gita">Gita</option>
            <option value="Puranas">Puranas</option>
            <option value="Stotrams">Stotrams</option>
          </select>
        </div>
      </div>

      {/* Shastras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredShastras.map((s, idx) => (
          <div
            key={`${s.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 hover:border-saffron-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-saffron-400">
                    {s.category}
                  </span>
                  <h3 className="font-extrabold text-base text-temple-100 mt-1">{s.title}</h3>
                  <p className="text-xs font-serif text-saffron-300 font-medium">{s.sanskritTitle}</p>
                </div>
                <BookMarked className="w-5 h-5 text-saffron-400/80 shrink-0" />
              </div>

              <div className="py-2 space-y-2 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Rishi / Author:</span>{' '}
                  <span className="font-medium text-temple-100">{s.authorOrRishi}</span>
                </p>
                <p className="text-[11px] text-temple-300 leading-relaxed italic">
                  "{s.description}"
                </p>
                <p>
                  <span className="text-temple-400">Language:</span>{' '}
                  <span className="text-saffron-400">{s.language}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRead(s)}
              className="w-full py-2.5 rounded-xl bg-temple-800 hover:bg-saffron-600 hover:text-temple-950 text-temple-200 font-bold text-xs flex items-center justify-center gap-2 border border-temple-700 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Sacred Manuscript</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
