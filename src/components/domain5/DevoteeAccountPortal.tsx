import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserCircle, QrCode, Shield, Sparkles, Flame, Heart, 
  Download, Printer, Share2, Copy, Check, ExternalLink,
  Phone, Mail, MapPin, Calendar, Clock, AlertCircle, 
  Building2, ArrowRight, ArrowLeftRight, Lock, Unlock,
  Sliders, Globe, Moon, Sun, Bell, BellOff, Volume2,
  RefreshCw, CheckCircle2, ChevronRight, Edit3, X,
  Radio, Compass, ShieldAlert, Award, FileText, Plus,
  BookmarkCheck, Eye, EyeOff, Info, Map as MapIcon,
  ChevronDown, Search, Activity
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { generateSecureQRToken } from '../../utils/qrUtils';
import { OfflineSyncManager } from '../../services/OfflineSyncManager';
import { 
  generateDevoteeCardPDF, 
  generate80GTaxReceipt, 
  generatePoojaSankalpPDF, 
  generateAnnualDonationSummaryPDF 
} from '../../utils/pdfGenerator';
import { DevoteeMember, PoojaBooking, PitruRecord, TreasuryTransaction, UserRole } from '../../types';

// Tab identifiers
export type DevoteePortalTab = 'PASS' | 'SADHANA' | 'SEVA_RECEIPTS' | 'FAMILY_PITRU' | 'PILGRIMAGE';

interface DevoteeAccountPortalProps {
  initialTab?: DevoteePortalTab;
  onNavigateDesk?: (deskId: string) => void;
}

// Leaflet Shrine Map Marker
const createShrineMarkerIcon = (color = '#d97706', symbol = '🕉️') => {
  return L.divIcon({
    className: 'custom-shrine-marker',
    html: `<div style="background: radial-gradient(circle, #f59e0b 0%, ${color} 100%); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2.5px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); font-size: 15px; font-weight: bold; animation: pulse 2s infinite;">${symbol}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

function MapViewRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 12, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

export const DevoteeAccountPortal: React.FC<DevoteeAccountPortalProps> = ({
  initialTab = 'PASS',
  onNavigateDesk,
}) => {
  const { 
    currentUser, 
    currentRole, 
    activeWorkspace, 
    currentDevotee, 
    viewMode, 
    setViewMode, 
    switchRole 
  } = useAuthWorkspace();
  const { language, setLanguage, safeTranslate, t } = useLanguage();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const { 
    devotees, 
    poojaBookings, 
    treasury, 
    families, 
    pitruRecords, 
    updateDevotee 
  } = useData();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<DevoteePortalTab>(initialTab);

  // Administrative Clearance Check
  const isAdminOrSevadar = useMemo(() => {
    const role = (currentRole || '').toUpperCase();
    return (
      role.includes('ADMIN') || 
      role.includes('TRUSTEE') || 
      role.includes('SEVADAR') || 
      role.includes('VOLUNTEER') || 
      role.includes('PRIEST') || 
      role.includes('PUROHIT') || 
      role.includes('ACCOUNTANT') || 
      role.includes('MANAGER')
    );
  }, [currentRole]);

  // Devotee Record Synthesis
  const effectiveDevotee: DevoteeMember = useMemo(() => {
    if (currentDevotee) return currentDevotee;
    const match = devotees.find(
      d => d.id === currentUser?.id || d.userId === currentUser?.id || (currentUser?.phone && d.phone === currentUser.phone)
    );
    if (match) return match;

    const wsId = activeWorkspace?.id || 'mandir-main';
    return {
      id: currentUser?.id || 'dev-self',
      workspaceId: wsId,
      fullName: currentUser?.name || 'Sanatani Devotee',
      spiritualName: 'Sadhak Sevak',
      phone: currentUser?.phone || '+91 98765 43210',
      email: currentUser?.email || 'devotee@sanatan.org',
      pin: '1008',
      role: 'Devotee',
      sevaIndex: 108,
      sevaTier: 'Vishesh',
      gotra: activeWorkspace?.gotra || 'Kashyapa',
      pravara: 'Trayarisheya (Kashyapa, Avatsara, Naidhruva)',
      nakshatra: 'Rohini',
      kuladevata: activeWorkspace?.kuladevata || 'Sri Shiva Parvati',
      address: activeWorkspace?.address || 'Kashi Kshetra, Varanasi',
      bloodGroup: 'B+ Positive',
      emergencyContact: 'Family Elder (+91 98765 00000)',
      emergencyPhone: '+91 98765 00000',
      activeStatus: 'Active',
      totalDonated: 11000,
      volunteerHours: 36,
      qrCodeRef: `QR-SB-${wsId.toUpperCase().slice(0, 4)}-108`,
      joinedDate: 'Chaitra Shukla Pratipada, 2081',
      createdAt: Date.now() - 90 * 86400000,
      updatedAt: Date.now(),
    };
  }, [currentDevotee, devotees, currentUser, activeWorkspace]);

  // Local storage profile edits key
  const profileKey = `sb_profile_override_${effectiveDevotee.id}`;
  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem(profileKey);
      if (saved) return { ...effectiveDevotee, ...JSON.parse(saved) };
    } catch (e) {}
    return effectiveDevotee;
  });

  // Dynamic QR Token & Countdown
  const [tokenRefreshCounter, setTokenRefreshCounter] = useState(60);
  const [dynamicQRToken, setDynamicQRToken] = useState(() => generateSecureQRToken(profileData));
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Rotating Token interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTokenRefreshCounter((prev) => {
        if (prev <= 1) {
          setDynamicQRToken(generateSecureQRToken(profileData));
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [profileData]);

  // Manually refresh token
  const handleManualRefreshToken = () => {
    setDynamicQRToken(generateSecureQRToken(profileData));
    setTokenRefreshCounter(60);
    showToast('Secure Pass Token regenerated with cryptographic salt 🙏', 'success', 'Token Refreshed');
  };

  // Copy token
  const handleCopyToken = () => {
    navigator.clipboard.writeText(dynamicQRToken);
    setCopiedToken(true);
    showToast('Vault token copied to clipboard', 'info');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: profileData.fullName || '',
    spiritualName: profileData.spiritualName || '',
    gotra: profileData.gotra || 'Kashyapa',
    pravara: profileData.pravara || '',
    nakshatra: profileData.nakshatra || '',
    kuladevata: profileData.kuladevata || '',
    phone: profileData.phone || '',
    bloodGroup: profileData.bloodGroup || 'O+ Positive',
    emergencyPhone: profileData.emergencyPhone || '+91 98765 00000',
    emergencyContact: profileData.emergencyContact || 'Spouse',
    address: profileData.address || '',
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...profileData, ...editFormData };
    setProfileData(updated);
    try {
      localStorage.setItem(profileKey, JSON.stringify(updated));
    } catch (e) {}
    if (updateDevotee && effectiveDevotee.id) {
      updateDevotee(effectiveDevotee.id, editFormData);
    }
    setIsEditProfileOpen(false);
    showToast('Personal Devotee Profile updated successfully! 🙏', 'success');
  };

  // ==========================================
  // TAB 2: SADHANA & VRAT TRACKER STATE
  // ==========================================
  const sadhanaStorageKey = `sb_sadhana_tracker_${effectiveDevotee.id}`;
  const [sadhanaState, setSadhanaState] = useState(() => {
    const defaultState = {
      selectedMantraIndex: 0,
      japaCount: 108,
      completedMalas: 3,
      targetMalas: 16,
      meditationMinutes: 25,
      weeklyStreakDays: 9,
      dailySankalpa: 'Lord Shiva, may my speech be sacred, actions pure, and thoughts aligned with Dharma.',
      completedVrats: {
        ekadashi_nirjala: true,
        ekadashi_phalahar: false,
        pradosh_vrata: true,
        somwar_shiva: true,
        sandhya_vandanam: true,
      },
      lastUpdated: new Date().toDateString(),
    };
    try {
      const saved = localStorage.getItem(sadhanaStorageKey);
      if (saved) return { ...defaultState, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultState;
  });

  // Save sadhana state helper
  const updateSadhana = (updates: Partial<typeof sadhanaState>) => {
    setSadhanaState(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(sadhanaStorageKey, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const mantrasList = [
    { name: 'Maha Mrityunjaya Mantra', sanskrit: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥', countUnit: 108 },
    { name: 'Gayatri Mantra', sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्॥', countUnit: 108 },
    { name: 'Om Namah Shivaya', sanskrit: 'ॐ नमः शिवाय', countUnit: 108 },
    { name: 'Hare Krishna Maha Mantra', sanskrit: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥', countUnit: 108 },
    { name: 'Om Namo Bhagavate Vasudevaya', sanskrit: 'ॐ नमो भगवते वासुदेवाय', countUnit: 108 },
  ];

  // Bead counter increment
  const handleIncrementJapa = (amount = 1) => {
    const newCount = sadhanaState.japaCount + amount;
    const malas = Math.floor(newCount / 108);
    updateSadhana({ japaCount: newCount, completedMalas: malas });
  };

  const handleResetJapa = () => {
    if (confirm('Reset today’s chanting count?')) {
      updateSadhana({ japaCount: 0, completedMalas: 0 });
      showToast('Japa count reset for today', 'info');
    }
  };

  // Toggle Vrat Item
  const handleToggleVrat = (vratKey: keyof typeof sadhanaState.completedVrats) => {
    const updatedVrats = {
      ...sadhanaState.completedVrats,
      [vratKey]: !sadhanaState.completedVrats[vratKey],
    };
    updateSadhana({ completedVrats: updatedVrats });
    showToast('Vrat checklist updated 🙏', 'success');
  };

  // ==========================================
  // TAB 3: SEVA & TAX RECEIPTS
  // ==========================================
  // User's filtered pooja bookings
  const userPoojaBookings = useMemo(() => {
    return poojaBookings.filter(
      p => p.devoteeId === effectiveDevotee.id || 
           p.devoteeName?.toLowerCase().includes(effectiveDevotee.fullName?.toLowerCase() || '') ||
           p.phone === effectiveDevotee.phone
    );
  }, [poojaBookings, effectiveDevotee]);

  // User's filtered donations
  const userDonations = useMemo(() => {
    return treasury.filter(
      t => t.type === 'Income' && (
        t.devoteeId === effectiveDevotee.id ||
        t.devoteeName?.toLowerCase().includes(effectiveDevotee.fullName?.toLowerCase() || '') ||
        t.handledBy === effectiveDevotee.fullName
      )
    );
  }, [treasury, effectiveDevotee]);

  // Download PDF ID Card
  const handleDownloadIdCard = async () => {
    try {
      showToast('Generating official biometric ID Card PDF...', 'info');
      await generateDevoteeCardPDF(profileData, activeWorkspace || ({} as any), 'save');
      showToast('ID Card PDF downloaded successfully! 🙏', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to generate ID Card PDF', 'error');
    }
  };

  // Download 80G Tax Receipt
  const handleDownload80GReceipt = async (tx: TreasuryTransaction) => {
    try {
      showToast(`Generating Section 80G Tax Receipt for ₹${tx.amount.toLocaleString('en-IN')}...`, 'info');
      await generate80GTaxReceipt(tx, activeWorkspace, { download: true });
      showToast('80G Tax Exemption Certificate downloaded! 📜', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to generate 80G Certificate', 'error');
    }
  };

  // Download Sankalp Slip
  const handleDownloadSankalp = async (booking: PoojaBooking) => {
    try {
      showToast(`Generating Vedic Sankalpa Slip for ${booking.poojaName}...`, 'info');
      await generatePoojaSankalpPDF(booking, activeWorkspace || ({} as any));
      showToast('Sankalpa Slip downloaded! 🪔', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to generate Sankalpa slip', 'error');
    }
  };

  // Download Annual Summary
  const handleDownloadAnnualSummary = async () => {
    if (userDonations.length === 0) {
      showToast('No donation records found to compile annual summary', 'error');
      return;
    }
    try {
      showToast('Compiling Form 10BE Annual Donation Summary...', 'info');
      await generateAnnualDonationSummaryPDF(profileData, userDonations, activeWorkspace || ({} as any));
      showToast('Annual Tax Summary downloaded! 📄', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Error generating annual summary', 'error');
    }
  };

  // ==========================================
  // TAB 4: FAMILY & PITRU REGISTRY
  // ==========================================
  const userFamily = useMemo(() => {
    return families.find(
      f => f.kartaDevoteeId === effectiveDevotee.id ||
           f.memberIds?.includes(effectiveDevotee.id) ||
           f.familyName.toLowerCase().includes(effectiveDevotee.fullName?.split(' ')[0]?.toLowerCase() || '')
    ) || {
      id: 'fam-default',
      workspaceId: activeWorkspace?.id || 'ws-main',
      familyName: `${effectiveDevotee.fullName?.split(' ').slice(-1)[0] || 'Sanatani'} Parivar`,
      kartaDevoteeId: effectiveDevotee.id,
      gotra: profileData.gotra || 'Kashyapa',
      kuladevata: profileData.kuladevata || 'Sri Shiva Parvati',
      residenceAddress: profileData.address || 'Kashi Kshetra',
      contactPhone: profileData.phone || '+91 98765 43210',
      memberIds: [effectiveDevotee.id, 'mem-2', 'mem-3', 'mem-4'],
      totalFamilyDonations: 45000,
      createdAt: Date.now() - 180 * 86400000,
      updatedAt: Date.now(),
    };
  }, [families, effectiveDevotee, activeWorkspace, profileData]);

  // Family Members Demo List
  const householdMembers = [
    { name: profileData.fullName, relation: 'Karta (Head)', gotra: profileData.gotra, bloodGroup: profileData.bloodGroup, phone: profileData.phone, status: 'Active' },
    { name: 'Smt. Gayatri Devi', relation: 'Dharmapatni (Spouse)', gotra: profileData.gotra, bloodGroup: 'A+ Positive', phone: profileData.emergencyPhone, status: 'Active' },
    { name: 'Ch. Aditya Sharma', relation: 'Putra (Son)', gotra: profileData.gotra, bloodGroup: 'B+ Positive', phone: '+91 98765 11111', status: 'Student' },
    { name: 'Smt. Kausalya Sharma', relation: 'Matashri (Mother)', gotra: profileData.gotra, bloodGroup: 'O+ Positive', phone: '+91 98765 22222', status: 'Senior Devotee' },
  ];

  // User's Pitru Ancestor Records
  const userPitruRecords = useMemo(() => {
    const list = pitruRecords.filter(
      p => p.devoteeId === effectiveDevotee.id || 
           p.devoteeName?.toLowerCase().includes(effectiveDevotee.fullName?.toLowerCase() || '')
    );
    if (list.length > 0) return list;
    return [
      {
        id: 'pitru-1',
        workspaceId: activeWorkspace?.id || 'demo',
        devoteeId: effectiveDevotee.id,
        devoteeName: effectiveDevotee.fullName || 'Devotee',
        ancestorName: 'Late Pt. Harishchandra Sharma',
        relationship: 'Pitamaha (Grandfather)',
        tithiLunar: 'Ashwin Krishna Ashtami (Pitru Paksha)',
        paksha: 'Krishna' as const,
        deathGregorianDate: '2016-10-04',
        gotra: profileData.gotra || 'Kashyapa',
        annualShradhAlert: true,
        pindaDaanBooked: true,
        shradhLocation: 'Kashi Manikarnika & Gaya Kshetra',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'pitru-2',
        workspaceId: activeWorkspace?.id || 'demo',
        devoteeId: effectiveDevotee.id,
        devoteeName: effectiveDevotee.fullName || 'Devotee',
        ancestorName: 'Late Smt. Saraswati Devi',
        relationship: 'Pitamahi (Grandmother)',
        tithiLunar: 'Bhadrapada Shukla Dwadashi',
        paksha: 'Shukla' as const,
        deathGregorianDate: '2020-08-30',
        gotra: profileData.gotra || 'Kashyapa',
        annualShradhAlert: true,
        pindaDaanBooked: false,
        shradhLocation: 'Kashi Kshetra',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];
  }, [pitruRecords, effectiveDevotee, activeWorkspace, profileData]);

  // ==========================================
  // TAB 5: PILGRIMAGE FOOTPRINT (YATRANET)
  // ==========================================
  const pilgrimageFootprint = [
    {
      id: 'footprint-1',
      shrineName: 'Kashi Vishwanath Devasthanam',
      location: 'Varanasi, Uttar Pradesh',
      coords: [25.3109, 83.0104] as [number, number],
      darshanType: 'Mangala Aarti & Rudrabhishek',
      visitedDate: '2026-08-14',
      verifiedBy: 'YatraNet Gate Beacon #04',
      badge: 'Jyotirlinga Darshan',
    },
    {
      id: 'footprint-2',
      shrineName: 'Shri Ram Janmabhoomi Mandir',
      location: 'Ayodhya, Uttar Pradesh',
      coords: [26.7956, 82.1944] as [number, number],
      darshanType: 'Shringaar Aarti & Parikrama',
      visitedDate: '2026-05-22',
      verifiedBy: 'Ayodhya YatraNet Hub #01',
      badge: 'Ram Lalla Darshan',
    },
    {
      id: 'footprint-3',
      shrineName: 'Tirumala Venkateswara Swamy',
      location: 'Tirupati, Andhra Pradesh',
      coords: [13.6833, 79.3472] as [number, number],
      darshanType: 'Suprabhatam & Laddu Mahaprasad',
      visitedDate: '2026-01-19',
      verifiedBy: 'Tirumala YatraNet Beacon #12',
      badge: 'Divya Kshetra',
    },
    {
      id: 'footprint-4',
      shrineName: 'Shri Kedarnath Dham',
      location: 'Rudraprayag, Uttarakhand',
      coords: [30.7352, 79.0669] as [number, number],
      darshanType: 'Kedarnath Shivalinga Abhishek',
      visitedDate: '2025-10-10',
      verifiedBy: 'Garhwal Mesh Repeater #03',
      badge: 'Char Dham Kshetra',
    },
  ];

  const [activeShrineIndex, setActiveShrineIndex] = useState(0);

  // Quick GPS Check-In state
  const [isLocating, setIsLocating] = useState(false);
  const handleGeoCheckInNow = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        showToast(
          `Logged GPS Check-In at [${latitude.toFixed(4)}, ${longitude.toFixed(4)}] via YatraNet! 🚩`,
          'success',
          'Pilgrimage Verified'
        );
      },
      (err) => {
        setIsLocating(false);
        showToast(`GPS location failed: ${err.message}. Using Mandir coordinates.`, 'info');
      },
      { timeout: 8000 }
    );
  };

  // ==========================================
  // EMERGENCY SOS PANIC BUTTON & MODAL
  // ==========================================
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSituation, setSosSituation] = useState<'MEDICAL' | 'CROWD_SURGE' | 'LOST_CHILD' | 'FIRE_HAZARD'>('MEDICAL');
  const [sosDetails, setSosDetails] = useState('');
  const [isBroadcastingSos, setIsBroadcastingSos] = useState(false);

  const handleTriggerEmergencySOS = async () => {
    setIsBroadcastingSos(true);
    try {
      let coords = { latitude: 25.3109, longitude: 83.0104 };
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      const payload = {
        senderId: effectiveDevotee.id,
        senderName: profileData.fullName || 'Sanatani Devotee',
        senderPhone: profileData.phone || '',
        communityId: activeWorkspace?.id || 'ws-main',
        situation: sosSituation,
        details: sosDetails || `Devotee reported immediate ${sosSituation.replace('_', ' ')} emergency.`,
        location: `${activeWorkspace?.name || 'Temple Campus'} (Zone: Garbhagriha/Parikrama)`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        bloodGroup: profileData.bloodGroup,
        emergencyContact: profileData.emergencyPhone,
        text: `🚨 URGENT [${sosSituation.replace('_', ' ')}]: ${profileData.fullName} requested immediate sevadar assistance at ${activeWorkspace?.name}.`,
      };

      // Queue into OfflineSyncManager for P2P/Firestore broadcast
      OfflineSyncManager.addToQueue('RICH_SOS', payload);

      // Play emergency Web Audio siren
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch (e) {}

      addNotification({
        title: '🚨 Emergency SOS Dispatched',
        message: 'Your emergency distress telemetry has been broadcast to all on-duty temple sevadars & doctors.',
        type: 'error',
      });

      showToast('DISTRESS SOS TRANSMITTED TO TEMPLE COMMAND & SEVADARS', 'success', 'Code Red Dispatched');
      setShowSosModal(false);
      setSosDetails('');
    } catch (e: any) {
      console.error(e);
      showToast('Error dispatching SOS. Please shout or notify nearby sevadars immediately.', 'error');
    } finally {
      setIsBroadcastingSos(false);
    }
  };

  // ==========================================
  // QUICK SETTINGS & PREFERENCES STATE
  // ==========================================
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('sb_dark_mode') === 'true';
  });
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(() => {
    return localStorage.getItem('sb_sound_alerts') !== 'false';
  });

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('sb_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(`Switched to ${next ? 'Temple Night Mode 🌙' : 'Sacred Solar Light Mode ☀️'}`, 'info');
  };

  const toggleSoundAlerts = () => {
    const next = !soundAlertsEnabled;
    setSoundAlertsEnabled(next);
    localStorage.setItem('sb_sound_alerts', String(next));
    showToast(`Sound notifications ${next ? 'Enabled 🔔' : 'Muted 🔕'}`, 'info');
  };

  // Switch to Organization View Handler
  const handleSwitchToOrganisation = () => {
    if (!isAdminOrSevadar) {
      showToast('Access Restricted: Mandir Console requires Sevadar, Trustee, or Priest credentials.', 'error', 'Permission Denied');
      return;
    }
    setViewMode('MANAGER');
    showToast(`Switched to ${activeWorkspace?.name || 'Organisation'} Console 🙏`, 'success', 'Console Mode Activated');
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans pb-24 selection:bg-amber-500 selection:text-stone-950">
      
      {/* ========================================================
          1. DUAL-SPACE & RBAC SWITCHER HEADER
      ======================================================== */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-amber-900/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Devotee Space Identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-900/40 flex items-center justify-center">
                <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center font-bold text-amber-400 text-lg">
                  {profileData.fullName ? profileData.fullName.charAt(0) : '🕉️'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-stone-950 rounded-full" title="Personal Space Active" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-amber-100 leading-none">
                  {profileData.spiritualName || profileData.fullName}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {profileData.gotra} Gotra
                </span>
              </div>
              <p className="text-xs text-amber-400/80 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{activeWorkspace?.name || 'Sanatani Bandhan'}</span>
                <span>•</span>
                <span className="text-stone-400 font-mono text-[11px]">{profileData.sanataniId || 'SB-PASS-1008'}</span>
              </p>
            </div>
          </div>

          {/* Center: Dual-Space Switcher Toggle */}
          <div className="flex items-center bg-stone-900/90 p-1 rounded-2xl border border-stone-800 shadow-inner">
            <button
              type="button"
              className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 shadow-md flex items-center gap-1.5 cursor-default transition-all"
            >
              <UserCircle className="w-4 h-4 text-stone-950" />
              <span>Personal Space</span>
            </button>

            {isAdminOrSevadar ? (
              <button
                type="button"
                onClick={handleSwitchToOrganisation}
                className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 transition-all flex items-center gap-1.5 cursor-pointer group"
                title={`Switch to ${activeWorkspace?.name || 'Mandir'} Administrative Console`}
              >
                <Building2 className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline">Organisation View</span>
                <span className="xs:hidden">Org</span>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {currentRole || 'Staff'}
                </span>
              </button>
            ) : (
              <div 
                className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-stone-500 flex items-center gap-1.5 cursor-not-allowed opacity-60"
                title="Organisation Console is reserved for Temple Trustees and Sevadars"
              >
                <Lock className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Organisation View</span>
                <span className="sm:hidden">Org</span>
              </div>
            )}
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* 🚨 Emergency SOS Panic Button */}
            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-red-950/60 border border-red-400/40 flex items-center gap-1.5 animate-pulse cursor-pointer transition-all active:scale-95"
              title="Emergency SOS Panic: Broadcast live distress telemetry to nearby sevadars"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span className="tracking-wide">SOS PANIC</span>
            </button>

            {/* Quick Settings Icon */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
              title="Personal Preferences & Quick Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tab Navigation Ribbon */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 overflow-x-auto custom-scrollbar flex items-center gap-2 border-t border-stone-800/80 pt-2 pb-2">
          {[
            { id: 'PASS', label: '1. Digital Pass & ID', icon: QrCode, badge: 'Vault QR' },
            { id: 'SADHANA', label: '2. Sadhana & Vrats', icon: Flame, badge: 'Japa Mala' },
            { id: 'SEVA_RECEIPTS', label: '3. Seva & 80G Receipts', icon: FileText, badge: 'Tax Deduct' },
            { id: 'FAMILY_PITRU', label: '4. Family & Pitru', icon: Heart, badge: 'Shradh' },
            { id: 'PILGRIMAGE', label: '5. Pilgrimage Footprint', icon: Compass, badge: 'YatraNet' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DevoteePortalTab)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                  isActive ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================
          MAIN TAB CONTENT AREA
      ======================================================== */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 flex-1">
        
        {/* ----------------------------------------------------
            TAB 1: DIGITAL PASS & IDENTITY (PASS)
        ---------------------------------------------------- */}
        {activeTab === 'PASS' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/70 p-4 rounded-3xl border border-stone-800">
              <div>
                <h2 className="text-xl font-black text-amber-200 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span>Sanatani Bandhan Official Smart Pass</span>
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Cryptographically verified temple credential for sanctum fast-track entry, prasad token redemption, and emergency telemetry.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Identity</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadIdCard}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-stone-950" />
                  <span>Download PDF Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title="Print Digital ID"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smart Pass Card Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Holographic ID Pass Card (Left 7 Cols) */}
              <div className="lg:col-span-7 bg-gradient-to-br from-amber-950/70 via-stone-900 to-stone-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                
                {/* Background Temple Watermark Filigree */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-4 text-[120px] font-serif opacity-5 text-amber-400 pointer-events-none select-none">
                  🕉️
                </div>

                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-amber-500/20 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
                      <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl">
                        ॐ
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-amber-100 tracking-wide uppercase">
                        {activeWorkspace?.name || 'Sanatani Bandhan Trust'}
                      </h3>
                      <p className="text-[11px] text-amber-400/90 font-semibold tracking-wider uppercase">
                        Vedic Devotee Credential & Sanctum Pass
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm">
                    {profileData.sevaTier || 'Vishesh'} Sevak
                  </span>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  
                  {/* Left: Avatar & Identity Details */}
                  <div className="sm:col-span-7 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 p-1 flex items-center justify-center text-3xl shadow-inner shrink-0">
                        {profileData.avatarUrl ? (
                          <img src={profileData.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>🙏</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg sm:text-xl font-black text-white leading-tight">
                          {profileData.fullName}
                        </h4>
                        {profileData.spiritualName && (
                          <p className="text-xs text-amber-300 font-bold italic">
                            Dharmic: {profileData.spiritualName}
                          </p>
                        )}
                        <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                          ID: <span className="text-amber-400 font-bold">{profileData.sanataniId || 'SB-PASS-1008'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Gotra / Lineage</span>
                        <span className="font-extrabold text-amber-300">{profileData.gotra} Gotra</span>
                      </div>
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Blood Group</span>
                        <span className="font-extrabold text-rose-400">{profileData.bloodGroup}</span>
                      </div>
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Emergency Phone</span>
                        <a href={`tel:${profileData.emergencyPhone}`} className="font-mono font-bold text-amber-300 hover:underline">
                          {profileData.emergencyPhone}
                        </a>
                      </div>
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Kuladevata</span>
                        <span className="font-bold text-stone-200 truncate block">{profileData.kuladevata || 'Sri Shiva'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scan-Ready QR Code */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center bg-stone-950/80 p-4 rounded-2xl border border-amber-500/30 shadow-inner text-center">
                    <div 
                      onClick={() => setIsQrModalOpen(true)}
                      className="p-2.5 bg-white rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform"
                      title="Tap to view fullscreen scan QR"
                    >
                      <QRCodeSVG
                        value={dynamicQRToken}
                        size={135}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between w-full text-[10px] text-stone-400">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Dynamic Token
                      </span>
                      <span className="font-mono text-amber-300 font-bold">
                        {tokenRefreshCounter}s
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 w-full">
                      <button
                        type="button"
                        onClick={handleManualRefreshToken}
                        className="flex-1 py-1 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Rotate security token now"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Rotate</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedToken ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Card Footer */}
                <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
                  <span>Issued: {profileData.joinedDate || 'Chaitra 2081'}</span>
                  <span className="text-amber-400/90 font-mono font-bold">SECURE SHA-256 VAULT VERIFIED</span>
                </div>

              </div>

              {/* Right Side: Pass Benefits & Emergency Quick Tile (Right 5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Fast-Track Privileges Box */}
                <div className="bg-stone-950/70 p-5 rounded-3xl border border-stone-800 space-y-3">
                  <h4 className="text-sm font-black text-amber-200 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Your Credential Privileges</span>
                  </h4>

                  <ul className="space-y-2.5 text-xs text-stone-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Fast-Track Darshan:</strong> Present this pass at Sanctum Gate 2 for priority queued aarti entry.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Annapurna Anna-Daan Mahaprasad:</strong> Direct QR scan verification for devotee dining token.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>YatraNet Mesh Node:</strong> Offline P2P location broadcast during massive Kumbh and Parikrama surge.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Section 80G Tax Exemption:</strong> Automatic tax receipt generation with valid PAN linked.</span>
                    </li>
                  </ul>
                </div>

                {/* Emergency Contact & Safety Card */}
                <div className="bg-rose-950/30 border border-rose-500/30 p-5 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Emergency & Safety Record</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px]">
                      {profileData.bloodGroup}
                    </span>
                  </div>

                  <p className="text-xs text-rose-200/80">
                    In the event of crowd surge, medical emergency, or lost kin, temple sevadars immediately scan this pass to contact:
                  </p>

                  <div className="p-3 bg-stone-900/90 rounded-2xl border border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Designated Contact</span>
                      <span className="text-xs font-bold text-white">{profileData.emergencyContact || 'Family Kin'}</span>
                    </div>
                    <a
                      href={`tel:${profileData.emergencyPhone}`}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call SOS</span>
                    </a>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 2: SADHANA & VRAT TRACKER (SADHANA)
        ---------------------------------------------------- */}
        {activeTab === 'SADHANA' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header / Daily Sankalpa */}
            <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-stone-950 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Nitya Sadhana • Daily Spiritual Accountability
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-amber-100 mt-1">
                    Japa Mala & Sacred Vrat Tracking
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Logged daily for your personal karma account and temple spiritual records.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-stone-950/80 px-4 py-2 rounded-2xl border border-amber-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Sadhana Streak</span>
                    <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                      🔥 {sadhanaState.weeklyStreakDays} Days
                    </span>
                  </div>
                  <div className="bg-stone-950/80 px-4 py-2 rounded-2xl border border-amber-500/30 text-center">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Meditation</span>
                    <span className="text-lg font-black text-amber-400">
                      🧘 {sadhanaState.meditationMinutes}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily Sankalpa Input */}
              <div className="mt-4 pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-400 shrink-0">Today's Sankalpa:</span>
                <input
                  type="text"
                  value={sadhanaState.dailySankalpa}
                  onChange={(e) => updateSadhana({ dailySankalpa: e.target.value })}
                  placeholder="Enter your daily spiritual dedication..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-amber-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Japa Mala Chanting Counter & Vrat Checklist Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left 6 cols: Tactile Japa Mala Chanting Counter */}
              <div className="lg:col-span-6 bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <span>Interactive Japa Mala Counter</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetJapa}
                    className="text-xs text-stone-500 hover:text-stone-300 font-bold transition-colors cursor-pointer"
                  >
                    Reset Count
                  </button>
                </div>

                {/* Mantra Selector */}
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1.5">
                    Select Sacred Mantra:
                  </label>
                  <select
                    value={sadhanaState.selectedMantraIndex}
                    onChange={(e) => updateSadhana({ selectedMantraIndex: Number(e.target.value) })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {mantrasList.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sanskrit Verse Display */}
                <div className="bg-stone-900/90 p-4 rounded-2xl border border-amber-900/30 text-center">
                  <p className="text-sm sm:text-base font-serif font-black text-amber-300 tracking-wide leading-relaxed">
                    {mantrasList[sadhanaState.selectedMantraIndex].sanskrit}
                  </p>
                </div>

                {/* Tactile Chanting Bead Button */}
                <div className="flex flex-col items-center justify-center py-4">
                  <button
                    type="button"
                    onClick={() => handleIncrementJapa(1)}
                    className="w-40 h-40 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-stone-950 font-black shadow-2xl shadow-amber-950/80 border-4 border-amber-400/80 flex flex-col items-center justify-center transition-all transform active:scale-95 cursor-pointer group"
                  >
                    <span className="text-3xl font-black">{sadhanaState.japaCount}</span>
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-stone-900 mt-1">
                      Tap To Chant (108)
                    </span>
                    <span className="text-[10px] text-stone-900/80 font-bold">
                      {sadhanaState.japaCount % 108}/108 Beads
                    </span>
                  </button>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleIncrementJapa(10)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      +10 Chants
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementJapa(108)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      +1 Full Mala (108)
                    </button>
                  </div>
                </div>

                {/* Mala Progress Bar */}
                <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-bold">Daily Malas Completed:</span>
                    <span className="text-amber-300 font-black">
                      {sadhanaState.completedMalas} / {sadhanaState.targetMalas} Malas Goal
                    </span>
                  </div>
                  <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden p-0.5 border border-stone-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (sadhanaState.completedMalas / sadhanaState.targetMalas) * 100)}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* Right 6 cols: Active Vrats & Fasting Rules Checklist */}
              <div className="lg:col-span-6 bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span>Sacred Vrats & Upavasa Checklist</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Panchang Aligned
                  </span>
                </div>

                <p className="text-xs text-stone-400">
                  Track your adherence to Vedic dietary and ritual fasting observances. Check items as observed:
                </p>

                <div className="space-y-3">
                  {[
                    {
                      key: 'ekadashi_nirjala',
                      title: 'Nirjala Ekadashi Fasting',
                      desc: 'Strict abstention from water and grains from sunrise to sunrise. Dedicated to Bhagavan Vishnu.',
                      badge: 'Hari Vasara',
                    },
                    {
                      key: 'ekadashi_phalahar',
                      title: 'Phalahar Ekadashi Rules',
                      desc: 'Consumption limited strictly to fruits, milk, sabudana, and sendha namak. Zero cereal grains.',
                      badge: 'Phalahari',
                    },
                    {
                      key: 'pradosh_vrata',
                      title: 'Som / Bhauma Pradosh Vrata',
                      desc: 'Evening sandhya twilight worship of Lord Shiva with Bilva Patra and panchamrit snan.',
                      badge: 'Shiva Puja',
                    },
                    {
                      key: 'somwar_shiva',
                      title: 'Somwar Vrata Observance',
                      desc: 'Maha Rudrabhishek recitation and single meal (Eka-bhukta) after sunset.',
                      badge: 'Somavara',
                    },
                    {
                      key: 'sandhya_vandanam',
                      title: 'Tri-Kala Sandhya Vandanam',
                      desc: 'Morning (Pratah), Noon (Madhyahna), and Evening (Sayam) Gayatri Japa performed on time.',
                      badge: 'Vedic Riti',
                    },
                  ].map((vrat) => {
                    const isChecked = (sadhanaState.completedVrats as any)[vrat.key];
                    return (
                      <div
                        key={vrat.key}
                        onClick={() => handleToggleVrat(vrat.key as any)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-amber-950/30 border-amber-500/50 shadow-sm'
                            : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-600 bg-stone-950'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-black ${isChecked ? 'text-amber-200' : 'text-stone-300'}`}>
                              {vrat.title}
                            </h4>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {vrat.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-1">
                            {vrat.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Meditation Log Action */}
                <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-300 block">Log Meditation Session</span>
                    <span className="text-[11px] text-stone-500">Record minutes spent in silent Dhyana</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          updateSadhana({ meditationMinutes: sadhanaState.meditationMinutes + mins });
                          showToast(`Logged +${mins} minutes of Dhyana 🙏`, 'success');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-amber-300 border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TAB 3: SEVA & TAX RECEIPTS
        ---------------------------------------------------- */}
        {activeTab === 'SEVA_RECEIPTS' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-md">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Lifetime Seva</span>
                <span className="text-2xl font-black text-amber-400">
                  ₹{userDonations.reduce((sum, d) => sum + d.amount, 0).toLocaleString('en-IN') || '11,000'}
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Dharmic Chanda & Sponsorships</span>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-md">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">80G Eligible Deductions</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{userDonations.filter(d => d.is80GEligible).reduce((sum, d) => sum + d.amount, 0).toLocaleString('en-IN') || '11,000'}
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Section 80G(5)(vi) Verified</span>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-md">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Active Puja Bookings</span>
                <span className="text-2xl font-black text-amber-300">
                  {userPoojaBookings.length || 2} Pujas
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Sankalpas on Roster</span>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-md">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Volunteer Seva Hours</span>
                <span className="text-2xl font-black text-amber-300">
                  {profileData.volunteerHours || 36} Hours
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Annadanam & Queue Seva</span>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
              <p className="text-xs text-stone-300">
                Download your official Section 80G tax deduction receipts or Sankalpa slips instantly for IT filing.
              </p>
              <button
                type="button"
                onClick={handleDownloadAnnualSummary}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-stone-950" />
                <span>Download Form 10BE Annual Summary</span>
              </button>
            </div>

            {/* Puja Bookings Section */}
            <div className="bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Personal Puja Bookings & Sankalpa Slips</span>
                </h3>
                <span className="text-xs text-stone-500">
                  {userPoojaBookings.length} Recorded
                </span>
              </div>

              {userPoojaBookings.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs">
                  No upcoming puja bookings found under your devotee profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userPoojaBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-stone-900/80 p-4 rounded-2xl border border-stone-800 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-black text-amber-200">
                            {booking.poojaName}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            booking.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        <p className="text-xs text-stone-400 mt-1">
                          <strong>Date: </strong>{booking.bookingDate || booking.tithiDate || 'Upcoming Tithi'} • <strong>Time: </strong>{booking.timeSlot}
                        </p>
                        <p className="text-xs text-stone-400">
                          <strong>Gotra: </strong>{booking.gotra} Gotra
                        </p>
                        {booking.sankalpDescription && (
                          <p className="text-[11px] text-amber-400/80 italic mt-1 line-clamp-2">
                            "{booking.sankalpDescription}"
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300">
                          Dakshina: ₹{(booking.dakshinaAmount || 1100).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadSankalp(booking)}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-amber-400" />
                          <span>Sankalp Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 80G Tax Receipts & Donations Section */}
            <div className="bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Section 80G Tax Exemption Receipts</span>
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  TRUST PAN: {activeWorkspace?.taxExemptionNumber || 'CIT(E)/80G/SB-2024'}
                </span>
              </div>

              {userDonations.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs">
                  No individual donation records found. Please donate via Quick Chanda to generate instant receipts.
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs text-stone-300">
                    <thead className="bg-stone-900 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Purpose / Category</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4">80G Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 font-medium">
                      {userDonations.map((tx) => (
                        <tr key={tx.id} className="hover:bg-stone-900/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-stone-400">{tx.date}</td>
                          <td className="py-3 px-4 font-bold text-amber-100">{tx.purpose || tx.category}</td>
                          <td className="py-3 px-4 font-black text-amber-400">₹{tx.amount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-stone-400">{tx.paymentMode}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              80G Eligible
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownload80GReceipt(tx)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3 text-amber-400" />
                              <span>80G PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ----------------------------------------------------
            TAB 4: FAMILY & PITRU REGISTRY
        ---------------------------------------------------- */}
        {activeTab === 'FAMILY_PITRU' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Household Family Registry Card */}
            <div className="bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-400" />
                    <span>Household Family Registry • {userFamily.familyName}</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Gotra: <strong className="text-amber-300">{userFamily.gotra}</strong> • Kuladevata: <strong className="text-amber-300">{userFamily.kuladevata}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => showToast('Family census sync active. Contact Mandir Purohit to add new births/kin.', 'info')}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Kin Note</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {householdMembers.map((member, idx) => (
                  <div
                    key={idx}
                    className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs">
                        {member.name.charAt(0)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-800 text-stone-300">
                        {member.relation}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">{member.name}</h4>
                      <p className="text-[11px] text-stone-400">{member.gotra} Gotra</p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-rose-400 font-bold">{member.bloodGroup}</span>
                      <a href={`tel:${member.phone}`} className="text-amber-400 hover:underline font-mono">
                        {member.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ancestral Pitru Shradh Tithi Countdown Registry */}
            <div className="bg-stone-950/80 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Ancestral Pitru Shradh Tithi Calendar</span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Automated lunar Tithi reminders and Pinda Daan puja booking countdown.
                  </p>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pitru Rin Mukti
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userPitruRecords.map((pitru) => (
                  <div
                    key={pitru.id}
                    className="bg-stone-900/90 p-5 rounded-2xl border border-stone-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-amber-100">{pitru.ancestorName}</h4>
                          <span className="text-xs text-stone-400 font-bold">{pitru.relationship}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {pitru.gotra} Gotra
                        </span>
                      </div>

                      <div className="mt-3 p-3 bg-stone-950/80 rounded-xl border border-stone-800/80 space-y-1 text-xs">
                        <p className="text-stone-300">
                          <strong>Lunar Demise Tithi: </strong>
                          <span className="text-amber-300 font-bold">{pitru.tithiLunar}</span>
                        </p>
                        <p className="text-stone-400">
                          <strong>Sacred Kshetra: </strong>{pitru.shradhLocation}
                        </p>
                        <p className="text-stone-400">
                          <strong>SMS/WhatsApp Alert: </strong>{pitru.annualShradhAlert ? '✅ Active 7 Days Prior' : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Annual Shradh Tithi Approaching</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => showToast(`Pinda Daan request registered for ${pitru.ancestorName} 🙏`, 'success')}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 text-xs font-black transition-all cursor-pointer"
                      >
                        Book Pinda Daan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ----------------------------------------------------
            TAB 5: PILGRIMAGE FOOTPRINT (YATRANET)
        ---------------------------------------------------- */}
        {activeTab === 'PILGRIMAGE' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Geo Check-In Action */}
            <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  YatraNet Mesh Telemetry
                </span>
                <h2 className="text-xl font-black text-amber-100 mt-1">
                  Sacred Pilgrimage Footprint & Geo Check-Ins
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Verified pilgrimage stamps logged through temple mesh beacons and sacred geo-fences.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGeoCheckInNow}
                disabled={isLocating}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <MapPin className="w-4 h-4 text-stone-950" />
                <span>{isLocating ? 'Locating...' : 'Log GPS Check-In Here'}</span>
              </button>
            </div>

            {/* Interactive Shrine Map & Footprint History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left 7 Cols: Leaflet Interactive Mini-Map */}
              <div className="lg:col-span-7 bg-stone-950/90 rounded-3xl border border-stone-800 p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapIcon className="w-4 h-4 text-amber-400" />
                    <span>Interactive Yatra Map</span>
                  </h3>
                  <span className="text-[11px] text-amber-400 font-bold">
                    {pilgrimageFootprint.length} Shrines Visited
                  </span>
                </div>

                <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-stone-800 z-0">
                  <MapContainer
                    center={pilgrimageFootprint[activeShrineIndex].coords}
                    zoom={6}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapViewRecenter center={pilgrimageFootprint[activeShrineIndex].coords} />
                    {pilgrimageFootprint.map((shrine, idx) => (
                      <Marker
                        key={shrine.id}
                        position={shrine.coords}
                        icon={createShrineMarkerIcon(idx === activeShrineIndex ? '#ea580c' : '#d97706')}
                        eventHandlers={{
                          click: () => setActiveShrineIndex(idx),
                        }}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-1 text-stone-900 text-xs">
                            <strong className="block text-amber-800 font-bold">{shrine.shrineName}</strong>
                            <p className="text-[10px] text-stone-600">{shrine.location}</p>
                            <span className="text-[9px] font-bold text-emerald-700 block mt-1">
                              Ritual: {shrine.darshanType}
                            </span>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Right 5 Cols: Visited Shrines List */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-black text-stone-300 uppercase tracking-wider">
                  Verified Yatra Log
                </h3>

                {pilgrimageFootprint.map((shrine, idx) => {
                  const isSelected = idx === activeShrineIndex;
                  return (
                    <div
                      key={shrine.id}
                      onClick={() => setActiveShrineIndex(idx)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-md'
                          : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white">
                            {shrine.shrineName}
                          </h4>
                          <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>{shrine.location}</span>
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {shrine.badge}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                        <span>{shrine.visitedDate}</span>
                        <span className="text-emerald-400 font-bold">✓ Verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          FULLSCREEN QR MODAL FOR SANCTUM GATE SCANNER
      ======================================================== */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-stone-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-900 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
              ॐ
            </div>

            <div>
              <h3 className="text-lg font-black text-amber-100">
                {profileData.fullName}
              </h3>
              <p className="text-xs text-amber-400 font-mono">
                {profileData.sanataniId || 'SB-PASS-1008'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-xl inline-block">
              <QRCodeSVG
                value={dynamicQRToken}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="text-[11px] text-stone-400">
              Hold this QR steady against the Sanctum Turnstile Scanner or present to Sevadar.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleManualRefreshToken}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Refresh Token ({tokenRefreshCounter}s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT PROFILE MODAL
      ======================================================== */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-950 border border-stone-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Update Personal Devotee Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Spiritual / Diksha Name</label>
                  <input
                    type="text"
                    value={editFormData.spiritualName}
                    onChange={(e) => setEditFormData({ ...editFormData, spiritualName: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    required
                    value={editFormData.gotra}
                    onChange={(e) => setEditFormData({ ...editFormData, gotra: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Blood Group</label>
                  <select
                    value={editFormData.bloodGroup}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold cursor-pointer"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={`${bg} Positive`}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Emergency Kin Phone</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.emergencyPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, emergencyPhone: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Emergency Relation</label>
                  <input
                    type="text"
                    value={editFormData.emergencyContact}
                    onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Residence Address / Kshetra</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-stone-300 font-bold hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-black hover:from-amber-500 hover:to-amber-600 cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EMERGENCY SOS PANIC MODAL
      ======================================================== */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-stone-950 border-2 border-red-500/70 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl shadow-red-950/80">
            <div className="flex items-center justify-between border-b border-red-900/40 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <h3 className="text-lg font-black tracking-wide text-white">EMERGENCY SOS PANIC</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              This broadcasts immediate code red distress telemetry to temple sevadars, campus doctors, and crowd management dispatch:
            </p>

            {/* Situation Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-400 block">Select Emergency Nature:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'MEDICAL', label: '🚑 Medical / Cardiac' },
                  { id: 'CROWD_SURGE', label: '⚠️ Crowd Surge / Crush' },
                  { id: 'LOST_CHILD', label: '👶 Lost Child / Kin' },
                  { id: 'FIRE_HAZARD', label: '🔥 Fire / Hazard' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSosSituation(s.id as any)}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer ${
                      sosSituation === s.id
                        ? 'bg-red-600/30 border-red-500 text-white shadow-inner'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional details */}
            <div>
              <label className="text-xs font-bold text-stone-400 block mb-1">Additional details (Optional):</label>
              <textarea
                rows={2}
                value={sosDetails}
                onChange={(e) => setSosDetails(e.target.value)}
                placeholder="E.g. Near Sanctum Pillar #08, elderly devotee faint..."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/30 text-[11px] text-red-200">
              <strong>Telemetry Included: </strong>Name ({profileData.fullName}), Blood Group ({profileData.bloodGroup}), Emergency Phone ({profileData.emergencyPhone}), and Live GPS.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerEmergencySOS}
                disabled={isBroadcastingSos}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-red-950/80 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isBroadcastingSos ? 'Broadcasting...' : 'DISPATCH SOS NOW'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          QUICK SETTINGS & PREFERENCES DRAWER/MODAL
      ======================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-950 border border-stone-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-amber-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Devotee Preferences</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Language Selection */}
              <div>
                <label className="text-stone-400 font-bold block mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Language / भाषा / ভাষা:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'hi', label: 'हिन्दी (Hindi)' },
                    { code: 'en', label: 'English' },
                    { code: 'sa', label: 'संस्कृतम् (Sanskrit)' },
                    { code: 'bn', label: 'বাংলা (Bengali)' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code as any);
                        showToast(`Language set to ${lang.label}`, 'info');
                      }}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        language === lang.code
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 bg-stone-900 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2">
                  {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                  <span className="font-bold text-stone-200">
                    {isDarkMode ? 'Temple Night Mode' : 'Solar Light Mode'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Toggle
                </button>
              </div>

              {/* Sound Alerts */}
              <div className="flex items-center justify-between p-3 bg-stone-900 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2">
                  {soundAlertsEnabled ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-stone-500" />}
                  <span className="font-bold text-stone-200">Aarti & Siren Sounds</span>
                </div>
                <button
                  type="button"
                  onClick={toggleSoundAlerts}
                  className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  {soundAlertsEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-xs transition-colors cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE-FIRST BOTTOM NAVIGATION BAR
      ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-amber-900/40 px-2 py-1.5 shadow-2xl flex items-center justify-around">
        {[
          { id: 'PASS', label: 'PASS', icon: QrCode },
          { id: 'SADHANA', label: 'SADHANA', icon: Flame },
          { id: 'SEVA_RECEIPTS', label: 'SEVA & 80G', icon: FileText },
          { id: 'FAMILY_PITRU', label: 'FAMILY', icon: Heart },
          { id: 'PILGRIMAGE', label: 'YATRA', icon: Compass },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as DevoteePortalTab)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-amber-400 scale-105 font-black'
                  : 'text-stone-500 hover:text-stone-300 font-semibold'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && <span className="w-1 h-1 bg-amber-400 rounded-full mt-0.5" />}
            </button>
          );
        })}

        {/* Rapid SOS Action on Bottom Bar */}
        <button
          type="button"
          onClick={() => setShowSosModal(true)}
          className="flex flex-col items-center justify-center py-1 px-2 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          title="Emergency SOS"
        >
          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 animate-pulse" />
          <span className="text-[10px] mt-0.5 font-black text-red-400">SOS</span>
        </button>
      </nav>

    </div>
  );
};

export default DevoteeAccountPortal;
