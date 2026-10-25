import React from 'react';
import { OfflineSevakStatus } from './common/OfflineSevakStatus';

/**
 * OfflineIndicator — the app-wide floating offline pill.
 *
 * VIBE B2: this mount point now renders the ONE shared offline
 * component (OfflineSevakStatus, pill variant) fed by the canonical
 * outbox (services/OfflineSyncManager). It replaces the old indicator
 * that (a) spoke in hard-coded English, (b) shouted in rose-red
 * outside any SOS, and (c) counted a legacy queue
 * (services/offlineSyncService) that no producer in the app writes to,
 * so its "pending" number could never describe real work. The sevak
 * vocabulary — offline pill, "Saved on this phone (n)", "All sent" —
 * now lives in exactly one place and one voice.
 */
export const OfflineIndicator: React.FC = () => <OfflineSevakStatus variant="pill" />;

export default OfflineIndicator;
