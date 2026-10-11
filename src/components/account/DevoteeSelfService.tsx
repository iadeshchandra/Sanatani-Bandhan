import React, { useState, useRef, useEffect } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, verifyBeforeUpdateEmail, signInAnonymously } from 'firebase/auth';
import { Camera, Check, Shield, AlertCircle, Phone, Mail, User, HeartPulse, Sparkles, Save, X, Loader2, Calendar, FileText, Droplet, ShieldAlert } from 'lucide-react';
import { compressDevoteeAvatar } from '../../utils/imageCompression';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const DevoteeSelfService: React.FC = () => {
  const { currentDevotee, setCurrentDevotee } = useAuthWorkspace();
  const { updateDevotee } = useData();
  const { showToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SPIRITUAL' | 'MEDICAL'>('PERSONAL');
  
  const [formData, setFormData] = useState({
    fullName: currentDevotee?.fullName || currentDevotee?.name || '',
    phone: currentDevotee?.phone || '',
    email: currentDevotee?.email || '',
    address: currentDevotee?.address || '',
    panNumber: currentDevotee?.panNumber || '',
    birthDate: currentDevotee?.birthDate || '',
    anniversaryDate: currentDevotee?.anniversaryDate || '',
    
    spiritualName: currentDevotee?.spiritualName || '',
    gotra: currentDevotee?.gotra || '',
    pravara: currentDevotee?.pravara || '',
    kuladevata: currentDevotee?.kuladevata || '',
    varnaKul: currentDevotee?.varnaKul || '',
    dikshaGuru: currentDevotee?.dikshaGuru || '',
    dikshaDate: currentDevotee?.dikshaDate || '',
    
    emergencyContact: currentDevotee?.emergencyContact || '',
    emergencyPhone: currentDevotee?.emergencyPhone || '',
    bloodGroup: currentDevotee?.bloodGroup || '',
    medicalNotes: currentDevotee?.medicalNotes || '',
    
    avatarUrl: currentDevotee?.avatarUrl || currentDevotee?.photoUrl || '',
  });

  const [phoneVerified, setPhoneVerified] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  const [emailVerified, setEmailVerified] = useState(true);
  const [verificationLinkSent, setVerificationLinkSent] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: e.target.value });
    setPhoneVerified(e.target.value === currentDevotee?.phone);
    setOtpSent(false);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value });
    setEmailVerified(e.target.value === currentDevotee?.email);
    setVerificationLinkSent(false);
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const sendOtp = async () => {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }
    try {
      setupRecaptcha();
      const formattedPhone = formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      showToast('OTP sent successfully', 'success');
    } catch (error: any) {
      showToast('Failed to send OTP: ' + error.message, 'error');
    }
  };

  const verifyOtp = async () => {
    try {
      await confirmationResult.confirm(otpCode);
      setPhoneVerified(true);
      setOtpSent(false);
      showToast('Phone verified successfully', 'success');
    } catch (error: any) {
      showToast('Invalid OTP', 'error');
    }
  };

  const sendEmailLink = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast('Invalid email format', 'error');
      return;
    }
    try {
      let user = auth.currentUser;
      if (!user) {
        throw new Error("Please log in properly before updating email.");
      }
      await verifyBeforeUpdateEmail(user, formData.email);
      setVerificationLinkSent(true);
      showToast('Verification link sent. Please check your email.', 'success');
      
      const poll = setInterval(async () => {
        await user?.reload();
        if (user?.email === formData.email && user?.emailVerified) {
          setEmailVerified(true);
          clearInterval(poll);
          showToast('Email verified successfully!', 'success');
        }
      }, 3000);
    } catch (error: any) {
      showToast('Failed to send verification link: ' + error.message, 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }
    
    setPendingPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!phoneVerified) {
      showToast('Please verify your new phone number', 'error');
      return;
    }
    if (!emailVerified) {
      showToast('Please verify your new email address', 'error');
      return;
    }
    if (formData.phone.length < 10) {
      showToast('Invalid phone number format', 'error');
      return;
    }
    if (!formData.fullName.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    
    try {
      setIsUploading(true);
      let finalAvatarUrl = formData.avatarUrl;
      
      if (pendingPhotoFile) {
        showToast('Optimizing and saving photo...', 'info');
        finalAvatarUrl = await compressDevoteeAvatar(pendingPhotoFile);
      }
      
      const updatePayload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        panNumber: formData.panNumber,
        birthDate: formData.birthDate,
        anniversaryDate: formData.anniversaryDate,
        spiritualName: formData.spiritualName.trim(),
        gotra: formData.gotra,
        pravara: formData.pravara,
        kuladevata: formData.kuladevata,
        varnaKul: formData.varnaKul,
        dikshaGuru: formData.dikshaGuru,
        dikshaDate: formData.dikshaDate,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        bloodGroup: formData.bloodGroup,
        medicalNotes: formData.medicalNotes,
        avatarUrl: finalAvatarUrl,
        updatedAt: new Date().toISOString()
      };
      
      const devoteeRef = doc(db, 'devotees', currentDevotee!.id);
      await updateDoc(devoteeRef, updatePayload);
      
      await addDoc(collection(db, 'audit_logs'), {
        action: 'PROFILE_UPDATED',
        devoteeId: currentDevotee!.id,
        devoteeName: formData.fullName || 'Unknown',
        timestamp: new Date().toISOString(),
        changes: updatePayload
      });
      
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
      setPendingPhotoFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
      
      if (setCurrentDevotee) {
         setCurrentDevotee({ ...currentDevotee!, ...updatePayload });
      }
      if (updateDevotee) {
         updateDevotee(currentDevotee!.id, updatePayload);
      }
    } catch (error: any) {
      showToast('Failed to update profile: ' + error.message, 'error');
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      fullName: currentDevotee?.fullName || currentDevotee?.name || '',
      phone: currentDevotee?.phone || '',
      email: currentDevotee?.email || '',
      address: currentDevotee?.address || '',
      panNumber: currentDevotee?.panNumber || '',
      birthDate: currentDevotee?.birthDate || '',
      anniversaryDate: currentDevotee?.anniversaryDate || '',
      spiritualName: currentDevotee?.spiritualName || '',
      gotra: currentDevotee?.gotra || '',
      pravara: currentDevotee?.pravara || '',
      kuladevata: currentDevotee?.kuladevata || '',
      varnaKul: currentDevotee?.varnaKul || '',
      dikshaGuru: currentDevotee?.dikshaGuru || '',
      dikshaDate: currentDevotee?.dikshaDate || '',
      emergencyContact: currentDevotee?.emergencyContact || '',
      emergencyPhone: currentDevotee?.emergencyPhone || '',
      bloodGroup: currentDevotee?.bloodGroup || '',
      medicalNotes: currentDevotee?.medicalNotes || '',
      avatarUrl: currentDevotee?.avatarUrl || currentDevotee?.photoUrl || '',
    });
    setPhoneVerified(true);
    setEmailVerified(true);
    setPendingPhotoFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-temple-100 overflow-hidden flex flex-col h-full">
      <div id="recaptcha-container"></div>
      
      {/* Header section with gradient */}
      <div className="bg-gradient-to-r from-temple-900 to-temple-800 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="relative z-10 flex gap-6 items-center">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-temple-100 border-4 border-temple-700 shadow-xl overflow-hidden flex items-center justify-center">
              {previewUrl || formData.avatarUrl ? (
                <img src={previewUrl || formData.avatarUrl || undefined} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-temple-400" />
              )}
            </div>
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-3 -right-3 p-2.5 bg-saffron-500 hover:bg-saffron-400 text-temple-900 rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
          
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-saffron-50">
              {formData.fullName || "Your Profile"}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 bg-white/10 text-saffron-300 text-xs font-bold uppercase tracking-widest rounded-lg border border-white/10">
                {currentDevotee?.sevaTier || 'Member'}
              </span>
              <span className="text-sm font-medium text-temple-400">
                Joined {currentDevotee?.joinedDate || 'Recently'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all backdrop-blur-sm border border-white/10">
              <User className="w-4 h-4" /> Edit Profile
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={handleCancel} className="flex items-center justify-center gap-2 bg-temple-700 hover:bg-temple-600 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-400 px-5 py-3 rounded-xl text-sm font-bold text-temple-900 shadow-lg shadow-saffron-500/20 transition-all">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-temple-100 px-2 sm:px-4 pt-2 bg-temple-50/50 overflow-x-auto scrollbar-hide">
        {[
          { id: 'PERSONAL', label: 'Personal Details', icon: User },
          { id: 'SPIRITUAL', label: 'Spiritual Profile', icon: Sparkles },
          { id: 'MEDICAL', label: 'Medical & Emergency', icon: HeartPulse },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-saffron-500 text-saffron-700 bg-white rounded-t-xl' 
                : 'border-transparent text-temple-500 hover:text-temple-700 hover:bg-temple-100/50 rounded-t-xl'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'PERSONAL' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Full Legal Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white disabled:opacity-60 transition-all"
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> PAN Number (For 80G)
                </label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  disabled={!isEditing}
                  maxLength={10}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white disabled:opacity-60 transition-all uppercase"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 bg-temple-50 border rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all ${!phoneVerified && isEditing ? 'border-rose-300' : 'border-temple-200'}`}
                    placeholder="10 digit mobile"
                  />
                  {isEditing && !phoneVerified && !otpSent && (
                    <button onClick={sendOtp} className="px-5 py-3 bg-temple-900 hover:bg-temple-800 text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm">
                      Verify
                    </button>
                  )}
                  {isEditing && phoneVerified && formData.phone && (
                    <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
                {otpSent && (
                  <div className="flex gap-2 mt-2 p-3 bg-temple-50 rounded-xl border border-temple-200 animate-in fade-in">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-temple-200 rounded-lg text-sm font-bold tracking-widest text-center"
                      placeholder="XXXXXX"
                    />
                    <button onClick={verifyOtp} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shrink-0 transition-colors">
                      Confirm
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 bg-temple-50 border rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all ${!emailVerified && isEditing ? 'border-saffron-300' : 'border-temple-200'}`}
                    placeholder="email@example.com"
                  />
                  {isEditing && !emailVerified && !verificationLinkSent && formData.email && (
                    <button onClick={sendEmailLink} className="px-5 py-3 bg-temple-900 hover:bg-temple-800 text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm">
                      Verify
                    </button>
                  )}
                  {isEditing && emailVerified && formData.email && (
                    <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
                {verificationLinkSent && !emailVerified && (
                  <p className="text-xs text-saffron-600 mt-2 flex items-center gap-1.5 bg-saffron-50 px-3 py-2 rounded-lg font-medium">
                    <AlertCircle className="w-4 h-4" /> Waiting for email confirmation...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Birth Date
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white disabled:opacity-60 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Anniversary
                </label>
                <input
                  type="date"
                  value={formData.anniversaryDate}
                  onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Full Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white disabled:opacity-60 transition-all resize-none"
                placeholder="Street Address, City, State, Pincode"
              />
            </div>
          </div>
        )}

        {activeTab === 'SPIRITUAL' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-saffron-50 border border-saffron-100 p-5 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-saffron-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-saffron-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-saffron-900">Vedic & Spiritual Identity</h4>
                <p className="text-xs text-saffron-700/80 mt-1 font-medium leading-relaxed">
                  These details help our Purohits perform sankalp and rituals accurately on your behalf.
                  Your spiritual name will also be reflected across the community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Spiritual / Diksha Name</label>
                <input
                  type="text"
                  value={formData.spiritualName}
                  onChange={(e) => setFormData({ ...formData, spiritualName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="E.g. Hari Dasa"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Varna / Kul</label>
                <input
                  type="text"
                  value={formData.varnaKul}
                  onChange={(e) => setFormData({ ...formData, varnaKul: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Gotra</label>
                <input
                  type="text"
                  value={formData.gotra}
                  onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="Kashyapa, Bharadwaja..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Pravara</label>
                <input
                  type="text"
                  value={formData.pravara}
                  onChange={(e) => setFormData({ ...formData, pravara: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Kuladevata / Ishta Devata</label>
                <input
                  type="text"
                  value={formData.kuladevata}
                  onChange={(e) => setFormData({ ...formData, kuladevata: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="Family Deity"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Diksha Guru</label>
                <input
                  type="text"
                  value={formData.dikshaGuru}
                  onChange={(e) => setFormData({ ...formData, dikshaGuru: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="Name of Guru"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest">Diksha Date</label>
                <input
                  type="date"
                  value={formData.dikshaDate}
                  onChange={(e) => setFormData({ ...formData, dikshaDate: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MEDICAL' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="Relative or friend name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Emergency Phone
                </label>
                <input
                  type="text"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                  placeholder="10 digit mobile"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <Droplet className="w-3.5 h-3.5" /> Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all"
                >
                  <option value="">Select...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-temple-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Medical Notes / Allergies
                </label>
                <textarea
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-4 py-3 bg-temple-50 border border-temple-200 rounded-xl text-sm font-semibold text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 disabled:opacity-60 transition-all resize-none"
                  placeholder="Any known allergies, chronic conditions, or medications"
                />
              </div>
            </div>
            
            <div className="bg-temple-50 border border-temple-100 p-5 rounded-2xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-temple-200 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-temple-500" />
              </div>
              <div>
                <h4 className="text-sm font-black text-temple-900">Privacy Notice</h4>
                <p className="text-xs text-temple-500 mt-1 font-medium leading-relaxed">
                  Medical and emergency contact information is securely stored and only accessible by authorized
                  sevadars or medical responders in case of an emergency at the temple premises.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
