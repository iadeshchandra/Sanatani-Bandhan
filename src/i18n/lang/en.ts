import type { TranslationSchema } from '../schema';

/**
 * en — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "Dashboard",
      treasury: "Treasury",
      bhandar: "Smart Bhandar",
      devotees: "Devotee CRM",
      puja: "Pooja & Rituals",
      analytics: "Global Analytics",
      settings: "Settings",
      yatra: "YatraNet GIS",
      polls: "Community Polls",
      dharamshala: "Dharamshala",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      search: "Search",
      export: "Export",
      download: "Download",
      offline: "Offline",
      online: "Online",
      syncing: "Syncing",
      status: "Status",
    },
    auth: {
      accessPortal: "Access Portal",
      identity: "Email, Phone, or ID",
      password: "Enter Password or PIN",
      forgotPassword: "Forgot Password?",
      portalSubtitle: "Secure login for Admins, Members, and Purohits",
    },
    qr: {
      expired: "This QR code has expired. Please generate a new one.",
      success: "QR code verified successfully.",
      notLoggedIn: "Please sign in to continue with QR login.",
      offline: "Could not verify. Check your connection and try again.",
    },
    reg: {
      desc: "Brief description of your organisation",
      step1: "Step 1 — Organisation Details",
      step2: "Step 2 — Your Details",
      orgName: "Organisation Name",
      orgType: "Organisation Type",
      yourName: "Your Full Name",
      yourPhone: "Your Phone Number",
      officialEmail: "Official Email",
      warningTitle: "Before you continue",
      warningDesc1: "You are creating a ",
      warningDesc2: " workspace. Demo data is for exploration only.",
    },
    actions: {
      cancel: "Cancel",
      createDynamic: "Create {X} Workspace",
      deleteRecord: "DELETE",
    },
  };

export default dict;
