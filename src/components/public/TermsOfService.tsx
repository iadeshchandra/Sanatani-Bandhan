import React from 'react';
import { createPortal } from 'react-dom';
import { X, Scale } from 'lucide-react';

export const TermsOfService: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-saffron-100 text-saffron-600 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Terms of Service</h2>
              <p className="text-sm font-medium text-slate-500">Effective Date: August 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-slate-900 prose-p:text-slate-600">
          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using the Sanatani Bandhan platform ("Service"), you agree to be bound by these Terms of Service. If you are accepting on behalf of a Trust, Mandir, Goshala, or other legal entity, you represent that you have the authority to bind that entity to these terms.
          </p>
          
          <h3>2. Description of Service</h3>
          <p>
            Sanatani Bandhan provides an Enterprise Resource Planning (ERP) platform designed specifically for Dharmic institutions. The Service includes modules for devotee management, treasury and donation tracking, event scheduling, and secure record-keeping. The Service is provided "as is" and we reserve the right to modify or discontinue features with reasonable notice.
          </p>

          <h3>3. User Accounts and Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your administrator credentials, including the Master PIN. You must immediately notify us of any unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to comply with this security obligation.
          </p>

          <h3>4. Acceptable Use Policy</h3>
          <p>
            The platform must be used exclusively for lawful administrative purposes related to your institution. You agree not to:
          </p>
          <ul>
            <li>Upload malicious code, viruses, or destructive cryptographic algorithms.</li>
            <li>Attempt to reverse engineer, decompile, or bypass the platform's security mechanisms.</li>
            <li>Use the platform to distribute unsolicited promotional material or spam.</li>
          </ul>

          <h3>5. Intellectual Property</h3>
          <p>
            The Sanatani Bandhan platform, including its codebase, design, architecture, and branding, remains the exclusive property of TrackIQ Academy. Your subscription grants you a revocable, non-exclusive license to use the software. You retain all rights and ownership to the data you input into the system.
          </p>

          <h3>6. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, Sanatani Bandhan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </p>
          
          <h3>7. Governing Law</h3>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Bharat (India). Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in New Delhi.
          </p>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl font-bold transition-all shadow-md">
            I Accept the Terms
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
