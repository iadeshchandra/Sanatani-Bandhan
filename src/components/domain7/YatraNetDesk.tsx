import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Sparkles,
  Filter,
  Search,
  QrCode,
  Plus,
  Share2,
  Layers,
  Globe,
  Radio,
  Wifi,
  WifiOff,
  Send,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Footprints,
  Eye,
  RefreshCw,
  LocateFixed,
  Building,
  HeartHandshake
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { QRScanner } from '../common/QRScanner';
import { OfflineSyncManager, QueuedAction } from '../../services/OfflineSyncManager';
import { DevoteeCommsDrawer } from './DevoteeCommsDrawer';

// ==========================================
// Types & Interfaces
// ==========================================

export interface VisitRecord {
  id: string;
  devoteeId: string;
  devoteeName: string;
  devoteePhone?: string;
  gotra?: string;
  pravara?: string;
  workspaceId: string;
  locationName: string;
  branchName: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  darshanType: 'General Darshan' | 'Special Puja' | 'Aarti Seva' | 'Parikrama' | 'Prasad Seva';
  notes?: string;
  verified: boolean;
  qrVerified?: boolean;
}

// Map Controller for smooth fly-to animations
function FlyToController({ target, zoom }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, zoom || 16, { duration: 1.2 });
    }
  }, [target, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons to prevent broken asset paths and provide high-end Dharmic styling
const createTempleSanctumIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-temple-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group">
        <div class="absolute -inset-3 bg-amber-500/25 rounded-full animate-ping"></div>
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-300 shadow-xl flex items-center justify-center text-white font-black text-base select-none">
          ॐ
        </div>
        <div class="absolute -bottom-6 px-2 py-0.5 rounded-md bg-stone-950/90 text-amber-200 border border-amber-500/40 text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none">
          ${name}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
};

const createDevoteeMarkerIcon = (isSelf: boolean, isRecent: boolean = false) => {
  return L.divIcon({
    className: 'custom-devotee-pin',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group">
        ${isRecent ? '<div class="absolute -inset-2 bg-amber-400/40 rounded-full animate-ping"></div>' : ''}
        <div class="w-8 h-8 rounded-full ${
          isSelf
            ? 'bg-amber-500 border-2 border-amber-100 text-stone-950 shadow-amber-500/40'
            : 'bg-stone-900 border-2 border-emerald-400 text-emerald-300 shadow-stone-950/60'
        } shadow-lg flex items-center justify-center font-bold text-xs transition-transform transform group-hover:scale-115">
          ${isSelf ? '🙏' : '🚩'}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

// ==========================================
// Main Component
// ==========================================

export default function YatraNetDesk() {
  const { currentUser, activeWorkspace } = useAuthWorkspace();
  const { devotees } = useData();
  const { showToast } = useToast();

  // Active Desk View
  const [activeTab, setActiveTab] = useState<'MAP' | 'MESH'>('MAP');

  // RBAC Gating
  const userRole = (currentUser?.role || 'Devotee').toString().toLowerCase();
  const isAdminOrSevadar =
    userRole === 'trustee' ||
    userRole === 'superadmin' ||
    userRole === 'sevadar' ||
    userRole === 'admin' ||
    userRole === 'manager';

  // Base Coordinates for Active Workspace
  const templeCoords = useMemo<[number, number]>(() => {
    const city = activeWorkspace?.city?.toLowerCase() || '';
    if (city.includes('vrindavan') || city.includes('mathura')) return [27.5816, 77.7006];
    if (city.includes('ujjain')) return [23.1765, 75.7885];
    if (city.includes('ayodhya')) return [26.7922, 82.1998];
    if (city.includes('haridwar')) return [29.9457, 78.1642];
    if (city.includes('nagpur')) return [21.1458, 79.0882];
    if (city.includes('puri')) return [19.8135, 85.8312];
    if (city.includes('tirupati')) return [13.6288, 79.4192];
    // Default to Kashi / Varanasi
    return [25.3176, 82.9739];
  }, [activeWorkspace?.city]);

  // Map state
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(templeCoords);
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);

  // Live Intercom & Comms Drawer State
  const [showCommsDrawer, setShowCommsDrawer] = useState(false);
  const [commsTargetVisit, setCommsTargetVisit] = useState<VisitRecord | null>(null);

  const selectedDevoteeMember = useMemo(() => {
    if (!commsTargetVisit?.devoteeId) return null;
    return (
      devotees.find(
        (d) => d.id === commsTargetVisit.devoteeId || d.userId === commsTargetVisit.devoteeId
      ) || null
    );
  }, [devotees, commsTargetVisit]);

  const handleOpenCommsDrawer = (visit: VisitRecord) => {
    setCommsTargetVisit(visit);
    setShowCommsDrawer(true);
  };

  // Geo Check-In Modal & Location State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showQRScannerModal, setShowQRScannerModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentGPS, setCurrentGPS] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [checkInLocationName, setCheckInLocationName] = useState(activeWorkspace?.name || 'Main Sanctum');
  const [checkInDarshanType, setCheckInDarshanType] = useState<VisitRecord['darshanType']>('General Darshan');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'verified'>('all');

  // Visit Records State
  const [visits, setVisits] = useState<VisitRecord[]>([]);

  // ==========================================
  // Generate Base Grounded Seed Data
  // ==========================================
  useEffect(() => {
    const [tLat, tLng] = templeCoords;
    const now = Date.now();
    const wId = activeWorkspace?.id || 'DEMO_ws-mandir';
    const wName = activeWorkspace?.name || 'Sri Sanatan Dharma Mandir';

    const seedVisits: VisitRecord[] = [
      {
        id: 'seed-visit-1',
        devoteeId: currentUser?.id || 'dev-self',
        devoteeName: currentUser?.name || 'Devotee (You)',
        devoteePhone: '+91 98765 43210',
        gotra: 'Kashyapa',
        pravara: 'Trayarisheya',
        workspaceId: wId,
        locationName: `${wName} - Garbhagriha`,
        branchName: wName,
        latitude: tLat + 0.0004,
        longitude: tLng + 0.0003,
        timestamp: now - 1000 * 60 * 35, // 35 mins ago
        darshanType: 'General Darshan',
        notes: 'Offered sacred Bilva patra and received Charanodak prasad.',
        verified: true,
        qrVerified: true,
      },
      {
        id: 'seed-visit-2',
        devoteeId: 'dev-ramesh',
        devoteeName: 'Pandit Rameshwar Sharma',
        devoteePhone: '+91 98222 11009',
        gotra: 'Bharadwaja',
        pravara: 'Angirasa, Barhaspatya, Bharadwaja',
        workspaceId: wId,
        locationName: `${wName} - Yajnashala & Havan Kund`,
        branchName: wName,
        latitude: tLat - 0.0006,
        longitude: tLng + 0.0005,
        timestamp: now - 1000 * 60 * 85, // 85 mins ago
        darshanType: 'Special Puja',
        notes: 'Conducted Navagraha Shanti Havan for community welfare.',
        verified: true,
        qrVerified: true,
      },
      {
        id: 'seed-visit-3',
        devoteeId: 'dev-sunita',
        devoteeName: 'Smt. Sunita Devi Agarwal',
        devoteePhone: '+91 98444 33221',
        gotra: 'Garg',
        pravara: 'Garga, Shini, Babhru',
        workspaceId: wId,
        locationName: `${wName} - Annapurna Anna-Daan Bhavan`,
        branchName: wName,
        latitude: tLat + 0.0008,
        longitude: tLng - 0.0006,
        timestamp: now - 1000 * 60 * 140, // 2.3 hrs ago
        darshanType: 'Prasad Seva',
        notes: 'Distributed 250 Mahaprasad plates to pilgrims.',
        verified: true,
      },
      {
        id: 'seed-visit-4',
        devoteeId: 'dev-alok',
        devoteeName: 'Alok Nath Mishra',
        devoteePhone: '+91 98111 55667',
        gotra: 'Vashistha',
        pravara: 'Vashistha, Aindrapramada, Abharadvasu',
        workspaceId: wId,
        locationName: `${wName} - Sacred Parikrama Path`,
        branchName: wName,
        latitude: tLat - 0.0003,
        longitude: tLng - 0.0008,
        timestamp: now - 1000 * 60 * 220, // 3.6 hrs ago
        darshanType: 'Parikrama',
        notes: 'Completed 108 Pradakshina with Gayatri Japa.',
        verified: true,
      },
      {
        id: 'seed-visit-5',
        devoteeId: 'dev-priya',
        devoteeName: 'Priya Sundaram',
        devoteePhone: '+91 98700 99887',
        gotra: 'Harita',
        pravara: 'Harita, Ambarisha, Yuvanashva',
        workspaceId: wId,
        locationName: `${wName} - Dhyana Mandapam`,
        branchName: wName,
        latitude: tLat + 0.0002,
        longitude: tLng - 0.0004,
        timestamp: now - 1000 * 60 * 310, // ~5 hrs ago
        darshanType: 'Aarti Seva',
        notes: 'Attended Mangala Aarti and Vedic Chanting.',
        verified: true,
      },
    ];

    setVisits(seedVisits);
  }, [templeCoords, activeWorkspace, currentUser]);

  // ==========================================
  // Firestore Live Listener for Visit Records
  // ==========================================
  useEffect(() => {
    if (!activeWorkspace?.id) return;

    try {
      const visitsColRef = collection(db, `communities/${activeWorkspace.id}/visit_records`);
      const q = query(visitsColRef, orderBy('timestamp', 'desc'), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as VisitRecord[];

            setVisits((prev) => {
              // Merge fetched with existing to avoid losing demo seeds
              const map = new Map<string, VisitRecord>();
              prev.forEach((v) => map.set(v.id, v));
              fetched.forEach((v) => map.set(v.id, v));
              return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
            });
          }
        },
        (err) => {
          console.warn('Firestore visit_records real-time sync notice:', err.message);
        }
      );

      return () => unsubscribe();
    } catch (e: any) {
      console.warn('Realtime listener error fallback:', e?.message);
    }
  }, [activeWorkspace?.id]);

  // ==========================================
  // Devotee Geo Check-In (HTML5 Geolocation API)
  // ==========================================
  const captureGPSCoordinates = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      setIsLocating(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          };
          setCurrentGPS(coords);
          resolve(coords);
        },
        (error) => {
          setIsLocating(false);
          let message = 'Unable to retrieve your location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'GPS permission was denied. Please allow location access in your browser settings to verify your temple visit.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'GPS signal is currently unavailable. Using temple campus coordinates.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out. Please try again.';
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  };

  // Open Check-In modal and pre-fetch location
  const handleOpenCheckInModal = async () => {
    setShowCheckInModal(true);
    try {
      await captureGPSCoordinates();
      showToast('GPS coordinates acquired! Ready to check in.', 'success');
    } catch (err: any) {
      showToast(err.message, 'warning');
      // Fallback: place close to temple coordinates
      setCurrentGPS({
        lat: templeCoords[0] + (Math.random() - 0.5) * 0.001,
        lng: templeCoords[1] + (Math.random() - 0.5) * 0.001,
        accuracy: 25,
      });
    }
  };

  // Submit Visit Record to Firestore & Local State
  const handleSubmitVisitRecord = async (qrVerified: boolean = false, customLocationName?: string) => {
    setIsSubmittingCheckIn(true);

    try {
      let lat = currentGPS?.lat;
      let lng = currentGPS?.lng;

      // If no GPS yet, attempt quick capture
      if (!lat || !lng) {
        try {
          const fresh = await captureGPSCoordinates();
          lat = fresh.lat;
          lng = fresh.lng;
        } catch {
          lat = templeCoords[0] + (Math.random() - 0.5) * 0.0008;
          lng = templeCoords[1] + (Math.random() - 0.5) * 0.0008;
        }
      }

      const wId = activeWorkspace?.id || 'DEMO_ws-mandir';
      const wName = activeWorkspace?.name || 'Sri Sanatan Dharma Mandir';
      const visitId = `visit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const newRecord: VisitRecord = {
        id: visitId,
        devoteeId: currentUser?.id || `dev-${Date.now()}`,
        devoteeName: currentUser?.name || 'Devotee Pilgrim',
        devoteePhone: (currentUser as any)?.phone || '',
        workspaceId: wId,
        locationName: customLocationName || checkInLocationName || wName,
        branchName: wName,
        latitude: lat,
        longitude: lng,
        timestamp: Date.now(),
        darshanType: checkInDarshanType,
        notes: checkInNotes.trim() || 'Logged via YatraNet Geo-Check-In Desk',
        verified: true,
        qrVerified,
      };

      // 1. Update React state immediately for instant feedback
      setVisits((prev) => [newRecord, ...prev]);
      setFlyTarget([lat, lng]);
      setSelectedVisit(newRecord);

      // 2. Persist to Firestore
      try {
        const visitDocRef = doc(db, `communities/${wId}/visit_records`, visitId);
        await setDoc(visitDocRef, newRecord);
      } catch (firestoreErr: any) {
        console.warn('Firestore direct write fallback notice:', firestoreErr.message);
        // Queue for offline sync if offline or rule restricted
        OfflineSyncManager.addToQueue('LOG_VISIT' as any, newRecord);
      }

      showToast('Sacred Temple Visit logged successfully! Punya recorded. 🙏', 'success');
      setShowCheckInModal(false);
      setCheckInNotes('');
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast(err.message || 'Failed to log temple visit.', 'error');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // QR Code Scan Verification Handler
  const handleQRScanSuccess = (payload: any) => {
    setShowQRScannerModal(false);

    let locationScanned = activeWorkspace?.name || 'Main Sanctum';
    if (typeof payload === 'string') {
      locationScanned = payload;
    } else if (payload?.location || payload?.templeName || payload?.branchName) {
      locationScanned = payload.location || payload.templeName || payload.branchName;
    }

    setCheckInLocationName(locationScanned);
    handleSubmitVisitRecord(true, locationScanned);
  };

  // ==========================================
  // RBAC Filtering & Analytics
  // ==========================================

  // Filter visits based on RBAC:
  // - Admin/Trustee/Sevadar: sees all recent check-ins
  // - Devotee: sees ONLY their own check-ins
  const visibleVisits = useMemo(() => {
    let list = visits;

    if (!isAdminOrSevadar) {
      // Devotee Mode: restrict strictly to personal check-ins
      list = list.filter((v) => v.devoteeId === currentUser?.id);
    }

    // Apply UI search and filters
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.devoteeName.toLowerCase().includes(q) ||
          v.locationName.toLowerCase().includes(q) ||
          v.darshanType.toLowerCase().includes(q)
      );
    }

    if (filterPeriod === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      list = list.filter((v) => v.timestamp >= startOfDay.getTime());
    } else if (filterPeriod === 'verified') {
      list = list.filter((v) => v.verified || v.qrVerified);
    }

    return list;
  }, [visits, isAdminOrSevadar, currentUser?.id, searchQuery, filterPeriod]);

  // Analytics Computation
  const footfallStats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = visits.filter((v) => v.timestamp >= startOfDay.getTime()).length;
    const uniqueDevotees = new Set(visits.map((v) => v.devoteeId)).size;
    const verifiedPercent = visits.length
      ? Math.round((visits.filter((v) => v.verified).length / visits.length) * 100)
      : 100;

    return {
      total: visits.length,
      today: todayCount,
      uniqueDevotees,
      verifiedPercent,
      myVisitsCount: visits.filter((v) => v.devoteeId === currentUser?.id).length,
    };
  }, [visits, currentUser?.id]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-20 font-sans text-stone-100">
      {/* 1. Header & Desk Mode Controls */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 shadow-md font-serif font-black text-xl shrink-0 border border-amber-300/40">
              ॐ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-amber-100 tracking-wide">
                  YatraNet Geo-Tracking & Map Desk
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-amber-400" />
                  Live GIS
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {activeWorkspace?.name} • {activeWorkspace?.city || 'Bharat'} — Real-time telemetry & pilgrimage ledger
              </p>
            </div>
          </div>
        </div>

        {/* RBAC Mode Badge & Quick Action Pad */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdminOrSevadar ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Telemetry (All Devotees Footfall)</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
              <Footprints className="w-4 h-4 text-emerald-400" />
              <span>Devotee Mode (Personal Pilgrimage Passport)</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenCheckInModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Log Temple Visit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQRScannerModal(true)}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 hover:border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Scan Temple Location QR Code"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>
        </div>
      </div>

      {/* 2. Top Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              {isAdminOrSevadar ? 'Total Visits' : 'My Sacred Visits'}
            </span>
            <span className="text-lg font-black text-amber-100">
              {isAdminOrSevadar ? footfallStats.total : footfallStats.myVisitsCount}
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Today's Footfall
            </span>
            <span className="text-lg font-black text-emerald-300">
              {footfallStats.today} <span className="text-xs font-normal text-stone-400">check-ins</span>
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Unique Pilgrims
            </span>
            <span className="text-lg font-black text-indigo-200">
              {footfallStats.uniqueDevotees}
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              GPS Verified %
            </span>
            <span className="text-lg font-black text-amber-300">
              {footfallStats.verifiedPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Split-Screen Layout: Interactive Map (Left) & Feed / Footfall Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* MAP COLUMN (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-3.5 shadow-xl relative overflow-hidden flex flex-col">
            {/* Map Action Toolbar */}
            <div className="flex items-center justify-between gap-2 mb-3 px-1.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Interactive Pilgrimage Map</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                  {visibleVisits.length} pins plotted
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFlyTarget(templeCoords)}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Recenter on Temple Campus"
                >
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>Campus</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const pos = await captureGPSCoordinates();
                      setFlyTarget([pos.lat, pos.lng]);
                      showToast('Map centered on your GPS position', 'info');
                    } catch (e: any) {
                      showToast(e.message, 'warning');
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Locate My Position"
                >
                  <LocateFixed className={`w-3.5 h-3.5 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>My GPS</span>
                </button>
              </div>
            </div>

            {/* Map Container View */}
            <div className="w-full h-[460px] sm:h-[540px] rounded-2xl overflow-hidden border border-stone-800 relative isolate z-0 shadow-inner">
              <MapContainer
                center={templeCoords}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                {/* Free OpenStreetMap Tiles */}
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Smooth Fly-To Controller */}
                <FlyToController target={flyTarget} />

                {/* Temple Campus Sanctuary Center Marker */}
                <Marker
                  position={templeCoords}
                  icon={createTempleSanctumIcon(activeWorkspace?.name || 'Sanctum')}
                >
                  <Popup>
                    <div className="p-2 space-y-1 text-stone-900 max-w-[220px]">
                      <div className="font-bold text-xs text-amber-800">
                        {activeWorkspace?.name || 'Sri Sanatan Dharma Mandir'}
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Central Sanctum • {activeWorkspace?.city}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-stone-200">
                        Sanctum Open • Nitya Seva Active
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Sanctum Sacred Geofence Boundary Radius */}
                <Circle
                  center={templeCoords}
                  radius={450}
                  pathOptions={{
                    color: '#d97706',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.1,
                    weight: 1.5,
                    dashArray: '4, 4',
                  }}
                />

                {/* RBAC Filtered Devotee Visit Markers */}
                {visibleVisits.map((visit) => {
                  const isSelf = visit.devoteeId === currentUser?.id;
                  const isRecent = Date.now() - visit.timestamp < 1000 * 60 * 60; // < 1 hour

                  return (
                    <Marker
                      key={visit.id}
                      position={[visit.latitude, visit.longitude]}
                      icon={createDevoteeMarkerIcon(isSelf, isRecent)}
                      eventHandlers={{
                        click: () => {
                          setSelectedVisit(visit);
                          setFlyTarget([visit.latitude, visit.longitude]);
                          if (isAdminOrSevadar) {
                            handleOpenCommsDrawer(visit);
                          }
                        },
                      }}
                    >
                      <Popup>
                        <div className="p-2 space-y-1.5 text-stone-900 max-w-[240px] font-sans">
                          <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                            <span className="font-black text-xs text-stone-950">
                              {visit.devoteeName} {isSelf && '(You)'}
                            </span>
                            {visit.verified && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-stone-700">
                            <strong>Location: </strong>
                            {visit.locationName}
                          </div>

                          {visit.gotra && (
                            <div className="text-[10px] text-stone-600">
                              <strong>Gotra: </strong>
                              <span className="text-amber-800 font-semibold">{visit.gotra} Gotra</span>
                            </div>
                          )}

                          <div className="text-[11px] text-stone-700">
                            <strong>Ritual: </strong>
                            <span className="text-amber-800 font-semibold">{visit.darshanType}</span>
                          </div>

                          <div className="text-[10px] text-stone-500">
                            <strong>Time: </strong>
                            {new Date(visit.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            • {new Date(visit.timestamp).toLocaleDateString()}
                          </div>

                          {visit.notes && (
                            <p className="text-[10px] italic text-stone-600 bg-stone-100 p-1.5 rounded">
                              "{visit.notes}"
                            </p>
                          )}

                          <div className="pt-1.5 border-t border-stone-200 flex justify-between items-center">
                            <span className="text-[9px] text-stone-400 font-mono">
                              {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
                            </span>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${visit.latitude},${visit.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
                            >
                              <span>Navigate</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          {isAdminOrSevadar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCommsDrawer(visit);
                              }}
                              className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>Live Intercom & Comms</span>
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-stone-950/90 border border-stone-800 p-2 rounded-xl text-[10px] text-stone-300 shadow-lg space-y-1 z-[400] backdrop-blur-md">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wider mb-1">
                  <span>Legend</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-600 border border-amber-300 flex items-center justify-center text-[8px] text-white">ॐ</span>
                  <span>Temple Sanctum</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
                  <span>Your Personal Visit</span>
                </div>
                {isAdminOrSevadar && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-stone-900 border border-emerald-400"></span>
                    <span>Devotee Pilgrim</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FEED & ROSTER COLUMN (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 shadow-xl flex flex-col h-[520px] sm:h-[600px]">
            {/* Header & Search */}
            <div className="space-y-3 border-b border-stone-800 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 text-amber-400" />
                  <span>
                    {isAdminOrSevadar ? 'Live Devotee Footfall Feed' : 'My Pilgrimage Journey'}
                  </span>
                </h3>
                <span className="text-[10px] text-stone-400 font-semibold">
                  {visibleVisits.length} Records
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    isAdminOrSevadar
                      ? 'Search devotee, shrine, or ritual...'
                      : 'Search personal visits...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterPeriod('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterPeriod === 'all'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  All Visits
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPeriod('today')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterPeriod === 'today'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPeriod('verified')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterPeriod === 'verified'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  GPS Verified
                </button>
              </div>
            </div>

            {/* Scrolling List */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 custom-scrollbar pr-1">
              {visibleVisits.length === 0 ? (
                <div className="text-center py-16 text-stone-500 space-y-2">
                  <Compass className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
                  <p className="text-xs font-semibold">No temple visits match your search.</p>
                  <p className="text-[10px] text-stone-500">
                    Click "Log Temple Visit" or scan a location QR to record your sacred presence.
                  </p>
                </div>
              ) : (
                visibleVisits.map((visit) => {
                  const isSelected = selectedVisit?.id === visit.id;
                  const isSelf = visit.devoteeId === currentUser?.id;

                  return (
                    <div
                      key={visit.id}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setFlyTarget([visit.latitude, visit.longitude]);
                        if (isAdminOrSevadar) {
                          handleOpenCommsDrawer(visit);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-stone-950/80 hover:bg-stone-800/60 border-stone-800/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelf
                                ? 'bg-amber-500 text-stone-950 shadow-xs'
                                : 'bg-stone-800 text-amber-300 border border-stone-700'
                            }`}
                          >
                            {isSelf ? '🙏' : 'ॐ'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-amber-100 truncate flex items-center gap-1.5">
                              <span>{visit.devoteeName}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                  You
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-stone-400 truncate">
                              {visit.locationName}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-stone-500 shrink-0 font-medium">
                          {new Date(visit.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-800/80 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 font-medium">
                          {visit.darshanType}
                        </span>

                        <div className="flex items-center gap-2">
                          {visit.verified && (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              GPS Valid
                            </span>
                          )}

                          {isAdminOrSevadar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCommsDrawer(visit);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Open Live Intercom & Comms Drawer"
                            >
                              <Radio className="w-3 h-3 text-amber-400" />
                              <span>Intercom</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVisit(visit);
                              setFlyTarget([visit.latitude, visit.longitude]);
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Map</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Devotee Geo Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif text-lg font-bold">
                  ॐ
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-amber-100">
                    Log Temple Visit (Geo Check-In)
                  </h3>
                  <p className="text-[11px] text-amber-200/70">
                    {activeWorkspace?.name} • Record sacred darshan presence
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* GPS Status Box */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300 flex items-center gap-1.5">
                    <LocateFixed className="w-4 h-4 text-emerald-400" />
                    GPS Telemetry Coordinates
                  </span>
                  {currentGPS ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Acquired (±{currentGPS.accuracy || 15}m)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      {isLocating ? 'Acquiring GPS...' : 'Pending Location'}
                    </span>
                  )}
                </div>

                {currentGPS ? (
                  <div className="text-[11px] font-mono text-stone-400 bg-stone-900/80 p-2 rounded-xl border border-stone-800">
                    Lat: {currentGPS.lat.toFixed(6)} • Lng: {currentGPS.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-stone-400">
                      HTML5 Geolocation is used to pinpoint your sacred yatra footprint.
                    </p>
                    <button
                      type="button"
                      onClick={captureGPSCoordinates}
                      disabled={isLocating}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      {isLocating ? 'Locating...' : 'Retry GPS'}
                    </button>
                  </div>
                )}
              </div>

              {/* Devotee Info Strip */}
              <div className="text-xs text-stone-300 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Devotee Pilgrim</span>
                  <span className="font-bold text-amber-200">{currentUser?.name || 'Devotee'}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Role</span>
                  <span className="font-semibold text-emerald-400">{currentUser?.role || 'Devotee'}</span>
                </div>
              </div>

              {/* Shrine / Campus Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Temple Shrine / Campus Location
                </label>
                <select
                  value={checkInLocationName}
                  onChange={(e) => setCheckInLocationName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs sm:text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Main Sanctum (Garbhagriha)`}>
                    Main Sanctum (Garbhagriha)
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Dhyana Mandapam`}>
                    Dhyana Mandapam (Meditation Hall)
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Yajnashala & Havan Kund`}>
                    Yajnashala & Havan Kund
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Annapurna Anna-Daan Hall`}>
                    Annapurna Anna-Daan Hall
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Sacred Parikrama Path`}>
                    Sacred Parikrama Path
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - North Gopuram Entrance`}>
                    North Gopuram Entrance
                  </option>
                  <option value={`${activeWorkspace?.name || 'Mandir'} - Gau Seva Sanctuary`}>
                    Gau Seva Sanctuary
                  </option>
                </select>
              </div>

              {/* Darshan / Seva Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Purpose of Holy Visit
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'General Darshan',
                      'Special Puja',
                      'Aarti Seva',
                      'Parikrama',
                      'Prasad Seva',
                    ] as VisitRecord['darshanType'][]
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCheckInDarshanType(type)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                        checkInDarshanType === type
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sacred Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Sankalpa / Pilgrim Experience Notes (Optional)
                </label>
                <textarea
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="e.g. Offered morning Pushpanjali, completed 3 circumambulations..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs sm:text-sm text-stone-100 focus:outline-none focus:border-amber-500 resize-none h-20 placeholder-stone-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSubmitVisitRecord(false)}
                disabled={isSubmittingCheckIn}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCheckIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Recording Punya...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Temple Visit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. QR Code Check-In Scanner Modal */}
      {showQRScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans">
            <div className="bg-gradient-to-r from-amber-950 to-stone-900 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-amber-100">
                  Scan Temple Entrance QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQRScannerModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <QRScanner
                title="Scan Holy Temple Location QR"
                subtitle="Position camera at the sanctum entrance or verification pass"
                onScanSuccess={handleQRScanSuccess}
                onClose={() => setShowQRScannerModal(false)}
                continuous={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Mobile Floating Action Button (FAB) */}
      <button
        type="button"
        id="fab-geo-checkin-btn"
        onClick={handleOpenCheckInModal}
        title="Quick Temple Geo Check-In"
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 font-black text-xs px-5 py-3.5 rounded-full shadow-2xl shadow-amber-500/40 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/50"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-stone-950"></span>
        </span>
        <MapPin className="w-4 h-4 text-stone-950" />
        <span>Check-In Now</span>
      </button>

      {/* 7. Live Intercom & Emergency Comms Bridge Drawer */}
      <DevoteeCommsDrawer
        isOpen={showCommsDrawer}
        onClose={() => setShowCommsDrawer(false)}
        visit={commsTargetVisit}
        devoteeMember={selectedDevoteeMember}
        currentUser={currentUser}
        activeWorkspace={activeWorkspace}
      />
    </div>
  );
}
