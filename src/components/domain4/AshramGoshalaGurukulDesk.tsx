import React, { useState, useMemo } from 'react';
import {
  Building2, Heart, GraduationCap, Plus, Search, Filter,
  CheckCircle2, Clock, Calendar, User, Phone, MapPin,
  Sparkles, Award, QrCode, Download, Printer, X, Eye,
  AlertTriangle, ShieldCheck, FileText, Check, ArrowRight,
  TrendingUp, Activity, BookOpen, ChevronRight, Home,
  Sparkle, Users, Layers, ExternalLink, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { AshramKutirRoom, GoshalaCowRecord, GurukulStudent, TreasuryTransaction } from '../../types';

// Tab identifiers
export type Domain4Tab = 'KUTIRS' | 'GOSHALA' | 'GURUKUL';

// Kutir categories
export type KutirCategory =
  | 'All'
  | 'Sadhana Kutir'
  | 'Dharamshala Deluxe'
  | 'Family Suite'
  | 'Dormitory Bed'
  | 'VIP Suite';

// Extended Stay Pass interface
export interface DigitalStayPass {
  passId: string;
  roomNumber: string;
  roomType: string;
  guestName: string;
  guestPhone: string;
  guestGotra: string;
  city: string;
  devoteesCount: number;
  checkInDate: string;
  checkOutDate: string;
  donationAmount: number;
  spiritualVow?: string;
  issuedAt: string;
  workspaceName: string;
}

// Recitation Test Record for Gurukul
export interface RecitationExamRecord {
  id: string;
  studentId: string;
  studentName: string;
  subjectTitle: string; // e.g., 'Rudradhyaya Namakam Recitation', 'Purusha Suktam', 'Panini Sutrapatha'
  score: number; // 0-100
  swaraAccuracy: 'Uttama (Flawless)' | 'Madhyama (Good)' | 'Abhyasa (Needs Practice)';
  examDate: string;
  examinerAcharya: string;
  remarks: string;
}

export const AshramGoshalaGurukulDesk: React.FC = () => {
  const { activeWorkspace, currentUser, currentRole } = useAuthWorkspace();
  const {
    rooms: contextRooms,
    cows: contextCows,
    gurukulStudents: contextStudents,
    addCow,
    adoptCow,
    addGurukulStudent,
    addTreasuryTransaction
  } = useData();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<Domain4Tab>('KUTIRS');

  // Permission helper
  const canManage = useMemo(() => {
    const roleUpper = (currentRole || '').toUpperCase();
    return (
      roleUpper.includes('ADMIN') ||
      roleUpper.includes('TRUSTEE') ||
      roleUpper.includes('MANAGER') ||
      roleUpper.includes('PRIEST') ||
      roleUpper.includes('PUROHIT')
    );
  }, [currentRole]);

  // =========================================================================
  // 1. ASHRAM KUTIRS & ACCOMMODATION STATE
  // =========================================================================
  const roomsStorageKey = `sb_ashram_rooms_${activeWorkspace.id}`;
  const [localRooms, setLocalRooms] = useState<AshramKutirRoom[]>(() => {
    try {
      const saved = localStorage.getItem(roomsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Seed default if empty
    return [
      {
        id: 'room-101',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Kutir 101 (Ganga Kutir)',
        roomType: 'Sadhana Kutir',
        capacity: 2,
        isOccupied: false,
        suggestedDonationPerDay: 800,
        cleaningStatus: 'Ready',
      },
      {
        id: 'room-102',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Kutir 102 (Shiva Kutir)',
        roomType: 'Sadhana Kutir',
        capacity: 2,
        isOccupied: true,
        currentGuestName: 'Swami Niranjananda Saraswati',
        checkInDate: '2026-09-20',
        checkOutDate: '2026-09-30',
        suggestedDonationPerDay: 800,
        cleaningStatus: 'Ready',
      },
      {
        id: 'room-201',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Bhavan Suite 201 (Kashi Bhavan)',
        roomType: 'Family Suite',
        capacity: 5,
        isOccupied: false,
        suggestedDonationPerDay: 1500,
        cleaningStatus: 'Ready',
      },
      {
        id: 'room-202',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Yatri Niwas 202 (Deluxe AC)',
        roomType: 'Dharamshala Deluxe',
        capacity: 3,
        isOccupied: true,
        currentGuestName: 'Rameshwar Vyas & Family',
        checkInDate: '2026-09-22',
        checkOutDate: '2026-09-25',
        suggestedDonationPerDay: 1100,
        cleaningStatus: 'Ready',
      },
      {
        id: 'room-301',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Ananda Kutir VIP 301',
        roomType: 'Sadhana Kutir',
        capacity: 2,
        isOccupied: false,
        suggestedDonationPerDay: 2100,
        cleaningStatus: 'Needs Cleaning',
      },
      {
        id: 'room-401',
        workspaceId: activeWorkspace.id,
        roomNumber: 'Brahmachari Dorm 401 (Bed 1-8)',
        roomType: 'Dormitory Bed',
        capacity: 8,
        isOccupied: false,
        suggestedDonationPerDay: 250,
        cleaningStatus: 'Ready',
      },
    ];
  });

  const roomsList = useMemo(() => {
    const combined = [...localRooms];
    // merge any from context that aren't already in localRooms
    (contextRooms || []).forEach((cr) => {
      if (!combined.some((r) => r.id === cr.id || r.roomNumber === cr.roomNumber)) {
        combined.push(cr);
      }
    });
    return combined;
  }, [localRooms, contextRooms]);

  // Filters for Kutirs
  const [kutirSearch, setKutirSearch] = useState('');
  const [kutirCategoryFilter, setKutirCategoryFilter] = useState<KutirCategory>('All');
  const [kutirStatusFilter, setKutirStatusFilter] = useState<'All' | 'Vacant' | 'Occupied' | 'Cleaning'>('All');

  const filteredRooms = useMemo(() => {
    return roomsList.filter((room) => {
      const matchSearch =
        room.roomNumber.toLowerCase().includes(kutirSearch.toLowerCase()) ||
        (room.currentGuestName || '').toLowerCase().includes(kutirSearch.toLowerCase());
      const matchCategory =
        kutirCategoryFilter === 'All' || room.roomType === kutirCategoryFilter;
      const matchStatus =
        kutirStatusFilter === 'All' ||
        (kutirStatusFilter === 'Vacant' && !room.isOccupied) ||
        (kutirStatusFilter === 'Occupied' && room.isOccupied) ||
        (kutirStatusFilter === 'Cleaning' && room.cleaningStatus !== 'Ready');
      return matchSearch && matchCategory && matchStatus;
    });
  }, [roomsList, kutirSearch, kutirCategoryFilter, kutirStatusFilter]);

  // Modals for Kutirs
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<AshramKutirRoom | null>(null);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [activeStayPass, setActiveStayPass] = useState<DigitalStayPass | null>(null);

  // Booking Form State
  const [bookForm, setBookForm] = useState({
    guestName: '',
    guestPhone: '',
    guestGotra: 'Bharadwaja',
    city: 'Varanasi',
    devoteesCount: 2,
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    donationAmount: 800,
    spiritualVow: 'Mahamrityunjaya Japa Sadhana & Ganga Snana',
  });

  // Add Room Form State
  const [newRoomForm, setNewRoomForm] = useState({
    roomNumber: '',
    roomType: 'Sadhana Kutir' as AshramKutirRoom['roomType'],
    capacity: 2,
    suggestedDonationPerDay: 800,
  });

  const handleOpenBooking = (room: AshramKutirRoom) => {
    setSelectedRoomForBooking(room);
    setBookForm((prev) => ({
      ...prev,
      donationAmount: room.suggestedDonationPerDay || 800,
    }));
    setIsBookModalOpen(true);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) return;
    if (!bookForm.guestName.trim() || !bookForm.guestPhone.trim()) {
      showToast('Please enter Pilgrim guest name and contact phone number.', 'error');
      return;
    }

    const updatedRooms = roomsList.map((r) =>
      r.id === selectedRoomForBooking.id
        ? {
            ...r,
            isOccupied: true,
            currentGuestName: bookForm.guestName.trim(),
            checkInDate: bookForm.checkInDate,
            checkOutDate: bookForm.checkOutDate,
            cleaningStatus: 'Ready' as const,
          }
        : r
    );

    setLocalRooms(updatedRooms);
    try {
      localStorage.setItem(roomsStorageKey, JSON.stringify(updatedRooms));
    } catch (e) {}

    // Generate Digital Stay Pass
    const pass: DigitalStayPass = {
      passId: `PASS-KUTIR-${Date.now().toString().slice(-6)}`,
      roomNumber: selectedRoomForBooking.roomNumber,
      roomType: selectedRoomForBooking.roomType,
      guestName: bookForm.guestName.trim(),
      guestPhone: bookForm.guestPhone.trim(),
      guestGotra: bookForm.guestGotra,
      city: bookForm.city,
      devoteesCount: Number(bookForm.devoteesCount),
      checkInDate: bookForm.checkInDate,
      checkOutDate: bookForm.checkOutDate,
      donationAmount: Number(bookForm.donationAmount),
      spiritualVow: bookForm.spiritualVow,
      issuedAt: new Date().toISOString(),
      workspaceName: activeWorkspace.name || 'Sanatani Ashram',
    };

    // Record donation to treasury
    try {
      addTreasuryTransaction({
        workspaceId: activeWorkspace.id,
        date: new Date().toISOString().split('T')[0],
        type: 'Income',
        category: 'Ashram & Dharamshala',
        amount: Number(bookForm.donationAmount) || 0,
        handledBy: currentUser?.name || 'Ashram Niwas Warden',
        devoteeName: bookForm.guestName.trim(),
        paymentMode: 'UPI / QR',
        purpose: `Kutir Booking: ${selectedRoomForBooking.roomNumber}`,
        is80GEligible: true,
        taxReceiptIssued: true,
        taxReceiptNumber: `REC-KUTIR-${Date.now().toString().slice(-6)}`,
      } as any);
    } catch (err) {}

    setIsBookModalOpen(false);
    setActiveStayPass(pass);
    showToast(
      `Room ${selectedRoomForBooking.roomNumber} allocated to ${bookForm.guestName}! Digital Stay Pass issued. 🙏`,
      'success',
      'Kutir Allocated'
    );
  };

  const handleCheckOut = (room: AshramKutirRoom) => {
    const updatedRooms = roomsList.map((r) =>
      r.id === room.id
        ? {
            ...r,
            isOccupied: false,
            currentGuestName: undefined,
            checkInDate: undefined,
            checkOutDate: undefined,
            cleaningStatus: 'Needs Cleaning' as const,
          }
        : r
    );
    setLocalRooms(updatedRooms);
    try {
      localStorage.setItem(roomsStorageKey, JSON.stringify(updatedRooms));
    } catch (e) {}

    showToast(
      `Guest checked out from ${room.roomNumber}. Room marked as 'Needs Cleaning' for seva team. 🧹`,
      'info',
      'Guest Checked Out'
    );
  };

  const handleToggleCleaningStatus = (room: AshramKutirRoom) => {
    const nextStatus: 'Ready' | 'Needs Cleaning' | 'Maintenance' =
      room.cleaningStatus === 'Ready'
        ? 'Needs Cleaning'
        : room.cleaningStatus === 'Needs Cleaning'
        ? 'Maintenance'
        : 'Ready';

    const updatedRooms = roomsList.map((r) =>
      r.id === room.id ? { ...r, cleaningStatus: nextStatus } : r
    );
    setLocalRooms(updatedRooms);
    try {
      localStorage.setItem(roomsStorageKey, JSON.stringify(updatedRooms));
    } catch (e) {}

    showToast(`Updated ${room.roomNumber} status to '${nextStatus}'`, 'info');
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomForm.roomNumber.trim()) {
      showToast('Please provide a Room/Kutir number or name.', 'error');
      return;
    }

    const newRoom: AshramKutirRoom = {
      id: `room-${Date.now()}`,
      workspaceId: activeWorkspace.id,
      roomNumber: newRoomForm.roomNumber.trim(),
      roomType: newRoomForm.roomType,
      capacity: Number(newRoomForm.capacity) || 2,
      isOccupied: false,
      suggestedDonationPerDay: Number(newRoomForm.suggestedDonationPerDay) || 500,
      cleaningStatus: 'Ready',
    };

    const updated = [newRoom, ...roomsList];
    setLocalRooms(updated);
    try {
      localStorage.setItem(roomsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    setIsAddRoomModalOpen(false);
    setNewRoomForm({
      roomNumber: '',
      roomType: 'Sadhana Kutir',
      capacity: 2,
      suggestedDonationPerDay: 800,
    });
    showToast(`Added new ${newRoom.roomNumber} to inventory!`, 'success');
  };

  // =========================================================================
  // 2. GOSHALA SEVA & GAU-PALAN STATE
  // =========================================================================
  const [goshalaSearch, setGoshalaSearch] = useState('');
  const [goshalaBreedFilter, setGoshalaBreedFilter] = useState('All');
  const [goshalaStatusFilter, setGoshalaStatusFilter] = useState('All');

  // Modals for Goshala
  const [isFodderModalOpen, setIsFodderModalOpen] = useState(false);
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false);
  const [isAddCowModalOpen, setIsAddCowModalOpen] = useState(false);
  const [selectedCowForSeva, setSelectedCowForSeva] = useState<GoshalaCowRecord | null>(null);
  const [gauReceipt, setGauReceipt] = useState<{
    receiptNo: string;
    donorName: string;
    amount: number;
    gotra: string;
    purpose: string;
    cowName?: string;
    date: string;
  } | null>(null);

  // Fodder Donation Form
  const [fodderForm, setFodderForm] = useState({
    donorName: currentUser?.name || 'Sri Sanatan Devotee',
    gotra: 'Kashyapa',
    phone: currentUser?.phone || '+91 98765 43210',
    selectedTier: 2100, // 501 (1 Day), 2100 (1 Week), 5100 (1 Month)
    customAmount: '',
    purpose: 'Green Grass, Chokar, and Jaggery Fodder Seva',
    paymentMode: 'UPI / QR',
  });

  // Adopt Cow Form
  const [adoptForm, setAdoptForm] = useState({
    sponsorName: currentUser?.name || '',
    sponsorGotra: 'Shandilya',
    sponsorPhone: currentUser?.phone || '',
    monthlyCareFee: 3100,
  });

  // Add Cow Form
  const [newCowForm, setNewCowForm] = useState({
    tagNumber: `GAU-${Math.floor(100 + Math.random() * 900)}`,
    name: 'Gauri Mata',
    breed: 'Gir' as const,
    gender: 'Gau Mata (Cow)' as const,
    ageYears: 4,
    healthStatus: 'Healthy' as const,
    lactationStage: 'Lactating' as const,
    dailyMilkYieldLiters: 14,
    monthlyCareCost: 3500,
    notes: 'Sweet tempered, loves green grass and jaggery',
  });

  const allCowsList = useMemo(() => {
    return contextCows || [];
  }, [contextCows]);

  const filteredCows = useMemo(() => {
    return allCowsList.filter((cow) => {
      const matchSearch =
        cow.name.toLowerCase().includes(goshalaSearch.toLowerCase()) ||
        (cow.tagNumber || cow.cowTagId || '').toLowerCase().includes(goshalaSearch.toLowerCase()) ||
        cow.breed.toLowerCase().includes(goshalaSearch.toLowerCase());
      const matchBreed = goshalaBreedFilter === 'All' || cow.breed === goshalaBreedFilter;
      const matchStatus =
        goshalaStatusFilter === 'All' ||
        (goshalaStatusFilter === 'Adopted' && (cow.adoptedByDevotee || cow.adoptionSponsor)) ||
        (goshalaStatusFilter === 'Unadopted' && !(cow.adoptedByDevotee || cow.adoptionSponsor)) ||
        (goshalaStatusFilter === 'Lactating' && (cow.lactationStage === 'Lactating' || cow.dailyMilkYieldLiters || cow.dailyMilkLiters));
      return matchSearch && matchBreed && matchStatus;
    });
  }, [allCowsList, goshalaSearch, goshalaBreedFilter, goshalaStatusFilter]);

  // Goshala Aggregates
  const goshalaMetrics = useMemo(() => {
    const total = allCowsList.length;
    let lactating = 0;
    let totalMilk = 0;
    let adopted = 0;

    allCowsList.forEach((c) => {
      const milk = c.dailyMilkYieldLiters || c.dailyMilkLiters || 0;
      if (milk > 0 || c.lactationStage === 'Lactating') {
        lactating++;
        totalMilk += milk;
      }
      if (c.adoptedByDevotee || c.adoptionSponsor) {
        adopted++;
      }
    });

    return {
      total,
      lactating,
      totalMilk,
      adopted,
      adoptionPct: total > 0 ? Math.round((adopted / total) * 100) : 0,
    };
  }, [allCowsList]);

  const handleSponsorFodderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(fodderForm.customAmount) || fodderForm.selectedTier;
    if (finalAmount <= 0) {
      showToast('Please enter a valid donation amount.', 'error');
      return;
    }

    const receiptNo = `GAU-SEVA-${Date.now().toString().slice(-6)}`;
    const txDate = new Date().toISOString().split('T')[0];

    // Record in Treasury
    try {
      addTreasuryTransaction({
        workspaceId: activeWorkspace.id,
        date: txDate,
        type: 'Income',
        category: 'Gau Seva & Fodder',
        amount: finalAmount,
        handledBy: currentUser?.name || 'Goshala Adhyaksha',
        devoteeName: fodderForm.donorName.trim(),
        paymentMode: fodderForm.paymentMode,
        purpose: fodderForm.purpose,
        is80GEligible: true,
        taxReceiptIssued: true,
        taxReceiptNumber: receiptNo,
      } as any);
    } catch (err) {}

    setGauReceipt({
      receiptNo,
      donorName: fodderForm.donorName,
      amount: finalAmount,
      gotra: fodderForm.gotra,
      purpose: fodderForm.purpose,
      cowName: selectedCowForSeva?.name,
      date: txDate,
    });

    setIsFodderModalOpen(false);
    showToast(
      `Gau Seva donation of ₹${finalAmount.toLocaleString('en-IN')} received with deep gratitude! Kamadhenu bless your lineage. 🐄`,
      'success',
      'Punya Karma Logged'
    );
  };

  const handleAdoptCowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCowForSeva) return;
    if (!adoptForm.sponsorName.trim()) {
      showToast('Please enter devotee sponsor name.', 'error');
      return;
    }

    adoptCow(
      selectedCowForSeva.id,
      adoptForm.sponsorName.trim(),
      adoptForm.sponsorGotra.trim(),
      adoptForm.sponsorPhone.trim()
    );

    setIsAdoptModalOpen(false);
    showToast(
      `Congratulations! Gomata ${selectedCowForSeva.name} has been adopted by ${adoptForm.sponsorName} (${adoptForm.sponsorGotra} Gotra). 🙏`,
      'success',
      'Gau-Palan Registered'
    );
  };

  const handleAddNewCowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCowForm.name.trim()) {
      showToast('Please enter Gomata / Nandi name.', 'error');
      return;
    }

    addCow({
      workspaceId: activeWorkspace.id,
      tagNumber: newCowForm.tagNumber.trim(),
      name: newCowForm.name.trim(),
      breed: newCowForm.breed,
      gender: newCowForm.gender,
      ageYears: Number(newCowForm.ageYears),
      healthStatus: newCowForm.healthStatus,
      lactationStage: newCowForm.lactationStage,
      dailyMilkYieldLiters: Number(newCowForm.dailyMilkYieldLiters),
      monthlyCareCost: Number(newCowForm.monthlyCareCost),
      notes: newCowForm.notes,
    });

    setIsAddCowModalOpen(false);
    showToast(`Registered ${newCowForm.name} in Goshala Registry!`, 'success');
  };

  // =========================================================================
  // 3. GURUKUL & VEDIC PATHASHALA STATE
  // =========================================================================
  const [gurukulSearch, setGurukulSearch] = useState('');
  const [courseLevelFilter, setCourseLevelFilter] = useState('All');

  // Exam Score Records
  const examsStorageKey = `sb_gurukul_exams_${activeWorkspace.id}`;
  const [examRecords, setExamRecords] = useState<RecitationExamRecord[]>(() => {
    try {
      const saved = localStorage.getItem(examsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'exam-01',
        studentId: 'stud-01',
        studentName: 'Chinmay Joshi',
        subjectTitle: 'Sri Rudram (Namakam 11 Anuvakas)',
        score: 98,
        swaraAccuracy: 'Uttama (Flawless)',
        examDate: '2026-09-15',
        examinerAcharya: 'Pt. Vidyadhar Shastri (Ghanapathi)',
        remarks: 'Udatta and Anudatta swaras chanted with immaculate clarity and rhythm.',
      },
      {
        id: 'exam-02',
        studentId: 'stud-02',
        studentName: 'Madhavan Somayaji',
        subjectTitle: 'Purusha Suktam & Chamakam Recitation',
        score: 94,
        swaraAccuracy: 'Uttama (Flawless)',
        examDate: '2026-09-18',
        examinerAcharya: 'Pt. Somnath Dwivedi',
        remarks: 'Excellent breath control; ready for advanced Samaveda gāna modules.',
      },
      {
        id: 'exam-03',
        studentId: 'stud-03',
        studentName: 'Keshav Upadhyay',
        subjectTitle: 'Panini Ashtadhyayi Sutrapatha (Pada 1)',
        score: 89,
        swaraAccuracy: 'Madhyama (Good)',
        examDate: '2026-09-21',
        examinerAcharya: 'Dr. Raghavan Namboodiri',
        remarks: 'Minor pause on Pratyahara derivations, overall commendable dedication.',
      },
    ];
  });

  // Daily Attendance Map: { [studentId]: 'PRESENT' | 'ABSENT' | 'SEVA' }
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'SEVA'>>({
    'stud-01': 'PRESENT',
    'stud-02': 'PRESENT',
    'stud-03': 'SEVA',
  });

  // Modals for Gurukul
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentForExam, setSelectedStudentForExam] = useState<GurukulStudent | null>(null);

  // Exam Form
  const [examForm, setExamForm] = useState({
    subjectTitle: 'Sri Rudram (Namakam & Chamakam)',
    score: 95,
    swaraAccuracy: 'Uttama (Flawless)' as RecitationExamRecord['swaraAccuracy'],
    examinerAcharya: 'Pt. Vidyadhar Shastri (Ghanapathi)',
    remarks: 'Pristine Vedic swara pronunciation and flawless Sandhi integration.',
  });

  // Enroll Form
  const [enrollForm, setEnrollForm] = useState({
    studentName: 'Devavrat Sharma',
    rollNo: `GUK-${Math.floor(100 + Math.random() * 900)}`,
    courseLevel: 'Prathama (Grammar)' as GurukulStudent['courseLevel'],
    guardianName: 'Sri Shrikant Sharma',
    guardianPhone: '+91 94220 88123',
    dateOfUpanayanam: '2025-05-10',
    sandhyaVandanaRegularity: 100,
    shlokaRecitationScore: 92,
    attendancePct: 96,
  });

  const studentsList = useMemo(() => {
    return contextStudents || [];
  }, [contextStudents]);

  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(gurukulSearch.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(gurukulSearch.toLowerCase()) ||
        s.guardianName.toLowerCase().includes(gurukulSearch.toLowerCase());
      const matchCourse = courseLevelFilter === 'All' || s.courseLevel === courseLevelFilter;
      return matchSearch && matchCourse;
    });
  }, [studentsList, gurukulSearch, courseLevelFilter]);

  const handleMarkAttendance = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'SEVA') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    showToast(
      `Marked ${status.toLowerCase()} for daily Sandhyavandanam & Veda Pathashala session.`,
      'info'
    );
  };

  const handleOpenExamModal = (student: GurukulStudent) => {
    setSelectedStudentForExam(student);
    setIsExamModalOpen(true);
  };

  const handleSubmitExamScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForExam) return;

    const newRecord: RecitationExamRecord = {
      id: `exam-${Date.now()}`,
      studentId: selectedStudentForExam.id,
      studentName: selectedStudentForExam.studentName,
      subjectTitle: examForm.subjectTitle.trim(),
      score: Number(examForm.score),
      swaraAccuracy: examForm.swaraAccuracy,
      examDate: new Date().toISOString().split('T')[0],
      examinerAcharya: examForm.examinerAcharya.trim(),
      remarks: examForm.remarks.trim(),
    };

    const updated = [newRecord, ...examRecords];
    setExamRecords(updated);
    try {
      localStorage.setItem(examsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    setIsExamModalOpen(false);
    showToast(
      `Logged Shastric Recitation score of ${examForm.score}/100 for ${selectedStudentForExam.studentName}! 📜`,
      'success',
      'Vedic Exam Recorded'
    );
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.studentName.trim()) {
      showToast('Please enter student name.', 'error');
      return;
    }

    addGurukulStudent({
      workspaceId: activeWorkspace.id,
      studentName: enrollForm.studentName.trim(),
      rollNo: enrollForm.rollNo.trim(),
      courseLevel: enrollForm.courseLevel,
      sandhyaVandanaRegularity: Number(enrollForm.sandhyaVandanaRegularity) || 100,
      shlokaRecitationScore: Number(enrollForm.shlokaRecitationScore) || 90,
      guardianName: enrollForm.guardianName.trim() || 'Parent/Guardian',
      guardianPhone: enrollForm.guardianPhone.trim() || '+91 99999 99999',
      dateOfUpanayanam: enrollForm.dateOfUpanayanam,
      attendancePct: Number(enrollForm.attendancePct) || 95,
    });

    setIsEnrollModalOpen(false);
    showToast(
      `Enrolled Brahmachari ${enrollForm.studentName} in ${enrollForm.courseLevel}! 🕉️`,
      'success',
      'Vidyarthi Enrolled'
    );
  };

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* =====================================================================
          TOP BANNER: SANCTUARY & DHARMIC INSTITUTION HEADER
      ===================================================================== */}
      <section className="bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Domain 4 • Specialized Dharmic Institutions
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {activeWorkspace?.name || 'Sanatan Mandir Trust'} • Managed by {currentUser?.name || 'Acharya'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight flex items-center gap-3">
              <span>Ashram, Goshala & Gurukul Resource Desk</span>
            </h1>

            <p className="text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Unified institutional management for pilgrim accommodation & sadhana kutirs, indigenous Kamadhenu gau-palan & fodder sponsorships, and Vedic Brahmachari pathashala education.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-stone-950/70 p-3 rounded-2xl border border-stone-800 backdrop-blur-md shrink-0">
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Kutir Rooms</span>
              <span className="text-lg font-black text-amber-300">{roomsList.length}</span>
            </div>
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Desi Cows</span>
              <span className="text-lg font-black text-emerald-400">{allCowsList.length}</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Brahmacharis</span>
              <span className="text-lg font-black text-sky-400">{studentsList.length}</span>
            </div>
          </div>
        </div>

        {/* 3-Tab Navigator */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('KUTIRS')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'KUTIRS'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Ashram Kutirs & Dharamshala</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'KUTIRS' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {roomsList.filter(r => !r.isOccupied).length} Vacant
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GOSHALA')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'GOSHALA'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>2. Goshala (Cows & Seva)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'GOSHALA' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {goshalaMetrics.totalMilk} L/day
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GURUKUL')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'GURUKUL'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>3. Gurukul (Students & Veda Studies)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'GURUKUL' ? 'bg-stone-950 text-amber-300' : 'bg-stone-800 text-stone-400'
            }`}>
              {studentsList.length} Enrolled
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: ASHRAM KUTIRS & ACCOMMODATION DESK
      ===================================================================== */}
      {activeTab === 'KUTIRS' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search room number, kutir name, or pilgrim guest..."
                  value={kutirSearch}
                  onChange={(e) => setKutirSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <select
                value={kutirCategoryFilter}
                onChange={(e) => setKutirCategoryFilter(e.target.value as KutirCategory)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Categories</option>
                <option value="Sadhana Kutir">Sadhana Kutir</option>
                <option value="Dharamshala Deluxe">Dharamshala Deluxe</option>
                <option value="Family Suite">Family Suite</option>
                <option value="Dormitory Bed">Dormitory Bed</option>
              </select>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                {(['All', 'Vacant', 'Occupied', 'Cleaning'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setKutirStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      kutirStatusFilter === st
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Room</span>
                </button>
              </div>
            )}
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((room) => {
              const isReady = room.cleaningStatus === 'Ready';
              return (
                <div
                  key={room.id}
                  className={`bg-stone-900/90 rounded-3xl border p-5 transition-all flex flex-col justify-between shadow-xl ${
                    room.isOccupied
                      ? 'border-amber-500/40 bg-gradient-to-b from-stone-900 to-amber-950/20'
                      : isReady
                      ? 'border-emerald-500/30'
                      : 'border-rose-500/30'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">{room.roomNumber}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              room.isOccupied
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {room.isOccupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </div>
                        <span className="text-xs text-amber-400/90 font-medium">
                          {room.roomType} • Max {room.capacity} Devotees
                        </span>
                      </div>

                      {/* Housekeeping Pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleCleaningStatus(room)}
                        title="Click to toggle housekeeping status"
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors cursor-pointer ${
                          room.cleaningStatus === 'Ready'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                            : room.cleaningStatus === 'Needs Cleaning'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {room.cleaningStatus}
                      </button>
                    </div>

                    {/* Room Details / Guest Details */}
                    {room.isOccupied ? (
                      <div className="bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800 space-y-2 mb-4 text-xs">
                        <div className="flex items-center justify-between text-stone-300">
                          <span className="text-[10px] uppercase font-bold text-stone-500">Current Pilgrim</span>
                          <span className="font-black text-amber-200">{room.currentGuestName}</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-400 text-[11px]">
                          <span>Stay Schedule:</span>
                          <span className="font-mono text-stone-200">
                            {room.checkInDate || 'Now'} → {room.checkOutDate || 'Open'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-400 text-[11px]">
                          <span>Suggested Seva Dakshina:</span>
                          <span className="font-bold text-emerald-400">
                            ₹{room.suggestedDonationPerDay}/day
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-stone-950/40 p-3.5 rounded-2xl border border-stone-800/60 space-y-1.5 mb-4 text-xs">
                        <div className="flex items-center justify-between text-stone-400">
                          <span>Capacity:</span>
                          <span className="font-bold text-stone-200">{room.capacity} Persons</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-400">
                          <span>Seva Donation / Day:</span>
                          <span className="font-bold text-amber-300">
                            ₹{room.suggestedDonationPerDay}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                          Includes hot water, pure Satvik prasad bhojanam, and Mandir sanctum access.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                    {room.isOccupied ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStayPass({
                              passId: `PASS-${room.id.slice(-4).toUpperCase()}`,
                              roomNumber: room.roomNumber,
                              roomType: room.roomType,
                              guestName: room.currentGuestName || 'Pilgrim',
                              guestPhone: '+91 98765 00000',
                              guestGotra: 'Sanatan Gotra',
                              city: activeWorkspace.city || 'Kashi',
                              devoteesCount: room.capacity,
                              checkInDate: room.checkInDate || '2026-09-20',
                              checkOutDate: room.checkOutDate || '2026-09-25',
                              donationAmount: room.suggestedDonationPerDay,
                              spiritualVow: 'Temple Seva & Darshan',
                              issuedAt: new Date().toISOString(),
                              workspaceName: activeWorkspace.name || 'Sanatani Ashram',
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCheckOut(room)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Check Out
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(room)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Room & Issue Stay Pass</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: GOSHALA SEVA & GAU-PALAN DESK
      ===================================================================== */}
      {activeTab === 'GOSHALA' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Total Gomata & Nandi</span>
              <div className="text-2xl font-black text-amber-300 mt-1 flex items-center gap-2">
                <span>{goshalaMetrics.total}</span>
                <span className="text-xs text-stone-500 font-normal">Desi Breeds</span>
              </div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Daily Milk Yield</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
                <span>{goshalaMetrics.totalMilk} L</span>
                <span className="text-xs text-stone-500 font-normal">for Abhisheka</span>
              </div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Devotee Adopted</span>
              <div className="text-2xl font-black text-sky-400 mt-1 flex items-center gap-2">
                <span>{goshalaMetrics.adoptionPct}%</span>
                <span className="text-xs text-stone-500 font-normal">({goshalaMetrics.adopted} Cows)</span>
              </div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Quick Punya Action</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCowForSeva(null);
                  setIsFodderModalOpen(true);
                }}
                className="mt-1 w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-stone-950" />
                <span>Sponsor Fodder (Grass)</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cow name, ear tag ID, breed..."
                  value={goshalaSearch}
                  onChange={(e) => setGoshalaSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Breed Filter */}
              <select
                value={goshalaBreedFilter}
                onChange={(e) => setGoshalaBreedFilter(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Breeds</option>
                <option value="Gir">Gir (Gujarat)</option>
                <option value="Sahiwal">Sahiwal</option>
                <option value="Tharparkar">Tharparkar</option>
                <option value="Rathi">Rathi</option>
                <option value="Kankrej">Kankrej</option>
                <option value="Red Sindhi">Red Sindhi</option>
              </select>

              {/* Adoption Filter */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                {(['All', 'Adopted', 'Unadopted', 'Lactating'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setGoshalaStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      goshalaStatusFilter === st
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setIsAddCowModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Cow</span>
              </button>
            )}
          </div>

          {/* Herd Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCows.map((cow) => {
              const isAdopted = Boolean(cow.adoptedByDevotee || cow.adoptionSponsor);
              const milkYield = cow.dailyMilkYieldLiters || cow.dailyMilkLiters || 0;

              return (
                <div
                  key={cow.id}
                  className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-xl shadow-md">
                          🐄
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-black text-white">{cow.name}</h3>
                            {isAdopted && (
                              <span title="Sponsored Gomata">
                                <Award className="w-4 h-4 text-amber-400 fill-amber-400" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-amber-400/90 font-mono">
                            {cow.tagNumber || cow.cowTagId || `ID-${cow.id.slice(-4)}`} • {cow.breed}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          cow.healthStatus === 'Healthy' || cow.healthStatus === 'Excellent'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {cow.healthStatus || 'Healthy'}
                      </span>
                    </div>

                    {/* Stats List */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-500 uppercase font-bold block">Daily Milk</span>
                        <span className="font-black text-emerald-300">
                          {milkYield > 0 ? `${milkYield} Liters` : 'Dry / Calf'}
                        </span>
                      </div>
                      <div className="bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-500 uppercase font-bold block">Gender / Age</span>
                        <span className="font-bold text-stone-200">
                          {cow.gender || 'Gau Mata'} • {cow.ageYears || 3} yrs
                        </span>
                      </div>
                    </div>

                    {/* Adoption Status Box */}
                    <div className="mt-3 p-3 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs">
                      {isAdopted ? (
                        <div className="space-y-1">
                          <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                            Devotee Guardian
                          </span>
                          <p className="font-bold text-stone-200">
                            {cow.adoptedByDevotee || cow.adoptionSponsor}
                          </p>
                          {cow.sponsorGotra && (
                            <p className="text-[11px] text-stone-400">
                              Gotra: {cow.sponsorGotra} • Care Seva Active
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 text-[11px]">No devotee guardian yet.</span>
                          <span className="text-[10px] text-amber-400 font-bold">Open for Adoption</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCowForSeva(cow);
                        setIsFodderModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Feed Grass / Fodder
                    </button>

                    {!isAdopted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCowForSeva(cow);
                          setIsAdoptModalOpen(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                      >
                        Adopt Gomata
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCowForSeva(cow);
                          setIsFodderModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold"
                      >
                        Adopted ✓
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: GURUKUL & VEDIC PATHASHALA DESK
      ===================================================================== */}
      {activeTab === 'GURUKUL' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student scholar, roll no, guardian..."
                  value={gurukulSearch}
                  onChange={(e) => setGurukulSearch(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Course Level Filter */}
              <select
                value={courseLevelFilter}
                onChange={(e) => setCourseLevelFilter(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Course Levels</option>
                <option value="Prathama (Grammar)">Prathama (Grammar)</option>
                <option value="Madhyama (Shastras)">Madhyama (Shastras)</option>
                <option value="Shastri (Philosophy)">Shastri (Philosophy)</option>
                <option value="Acharya (Vedanta)">Acharya (Vedanta)</option>
              </select>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll New Vidyarthi</span>
              </button>
            )}
          </div>

          {/* Student Roster Table / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.map((stud) => {
              const currentAttendance = attendanceMap[stud.id] || 'PRESENT';
              return (
                <div
                  key={stud.id}
                  className="bg-stone-900/90 rounded-3xl border border-stone-800 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 p-0.5 shadow-md flex items-center justify-center">
                          <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-lg">
                            🕉️
                          </div>
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">{stud.studentName}</h3>
                          <span className="text-xs text-amber-400 font-mono">
                            {stud.rollNo} • {stud.courseLevel}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {stud.attendancePct || 98}% Attend
                      </span>
                    </div>

                    {/* Progress Metrics */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Sandhyavandanam Regularity:</span>
                          <span className="font-bold text-amber-300">{stud.sandhyaVandanaRegularity}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                            style={{ width: `${Math.min(100, stud.sandhyaVandanaRegularity || 90)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Shloka Recitation Score:</span>
                          <span className="font-bold text-emerald-400">{stud.shlokaRecitationScore}/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, stud.shlokaRecitationScore || 90)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-800/80 text-[11px] text-stone-400 flex justify-between">
                        <span>Guardian:</span>
                        <span className="text-stone-200 font-medium">{stud.guardianName} ({stud.guardianPhone})</span>
                      </div>
                    </div>

                    {/* Daily Attendance Buttons */}
                    <div className="mt-3 pt-3 border-t border-stone-800">
                      <span className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                        Today's Attendance:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['PRESENT', 'SEVA', 'ABSENT'] as const).map((att) => (
                          <button
                            key={att}
                            type="button"
                            onClick={() => handleMarkAttendance(stud.id, att)}
                            className={`py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              currentAttendance === att
                                ? att === 'PRESENT'
                                  ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-black'
                                  : att === 'SEVA'
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 font-black'
                                  : 'bg-rose-500 text-white border-rose-400 font-black'
                                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                            }`}
                          >
                            {att}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenExamModal(stud)}
                      className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Log Shastric Exam Score</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exam History Log */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Recent Veda Recitation & Shastra Pariksha Ledger</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Authenticated recitation scores evaluated by Acharyas with Swara accuracy assessment.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {examRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-200">{rec.studentName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-900 text-stone-300 font-mono text-[10px]">
                        {rec.subjectTitle}
                      </span>
                    </div>
                    <p className="text-stone-400 text-[11px] mt-0.5">
                      Evaluator: <span className="text-stone-300">{rec.examinerAcharya}</span> • Date: {rec.examDate}
                    </p>
                    <p className="text-stone-500 text-[11px] italic mt-0.5">"{rec.remarks}"</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-emerald-400">{rec.score}/100</span>
                    <span className="block text-[10px] text-amber-400 font-bold">{rec.swaraAccuracy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL 1: BOOK KUTIR ROOM & GENERATE STAY PASS
      ===================================================================== */}
      {isBookModalOpen && selectedRoomForBooking && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Pilgrim Stay Allocation
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Book {selectedRoomForBooking.roomNumber}
              </h3>
              <p className="text-xs text-stone-400">
                {selectedRoomForBooking.roomType} • Capacity: {selectedRoomForBooking.capacity} devotees
              </p>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Pilgrim Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rameshwar Shastri"
                  value={bookForm.guestName}
                  onChange={(e) => setBookForm({ ...bookForm, guestName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={bookForm.guestPhone}
                    onChange={(e) => setBookForm({ ...bookForm, guestPhone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    placeholder="e.g. Kashyapa / Vashistha"
                    value={bookForm.guestGotra}
                    onChange={(e) => setBookForm({ ...bookForm, guestGotra: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">City / State</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, Karnataka"
                    value={bookForm.city}
                    onChange={(e) => setBookForm({ ...bookForm, city: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">No. of Devotees</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRoomForBooking.capacity}
                    value={bookForm.devoteesCount}
                    onChange={(e) => setBookForm({ ...bookForm, devoteesCount: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Check-In Date</label>
                  <input
                    type="date"
                    required
                    value={bookForm.checkInDate}
                    onChange={(e) => setBookForm({ ...bookForm, checkInDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Check-Out Date</label>
                  <input
                    type="date"
                    required
                    value={bookForm.checkOutDate}
                    onChange={(e) => setBookForm({ ...bookForm, checkOutDate: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Seva Donation Amount (₹)</label>
                <input
                  type="number"
                  value={bookForm.donationAmount}
                  onChange={(e) => setBookForm({ ...bookForm, donationAmount: Number(e.target.value) })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Spiritual Sankalpa / Purpose of Stay</label>
                <input
                  type="text"
                  placeholder="e.g. Shrimad Bhagavatam Saptah Path & Narmada Snana"
                  value={bookForm.spiritualVow}
                  onChange={(e) => setBookForm({ ...bookForm, spiritualVow: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg transition-all cursor-pointer"
                >
                  Confirm & Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: DIGITAL STAY PASS VIEWER (SCAN-READY QR)
      ===================================================================== */}
      {activeStayPass && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setActiveStayPass(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              🕉️
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Official Ashram Digital Stay Pass
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {activeStayPass.roomNumber}
              </h3>
              <p className="text-xs text-amber-300 font-mono">
                {activeStayPass.passId}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={`SANATANI_STAY_PASS:${activeStayPass.passId}|${activeStayPass.roomNumber}|${activeStayPass.guestName}|${activeStayPass.checkInDate}|${activeStayPass.checkOutDate}`}
                size={160}
                level="H"
                fgColor="#1c1917"
              />
            </div>

            {/* Pass Metadata Grid */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-400">Devotee Pilgrim:</span>
                <span className="font-black text-amber-200">{activeStayPass.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Gotra & City:</span>
                <span className="text-stone-200">{activeStayPass.guestGotra} • {activeStayPass.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Schedule:</span>
                <span className="font-mono text-emerald-300">{activeStayPass.checkInDate} to {activeStayPass.checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Devotees:</span>
                <span className="font-bold text-stone-200">{activeStayPass.devoteesCount} Persons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Seva Dakshina:</span>
                <span className="font-bold text-amber-400">₹{activeStayPass.donationAmount}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  showToast('Dispatched stay pass to printer dialog.', 'info');
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Pass</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStayPass(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: SPONSOR FODDER (GRASS / CHOKAR)
      ===================================================================== */}
      {isFodderModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsFodderModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Pavitra Gau Seva • Kamadhenu Fodder Fund
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Sponsor Nutritious Fodder & Grass
              </h3>
              <p className="text-xs text-stone-400">
                {selectedCowForSeva
                  ? `Dedicated to ${selectedCowForSeva.name} (${selectedCowForSeva.breed})`
                  : 'Sanctuary Herd Shared Green Pasture Fund'}
              </p>
            </div>

            <form onSubmit={handleSponsorFodderSubmit} className="space-y-4 text-xs">
              {/* Preset Tier Pills */}
              <div>
                <label className="text-stone-300 font-bold block mb-2">Select Seva Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { amount: 501, label: '1 Day Green Grass', desc: 'Fresh Chari / Napier' },
                    { amount: 2100, label: '1 Week Chokar', desc: 'Bran & Jaggery Diet' },
                    { amount: 5100, label: '1 Month Full Diet', desc: 'Medicines & Pasture' },
                  ].map((tier) => (
                    <button
                      key={tier.amount}
                      type="button"
                      onClick={() => {
                        setFodderForm({ ...fodderForm, selectedTier: tier.amount, customAmount: '' });
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        fodderForm.selectedTier === tier.amount && !fodderForm.customAmount
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span className="text-sm font-black text-white block">₹{tier.amount}</span>
                      <span className="text-[11px] font-bold text-amber-400 block mt-0.5">{tier.label}</span>
                      <span className="text-[10px] text-stone-500 block">{tier.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Or Custom Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 11000"
                  value={fodderForm.customAmount}
                  onChange={(e) => setFodderForm({ ...fodderForm, customAmount: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Devotee Donor Name *</label>
                  <input
                    type="text"
                    required
                    value={fodderForm.donorName}
                    onChange={(e) => setFodderForm({ ...fodderForm, donorName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gotra (For Sankalpa)</label>
                  <input
                    type="text"
                    value={fodderForm.gotra}
                    onChange={(e) => setFodderForm({ ...fodderForm, gotra: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Occasion / Sankalpa</label>
                <input
                  type="text"
                  placeholder="e.g. Birthday, Pitru Moksha, Vivah Anniversary"
                  value={fodderForm.purpose}
                  onChange={(e) => setFodderForm({ ...fodderForm, purpose: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFodderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg transition-all cursor-pointer"
                >
                  Donate & Generate 80G Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADOPT COW MODAL
      ===================================================================== */}
      {isAdoptModalOpen && selectedCowForSeva && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAdoptModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Gau-Palan & Long-Term Seva
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Adopt {selectedCowForSeva.name}
              </h3>
              <p className="text-xs text-stone-400">
                Breed: {selectedCowForSeva.breed} • Ear Tag: {selectedCowForSeva.tagNumber || selectedCowForSeva.cowTagId}
              </p>
            </div>

            <form onSubmit={handleAdoptCowSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Devotee Guardian Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Raghavan Sharma"
                  value={adoptForm.sponsorName}
                  onChange={(e) => setAdoptForm({ ...adoptForm, sponsorName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    value={adoptForm.sponsorGotra}
                    onChange={(e) => setAdoptForm({ ...adoptForm, sponsorGotra: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={adoptForm.sponsorPhone}
                    onChange={(e) => setAdoptForm({ ...adoptForm, sponsorPhone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Monthly Care Sponsorship (₹)</label>
                <input
                  type="number"
                  value={adoptForm.monthlyCareFee}
                  onChange={(e) => setAdoptForm({ ...adoptForm, monthlyCareFee: Number(e.target.value) })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-[11px] text-stone-400">
                You will receive monthly photos, health checkup updates, and sacred Gomata milk prasad dispatch during festivals.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdoptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Confirm Adoption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: GAU SEVA E-RECEIPT (80G TAX EXEMPTION)
      ===================================================================== */}
      {gauReceipt && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-emerald-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setGauReceipt(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-stone-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              🐄
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Official Gau Seva 80G Tax Exemption Receipt
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                ₹{gauReceipt.amount.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                Receipt Ref: {gauReceipt.receiptNo}
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Devotee Donor:</span>
                <span className="font-black text-white">{gauReceipt.donorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Gotra:</span>
                <span className="text-stone-200">{gauReceipt.gotra}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Seva Purpose:</span>
                <span className="text-amber-300 font-medium">{gauReceipt.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Date:</span>
                <span className="font-mono text-stone-300">{gauReceipt.date}</span>
              </div>
              <p className="text-[10px] text-stone-500 pt-2 border-t border-stone-800/80">
                Eligible for Income Tax Deduction under Section 80G of the IT Act.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  showToast('Dispatched receipt to printer dialog.', 'info');
                }}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print 80G Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setGauReceipt(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: LOG SHLASTRIC EXAM SCORE (GURUKUL)
      ===================================================================== */}
      {isExamModalOpen && selectedStudentForExam && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Vedic Exam & Recitation Evaluation
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {selectedStudentForExam.studentName}
              </h3>
              <p className="text-xs text-stone-400">
                Roll No: {selectedStudentForExam.rollNo} • {selectedStudentForExam.courseLevel}
              </p>
            </div>

            <form onSubmit={handleSubmitExamScore} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Subject / Suktam Chanted *</label>
                <input
                  type="text"
                  required
                  value={examForm.subjectTitle}
                  onChange={(e) => setExamForm({ ...examForm, subjectTitle: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Score (out of 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={examForm.score}
                    onChange={(e) => setExamForm({ ...examForm, score: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Swara Shuddhi</label>
                  <select
                    value={examForm.swaraAccuracy}
                    onChange={(e) => setExamForm({ ...examForm, swaraAccuracy: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Uttama (Flawless)">Uttama (Flawless)</option>
                    <option value="Madhyama (Good)">Madhyama (Good)</option>
                    <option value="Abhyasa (Needs Practice)">Abhyasa (Needs Practice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Evaluating Acharya</label>
                <input
                  type="text"
                  required
                  value={examForm.examinerAcharya}
                  onChange={(e) => setExamForm({ ...examForm, examinerAcharya: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Acharya Remarks</label>
                <textarea
                  rows={2}
                  value={examForm.remarks}
                  onChange={(e) => setExamForm({ ...examForm, remarks: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save Exam Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: ENROLL NEW BRAHMACHARI (GURUKUL)
      ===================================================================== */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Vedic Pathashala Admission
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Enroll Brahmachari Vidyarthi
              </h3>
              <p className="text-xs text-stone-400">
                Register student in Sandipani Gurukul residential ledger
              </p>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chinmay Dixit"
                    value={enrollForm.studentName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, studentName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.rollNo}
                    onChange={(e) => setEnrollForm({ ...enrollForm, rollNo: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Course Level / Shakha</label>
                <select
                  value={enrollForm.courseLevel}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseLevel: e.target.value as any })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Prathama (Grammar)">Prathama (Sanskrit Grammar & Ashtadhyayi)</option>
                  <option value="Madhyama (Shastras)">Madhyama (Shastras & Suktas)</option>
                  <option value="Shastri (Philosophy)">Shastri (Philosophy & Karmakanda)</option>
                  <option value="Acharya (Vedanta)">Acharya (Vedanta & Ghana-patha)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Guardian Name</label>
                  <input
                    type="text"
                    placeholder="Father/Guardian Name"
                    value={enrollForm.guardianName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, guardianName: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Guardian Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={enrollForm.guardianPhone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, guardianPhone: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Complete Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 8: REGISTER NEW COW / CATTLE (GOSHALA)
      ===================================================================== */}
      {isAddCowModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setIsAddCowModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Indigenous Cattle Registry
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Register New Gomata / Nandi
              </h3>
            </div>

            <form onSubmit={handleAddNewCowSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={newCowForm.name}
                    onChange={(e) => setNewCowForm({ ...newCowForm, name: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Ear Tag ID</label>
                  <input
                    type="text"
                    required
                    value={newCowForm.tagNumber}
                    onChange={(e) => setNewCowForm({ ...newCowForm, tagNumber: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Desi Breed</label>
                  <select
                    value={newCowForm.breed}
                    onChange={(e) => setNewCowForm({ ...newCowForm, breed: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Gir">Gir (Gujarat)</option>
                    <option value="Sahiwal">Sahiwal (Punjab)</option>
                    <option value="Tharparkar">Tharparkar (Rajasthan)</option>
                    <option value="Rathi">Rathi</option>
                    <option value="Kankrej">Kankrej</option>
                    <option value="Red Sindhi">Red Sindhi</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Gender</label>
                  <select
                    value={newCowForm.gender}
                    onChange={(e) => setNewCowForm({ ...newCowForm, gender: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Gau Mata (Cow)">Gau Mata (Cow)</option>
                    <option value="Nandi (Bull)">Nandi (Bull)</option>
                    <option value="Vatsa (Calf)">Vatsa (Calf)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={newCowForm.ageYears}
                    onChange={(e) => setNewCowForm({ ...newCowForm, ageYears: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Lactation</label>
                  <select
                    value={newCowForm.lactationStage}
                    onChange={(e) => setNewCowForm({ ...newCowForm, lactationStage: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Lactating">Lactating</option>
                    <option value="Dry">Dry</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Calf">Calf</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Milk Yield (L)</label>
                  <input
                    type="number"
                    value={newCowForm.dailyMilkYieldLiters}
                    onChange={(e) => setNewCowForm({ ...newCowForm, dailyMilkYieldLiters: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCowModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Register Gomata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 9: ADD KUTIR ROOM TO INVENTORY (KUTIRS)
      ===================================================================== */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddRoomModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Property Inventory
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Add Kutir Room
              </h3>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">Room Number / Kutir Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kutir 105 (Narmada Kutir)"
                  value={newRoomForm.roomNumber}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, roomNumber: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Room Type</label>
                <select
                  value={newRoomForm.roomType}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, roomType: e.target.value as any })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Sadhana Kutir">Sadhana Kutir</option>
                  <option value="Dharamshala Deluxe">Dharamshala Deluxe</option>
                  <option value="Family Suite">Family Suite</option>
                  <option value="Dormitory Bed">Dormitory Bed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newRoomForm.capacity}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, capacity: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Donation / Day (₹)</label>
                  <input
                    type="number"
                    value={newRoomForm.suggestedDonationPerDay}
                    onChange={(e) => setNewRoomForm({ ...newRoomForm, suggestedDonationPerDay: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AshramGoshalaGurukulDesk;
