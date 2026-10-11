import { TelemetryEventLog, WorkspaceType, UserRole } from '../types';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

// In-memory telemetry log buffer for on-screen debug & transparency
const telemetryLogBuffer: TelemetryEventLog[] = [];
type TelemetryListener = (logs: TelemetryEventLog[]) => void;
const listeners: Set<TelemetryListener> = new Set();

export const subscribeTelemetry = (listener: TelemetryListener) => {
  listeners.add(listener);
  listener([...telemetryLogBuffer]);
  return () => {
    listeners.delete(listener);
  };
};

export const pushToDataLayer = (eventName: string, payload: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    const eventObject = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    window.dataLayer.push(eventObject);

    // Save to local debug queue
    const logItem: TelemetryEventLog = {
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      event: eventName,
      payload,
    };
    telemetryLogBuffer.unshift(logItem);
    if (telemetryLogBuffer.length > 50) telemetryLogBuffer.pop();

    listeners.forEach((fn) => fn([...telemetryLogBuffer]));
    console.log(`[GA4 DataLayer] ${eventName}:`, payload);
  }
};

/**
 * GA4 Recommended Event: purchase (Monetization & Treasury)
 */
export const trackTreasuryPurchase = (params: {
  transactionId: string;
  value: number;
  currency: string;
  category: string;
  handledBy: string;
  paymentMode: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
  userRole: UserRole;
}) => {
  pushToDataLayer('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency || 'INR',
    items: [
      {
        item_id: params.category.toLowerCase().replace(/\s+/g, '_'),
        item_name: params.category,
        item_category: params.workspaceType,
        price: params.value,
        quantity: 1,
      },
    ],
    affiliation: `${params.workspaceType}_${params.workspaceId}`,
    handled_by: params.handledBy,
    payment_mode: params.paymentMode,
    user_role: params.userRole,
  });
};

/**
 * GA4 Recommended Event: generate_lead (Guest/Visitor pipeline)
 */
export const trackGenerateLead = (params: {
  leadName: string;
  purpose: string;
  city: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
}) => {
  pushToDataLayer('generate_lead', {
    lead_type: params.purpose,
    lead_city: params.city,
    workspace_type: params.workspaceType,
    workspace_id: params.workspaceId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GA4 Recommended Event: sign_up (New Member / Devotee registration)
 */
export const trackSignUp = (params: {
  memberId: string;
  gotra: string;
  sevaTier: string;
  workspaceType: WorkspaceType;
  workspaceId: string;
}) => {
  pushToDataLayer('sign_up', {
    method: 'Sanatani_Identity_PIN',
    member_id: params.memberId,
    gotra: params.gotra,
    seva_tier: params.sevaTier,
    workspace_type: params.workspaceType,
    workspace_id: params.workspaceId,
  });
};

/**
 * GA4 Recommended Event: share (Panjika passes, Shloka cards, Utsav invites)
 */
export const trackShare = (params: {
  contentType: string;
  itemId: string;
  method: 'WhatsApp' | 'PDF' | 'Copy_Link' | 'System_Share';
  workspaceId?: string;
}) => {
  pushToDataLayer('share', {
    content_type: params.contentType,
    item_id: params.itemId,
    method: params.method,
    workspace_id: params.workspaceId,
  });
};

/**
 * GA4 Recommended Event: view_item (Browsing Pooja catalog, Shradh dates, Goshala)
 */
export const trackViewItem = (params: {
  itemId: string;
  itemName: string;
  itemCategory: string;
}) => {
  pushToDataLayer('view_item', {
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        item_category: params.itemCategory,
      },
    ],
  });
};

export const getTelemetryLogs = () => [...telemetryLogBuffer];
export const clearTelemetryLogs = () => {
  telemetryLogBuffer.length = 0;
  listeners.forEach((fn) => fn([]));
};
