import type { TranslationSchema } from '../schema';

/**
 * bn — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "ড্যাশবোর্ড",
      treasury: "তহবিল (Treasury)",
      bhandar: "ভাণ্ডার (Inventory)",
      devotees: "ভক্ত তালিকা (Devotees)",
      puja: "পূজা ও সংকল্প",
      analytics: "বিশ্ব বিশ্লেষণ",
      settings: "সেটিংস",
      yatra: "যাত্রা নেটওয়ার্ক",
      polls: "সম্প্রদায় ভোট",
      dharamshala: "ধর্মশালা",
    },
    common: {
      save: "সংরক্ষণ করুন",
      cancel: "বাতিল করুন",
      search: "অনুসন্ধান",
      export: "রপ্তানি",
      download: "ডাউনলোড",
      offline: "অফলাইন",
      online: "অনলাইন",
      syncing: "সিঙ্ক হচ্ছে",
      status: "অবস্থা",
    },
    auth: {
      accessPortal: "প্রবেশ দ্বার",
      identity: "ইমেল, ফোন বা ID",
      password: "পাসওয়ার্ড বা PIN দিন",
      forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
      portalSubtitle: "প্রশাসক, সদস্য ও পুরোহিতদের জন্য নিরাপদ লগইন",
    },
    qr: {
      expired: "এই QR কোডের মেয়াদ শেষ। নতুন একটি তৈরি করুন।",
      success: "QR কোড সফলভাবে যাচাই হয়েছে।",
      notLoggedIn: "QR লগইনের জন্য আগে সাইন ইন করুন।",
      offline: "যাচাই করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
    },
    reg: {
      desc: "আপনার প্রতিষ্ঠানের সংক্ষিপ্ত বিবরণ",
      step1: "ধাপ ১ — প্রতিষ্ঠানের বিবরণ",
      step2: "ধাপ ২ — আপনার বিবরণ",
      orgName: "প্রতিষ্ঠানের নাম",
      orgType: "প্রতিষ্ঠানের ধরন",
      yourName: "আপনার পুরো নাম",
      yourPhone: "আপনার ফোন নম্বর",
      officialEmail: "অফিসিয়াল ইমেল",
      warningTitle: "এগিয়ে যাওয়ার আগে",
      warningDesc1: "আপনি একটি ",
      warningDesc2: " ওয়ার্কস্পেস তৈরি করছেন। ডেমো ডেটা শুধু পরিচিতির জন্য।",
    },
    actions: {
      cancel: "বাতিল করুন",
      createDynamic: "{X} ওয়ার্কস্পেস তৈরি করুন",
      deleteRecord: "মুছুন",
    },
  };

export default dict;
