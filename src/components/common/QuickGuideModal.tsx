import React from 'react';
import { X, Lightbulb, Info, BookOpen, Compass, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose, activeModule }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  // Dictionary of quick guides per module
  const guides: Record<string, { title: string; description: string; steps: string[] }> = {
    'dashboard': {
      title: 'Command Center',
      description: 'The global view of your entire community operations.',
      steps: [
        'View top-level metrics for funds, active campaigns, and members.',
        'Monitor your Organization Resilience Score and personal Seva Karma.',
        'Use the Quick Action buttons to log donations or scan QR codes instantly.',
      ]
    },
    'dharamshala': {
      title: 'Yatri Niwas & Dharamshala',
      description: 'Manage room bookings, check-ins, and housekeeping for pilgrims.',
      steps: [
        'View real-time room statuses: Available, Occupied, Cleaning, or Maintenance.',
        'Click "New Booking" to check-in a devotee and assign a room.',
        'Update a room to "Cleaning" after checkout to notify housekeeping staff.',
      ]
    },
    'sevadarRoster': {
      title: 'Sevadar Shift Roster',
      description: 'Organize volunteer schedules and assign shifts for major events and daily operations.',
      steps: [
        'Select a date to view available volunteer shifts.',
        'Assign devotees to specific roles (e.g., Crowd Control, Prasadam Distribution).',
        'Volunteers earn Karma Points upon successful completion of their shift.',
      ]
    },
    'crisis-command': {
      title: 'Crisis Command Center',
      description: 'Global emergency response and mesh-network SOS monitoring.',
      steps: [
        'Monitor the live map for flashing red SOS beacons.',
        'Dispatch nearby volunteers or resources to the coordinates.',
        'Mark crises as "RESOLVED" to increase your Organization Resilience Score.',
      ]
    },
    'devotees': {
      title: 'Devotee & Member Directory',
      description: 'The central database of all connected members, followers, and volunteers.',
      steps: [
        'Search members by name, phone, or Gotra.',
        'Click on a member to view their full profile, donation history, and family tree.',
        'Generate Smart ID Passes for physical entry.'
      ]
    }
  };

  const defaultGuide = {
    title: t(activeModule) || 'Module Guide',
    description: 'Welcome to this module. Use this interface to manage community data securely.',
    steps: [
      'Use the top action bar to add new records or export data.',
      'Use the search bar to filter through lists instantly.',
      'Changes made here are synced in real-time across your organization.'
    ]
  };

  const currentGuide = guides[activeModule] || defaultGuide;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-6 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Lightbulb className="w-6 h-6 text-yellow-300" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Quick Guide</h2>
          </div>
          <h3 className="text-lg font-medium text-blue-100">{currentGuide.title}</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 font-medium mb-6 leading-relaxed">
            {currentGuide.description}
          </p>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">How to use this module</h4>
            {currentGuide.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
