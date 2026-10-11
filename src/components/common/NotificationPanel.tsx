import React, { useEffect, useState } from 'react';
import { X, Bell, Check, Flame, Shield, Trash2, Filter } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

type TabType = 'All' | 'Alerts' | 'Tasks' | 'System';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  isOpen, 
  onClose, 
  theme = 'light' 
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>('All');

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  
  const bgPanel = isDark ? 'bg-temple-900 border-temple-800' : 'bg-white border-temple-200';
  const textHeader = isDark ? 'text-white' : 'text-temple-900';
  const textSub = isDark ? 'text-temple-400' : 'text-temple-500';
  const bgItemHover = isDark ? 'hover:bg-temple-800' : 'hover:bg-temple-50';
  const borderItem = isDark ? 'border-temple-800/50' : 'border-temple-100';
  const bgUnread = isDark ? 'bg-saffron-500/10' : 'bg-saffron-50/50';
  const textTitleUnread = isDark ? 'text-white' : 'text-temple-900';
  const textTitleRead = isDark ? 'text-temple-300' : 'text-temple-700';

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Alerts') return notification.type === 'warning' || notification.type === 'error';
    if (activeTab === 'Tasks') return notification.type === 'success'; // Tasks/Completed actions mapping
    if (activeTab === 'System') return notification.type === 'info';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-temple-900/40 backdrop-blur-sm animate-in fade-in transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className={`relative w-full sm:w-[400px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l ${bgPanel}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${borderItem}`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 ${isDark ? 'text-temple-300' : 'text-temple-700'}`} />
            <h2 className={`text-lg font-black ${textHeader}`}>Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-saffron-500 text-temple-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-temple-800 text-temple-400' : 'hover:bg-temple-100 text-temple-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className={`flex items-center px-4 sm:px-5 pt-2 border-b ${borderItem}`}>
          {(['All', 'Alerts', 'Tasks', 'System'] as TabType[]).map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab
                  ? isDark ? 'border-saffron-500 text-saffron-500' : 'border-saffron-600 text-saffron-600'
                  : isDark ? 'border-transparent text-temple-400 hover:text-temple-300' : 'border-transparent text-temple-500 hover:text-temple-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Actions (Mark all read / Clear) */}
        {filteredNotifications.length > 0 && (
          <div className={`flex items-center justify-between px-4 py-2 sm:px-5 sm:py-3 border-b ${borderItem} bg-temple-500/5`}>
            <button 
              onClick={markAllAsRead}
              className={`text-xs font-bold hover:underline ${isDark ? 'text-saffron-500' : 'text-saffron-600'}`}
            >
              Mark all as read
            </button>
            <button 
              onClick={clearAll}
              className={`text-xs font-bold hover:underline flex items-center gap-1 ${textSub}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${textSub}`}>
              {activeTab === 'All' ? <Bell className="w-12 h-12 mb-4 opacity-20" /> : <Filter className="w-12 h-12 mb-4 opacity-20" />}
              <p className="font-medium text-sm">
                {activeTab === 'All' ? "You're all caught up!" : `No ${activeTab.toLowerCase()} notifications`}
              </p>
              <p className="text-xs mt-1 opacity-70">
                {activeTab === 'All' ? "No new notifications at the moment." : "Check back later for updates."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((notification, idx) => (
                <div 
                  key={`${notification.id}-${idx}`}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 sm:p-5 border-b cursor-pointer transition-colors ${borderItem} ${bgItemHover} ${!notification.isRead ? bgUnread : ''}`}
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="shrink-0 mt-0.5">
                      {notification.type === 'info' && <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Bell className="w-4 h-4" /></div>}
                      {notification.type === 'success' && <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500"><Check className="w-4 h-4" /></div>}
                      {notification.type === 'warning' && <div className="p-2 rounded-full bg-saffron-500/10 text-saffron-500"><Flame className="w-4 h-4" /></div>}
                      {notification.type === 'error' && <div className="p-2 rounded-full bg-red-500/10 text-red-500"><Shield className="w-4 h-4" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-bold ' + textTitleUnread : 'font-medium ' + textTitleRead}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 leading-relaxed ${textSub}`}>
                        {notification.message}
                      </p>
                      <p className={`text-[10px] mt-2 font-medium ${isDark ? 'text-temple-500' : 'text-temple-400'}`}>
                        {new Date(notification.timestamp).toLocaleDateString()} • {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="shrink-0">
                        <div className="w-2.5 h-2.5 bg-saffron-500 rounded-full mt-2 shadow-sm" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
