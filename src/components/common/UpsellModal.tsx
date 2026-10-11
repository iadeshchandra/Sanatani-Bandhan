import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ShieldCheck, Star, ArrowRight, Zap, CheckCircle2, Building2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUBSCRIPTION_PLANS } from '../../config/planPricing';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  module: string;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, onUpgrade, module }) => {
  const { safeTranslate } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const plans = [SUBSCRIPTION_PLANS.SEVA, SUBSCRIPTION_PLANS.MANDIR, SUBSCRIPTION_PLANS.SMART_PRO];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-temple-900 to-temple-800 p-8 text-center border-b border-temple-700 shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-gradient-to-br from-saffron-400 to-saffron-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-saffron-500/20 border border-white/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {module && (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-saffron-500/20 border border-saffron-500/30 text-saffron-300 text-sm font-semibold mb-4 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4" />
              Unlock {module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          )}
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {safeTranslate('upsell_title', 'Namaskar! 🙏 Discover the Full Power of Sanatani Bandhan', 'নমস্কার! 🙏 আপনি সনাতনী বন্ধনের শক্তি আবিষ্কার করেছেন', 'नमस्कार! 🙏 आपने सनातनी बंधन की शक्ति की खोज की है')}
          </h2>
          <p className="text-temple-300 mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {safeTranslate(
              'upsell_desc', 
              'You are currently exploring a public demo workspace. Upgrade to a secure, private workspace to unlock unlimited records, modules, and cryptographic reporting.',
              'আপনি বর্তমানে একটি ডেমো ওয়ার্কস্পেস দেখছেন। আপনার নিজস্ব প্রাইভেট ওয়ার্কস্পেস তৈরি করুন।',
              'आप वर्तमान में एक सार्वजनिक डेमो कार्यक्षेत्र की खोज कर रहे हैं। अपना खुद का निजी कार्यक्षेत्र स्थापित करें।'
            )}
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center bg-white/10 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                billingCycle === 'monthly' ? 'bg-white text-temple-900 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                billingCycle === 'annual' ? 'bg-white text-temple-900 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              Annually
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${billingCycle === 'annual' ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20 text-white'}`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Body Matrix */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-slate-50">
          <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isRecommended = plan.id === 'SMART_PRO';
              const isPopular = plan.id === 'MANDIR';
              const price = plan.price[billingCycle];

              return (
                <div 
                  key={plan.id} 
                  className={`rounded-3xl p-6 border relative overflow-hidden transition-all duration-300 ${
                    isRecommended 
                      ? 'bg-temple-900 border-temple-700 shadow-2xl transform lg:-translate-y-2' 
                      : 'bg-white border-slate-200 shadow-xl'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute top-0 right-0 text-[10px] font-black px-4 py-1.5 rounded-bl-xl tracking-wider ${
                      isRecommended ? 'bg-gradient-to-r from-saffron-400 to-saffron-500 text-white shadow-lg' : 
                      isPopular ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <h3 className={`text-xl font-black flex items-center gap-2 ${isRecommended ? 'text-white' : 'text-slate-800'}`}>
                    {isRecommended ? <Star className="w-5 h-5 text-saffron-400 fill-saffron-400" /> : 
                     isPopular ? <Building2 className="w-5 h-5 text-indigo-500" /> :
                     <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                    {plan.name}
                  </h3>
                  
                  <p className={`mt-2 text-sm min-h-[40px] leading-relaxed ${isRecommended ? 'text-temple-300' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>

                  <div className="mt-6 mb-6">
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-black tracking-tight ${isRecommended ? 'text-white' : 'text-slate-900'}`}>
                        {price === 0 ? 'Free' : `${plan.price.currencySymbol}${price.toLocaleString('en-IN')}`}
                      </span>
                      {price !== 0 && (
                        <span className={`text-sm font-bold mb-1 ${isRecommended ? 'text-temple-400' : 'text-slate-400'}`}>
                          / {billingCycle === 'annual' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </div>
                    {price !== 0 && billingCycle === 'annual' && (
                      <p className={`text-xs mt-2 font-bold ${isRecommended ? 'text-saffron-400' : 'text-emerald-600'}`}>
                        Billed annually ({plan.price.currencySymbol}{(price / 12).toLocaleString('en-IN', {maximumFractionDigits: 0})}/mo)
                      </p>
                    )}
                    {price === 0 && (
                      <p className="text-xs mt-2 font-bold text-slate-400">No credit card required</p>
                    )}
                  </div>

                  <div className={`h-px w-full mb-6 ${isRecommended ? 'bg-white/10' : 'bg-slate-100'}`} />

                  <ul className="space-y-4">
                    {plan.highlightedFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isRecommended ? 'text-saffron-400' : 'text-emerald-500'}`} />
                        <span className={`text-sm font-semibold leading-tight ${isRecommended ? 'text-slate-100' : 'text-slate-700'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={onUpgrade}
                    className={`w-full mt-8 py-3.5 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      isRecommended 
                        ? 'bg-gradient-to-r from-saffron-400 to-saffron-500 hover:from-saffron-500 hover:to-saffron-600 text-white shadow-lg shadow-saffron-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {price === 0 ? 'Get Started' : 'Upgrade Workspace'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col items-center justify-center text-center">
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
          >
            Not ready? Continue Exploring Demo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
