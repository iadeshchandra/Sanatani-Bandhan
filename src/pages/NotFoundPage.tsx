import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';

/**
 * NotFoundPage — friendly 404 for unknown routes.
 * Design language matches the app: the light sanctum ground (Design
 * Elevation E4 closed DE-02 for this page — the dark universe retires).
 * World-Readiness B4 (G-L8): the page used to be hard-coded English with
 * no way out of it — its strings now come from the dictionary
 * (surfaces.notFound, all 10 languages) and the canonical language door
 * stands in the corner like on every other public surface.
 */
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FFF8EC] px-6 text-temple-950">
      <div className="absolute top-4 right-4">
        <PublicLanguageButton tone="light" />
      </div>
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 border border-brass-200 flex items-center justify-center mb-6">
          <SearchX className="w-10 h-10 text-amber-700" />
        </div>
        <p className="font-display text-7xl font-black text-amber-700/15 select-none mb-2">404</p>
        <h1 className="font-display text-2xl font-black text-temple-950 mb-3">
          {t('surfaces.notFound.title')}
        </h1>
        <p className="text-sm text-temple-600 leading-relaxed mb-8">
          {t('surfaces.notFound.body')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl bg-cta text-white font-black text-sm hover:bg-cta-hover transition-all"
          >
            <Home className="w-4 h-4" />
            {t('surfaces.notFound.home')}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-xl border border-brass-300 text-temple-700 font-bold text-sm hover:bg-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('surfaces.notFound.back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
