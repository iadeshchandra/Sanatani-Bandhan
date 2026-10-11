import React from 'react';
import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';

export const SecurityWhitepaper: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Security Architecture</h2>
              <p className="text-sm font-medium text-slate-500">Enterprise-Grade Protection for Dharmic Data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-slate-900 prose-p:text-slate-600">
          <h3>Architecture Overview</h3>
          <p>
            Sanatani Bandhan is engineered on a Zero-Trust security model. Our infrastructure is designed to protect sensitive temple management data, financial records, and devotee information against unauthorized access, data breaches, and service interruptions.
          </p>
          
          <h3>Data Encryption</h3>
          <ul>
            <li><strong>In Transit:</strong> All data transmitted between your devices and our cloud infrastructure is encrypted using TLS 1.3 with AES-256-GCM authenticated encryption.</li>
            <li><strong>At Rest:</strong> All databases, backups, and file storage volumes are encrypted at rest using AES-256. Cryptographic keys are managed via industry-standard Key Management Services (KMS) with automatic rotation.</li>
          </ul>

          <h3>Offline-First & Local Persistence</h3>
          <p>
            To accommodate temples in remote locations with unstable internet, our core engine utilizes an offline-first indexedDB architecture. Data is cryptographically signed locally before being synced to the cloud. This ensures that even if network connectivity is lost, your administration continues uninterrupted, and data integrity is mathematically guaranteed upon reconnection.
          </p>

          <h3>Identity & Access Management (IAM)</h3>
          <p>
            We implement strict Role-Based Access Control (RBAC). Workspaces define precise roles (Trustee, Head Priest, Treasurer, Sevadar). PIN-based contextual authentication is enforced for sensitive actions (e.g., modifying treasury records or deleting devotee profiles).
          </p>

          <h3>Infrastructure & Compliance</h3>
          <p>
            Our cloud infrastructure is hosted in ISO 27001, SOC 2 Type II, and PCI-DSS compliant data centers located entirely within Bharat (India) to comply with data localization requirements. We perform automated daily vulnerability scanning and contract third-party security firms for annual penetration testing.
          </p>

          <h3>Audit Logging</h3>
          <p>
            Every mutating action (create, update, delete) performed within the system generates an immutable, cryptographically verifiable audit log. This ensures total transparency for temple trustees and facilitates rapid forensic analysis if required.
          </p>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md">
            Acknowledge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
