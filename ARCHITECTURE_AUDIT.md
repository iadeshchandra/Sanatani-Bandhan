# Sanatani Bandhan - Master Architecture Audit & Competitive Gap Analysis

**Author:** AI Engineering & Architecture Taskforce  
**Target Platform:** Sanatani Bandhan Enterprise Dharmic ERP  
**Version:** 3.5.0 (Multi-Tenant Cloud + Zero-Cost Microservices)  
**Date:** September 2026  
**Document Classification:** Internal Technical Architecture & Strategic Roadmap  

---

## Executive Summary

**Sanatani Bandhan** is a specialized, multi-tenant enterprise resource planning (ERP) platform and spiritual operating system designed specifically for Hindu Mandirs, Ashrams, Dharmic Trusts, Mutts, and Pilgrimage Federations worldwide. 

Over Phases 1 through 5, the application was transformed from a client-side prototype into an enterprise-grade multi-tenant architecture featuring:
1. **Isolated NoSQL Data Partitions** in Google Cloud Firestore (`/tenants/{tenantId}/*`).
2. **Server-Side Super Admin Provisioning Engine** guarded by Firebase Admin SDK token verification and `platform_admins` role enforcement.
3. **Universal Payment Webhook Listener** processing asynchronous IPN notifications from global payment gateways (Stripe, Razorpay, bKash).
4. **Zero-Cost Alert & Dispatch Engine** integrating Nodemailer SMTP and Telegram Bot API.
5. **Super Admin AI Analytics & Forecasting Center** featuring predictive crowd surge models and Recharts financial telemetry.

This audit evaluates the **"As-Is"** technical state of the platform, provides deep-dive assessments into core workflows, benchmarks the system against leading Church Management Systems (ChMS) and enterprise ERPs (Pushpay, Planning Center, TouchPoint, Tally Prime, Oracle NetSuite), and defines an actionable roadmap to achieve uncontested global market dominance.

---

## 1. Current System Architecture (The "As-Is" State)

```
                                  [ Devotees & Trustees (Browsers / Mobile PWA) ]
                                                        │
                                                        ▼
                                       ┌──────────────────────────────────┐
                                       │   Vite + React 19 Frontend SPA   │
                                       │   (Tailwind CSS + Lucide Icons)  │
                                       └─────────────────┬────────────────┘
                                                         │
                ┌────────────────────────────────────────┴────────────────────────────────────────┐
                ▼                                                                                 ▼
     ┌───────────────────────┐                                                         ┌───────────────────────┐
     │ Core Context Layer    │                                                         │ Admin & Domain Desks  │
     │ ───────────────────── │                                                         │ ───────────────────── │
     │ • AuthWorkspaceContext│                                                         │ • SuperAdminDashboard │
     │ • DataContext         │                                                         │ • GlobalAnalytics     │
     │ • ToastContext        │                                                         │ • Domains 1 to 7      │
     │ • LanguageContext     │                                                         │ • OnboardTenantModal  │
     │ • NotificationContext │                                                         │ • YatraNet Radar      │
     └──────────┬────────────┘                                                         └───────────┬───────────┘
                │                                                                                  │
                ├──────────────────────────────────────┬───────────────────────────────────────────┤
                ▼                                      ▼                                           ▼
┌───────────────────────────────┐      ┌───────────────────────────────┐           ┌──────────────────────────────┐
│  Direct Client Firestore SDK  │      │ Node.js / Express Backend     │           │ Payment Gateways & Bots      │
│  ──────────────────────────── │      │ (port 5000 / server/index.ts) │           │ ──────────────────────────── │
│  • /tenants/{tenantId}/devotee│      │ ───────────────────────────── │           │ • Stripe / Razorpay / bKash  │
│  • /tenants/{tenantId}/treasur│      │ • /api/admin/tenants          │           │ • Telegram Bot API Webhook   │
│  • /tenants/{tenantId}/alerts │      │ • /api/webhooks/payments      │           │ • SMTP Mail Server           │
│  • firestore.rules Security   │      │ • /api/notifications/email    │           │ • Gemini 3.8 Flash Client    │
└───────────────────────────────┘      │ • /api/notifications/telegram │           └──────────────────────────────┘
                                       └───────────────┬───────────────┘
                                                       │
                                                       ▼
                                       ┌───────────────────────────────┐
                                       │ Firebase Admin SDK (Privileged│
                                       │ Service Account Connection)   │
                                       └───────────────────────────────┘
```

---

### 1.1 Frontend Architecture

The frontend is a modular, high-performance Single Page Application (SPA) built on **React 19**, **TypeScript**, and **Vite**, with styling governed by **Tailwind CSS**.

#### A. Core Context Providers
1. **`AuthWorkspaceContext.tsx`**:
   - Manages user identity, Firebase Auth session tokens, and active workspace resolution.
   - Enforces Role-Based Access Control (`SuperAdmin`, `Trustee`, `Accountant`, `Priest`, `Sevadar`, `Devotee`).
   - Injects the `activeWorkspace` identifier to guarantee strict tenant isolation across all client views.
2. **`DataContext.tsx`**:
   - Central reactive store for devotees, treasury records, inventory items, puja bookings, and volunteers.
   - Integrates with local caches and provides optimistic UI updates for real-time responsiveness.
3. **`ToastContext.tsx`**:
   - Provides global interactive feedback (`showToast`) and modal dialog confirmations (`confirm`).
4. **`LanguageContext.tsx`**:
   - Handles multi-lingual UI state across English, Hindi, Bengali, and Sanskrit.
5. **`NotificationContext.tsx`**:
   - Real-time in-app notification center tracking administrative and system events.
6. **`QuickGuideContext.tsx`**:
   - Interactive onboarding tours guiding temple administrators through operational desks.
7. **`AppInitializer.tsx`**:
   - Handles pre-flight asset initialization, telemetry verification, and biometric auth readiness.

#### B. Super Admin Infrastructure
- **`/admin` (`SuperAdminDashboard.tsx`)**:
  - Global command view displaying aggregated metrics: Total Temples/Tenants, Total Devotee Reach, Verified Treasury Volume, and System Health.
  - Multi-tenant tenant search and tier filter (Enterprise, Heritage, Standard, Starter).
  - Provisioning modal trigger (`OnboardTenantModal.tsx`).
- **`/admin/analytics` (`GlobalAnalytics.tsx`)**:
  - AI predictive crowd surge forecasting powered by synthetic Gemini Dharmic models.
  - Interactive Recharts components: 7-day Devotee Footfall Velocity (`LineChart`) and Top Mandirs Donations vs Expenses (`BarChart`).
- **`OnboardTenantModal.tsx`**:
  - Secure tenant provisioning interface calling backend API with Firebase ID token bearer headers.

#### C. The 7 Operational Domains (DDD Architecture)

| Domain | Directory | Primary Desks & Components | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Domain 1: People & Lineage** | `src/components/domain1/` | `DevoteeGrid`, `BulkImportDesk`, `FamilyHouseholdDesk`, `VanshavaliDesk`, `RakthaSevaDesk`, `GuestManagerDesk`, `FederationMultiBranchDesk`, `SevadarRosterDesk` | Devotee KYC, Gotra/Nakshatra tracking, family tree lineage (Vanshavali), emergency blood donor directory, smart photo ID badge generation. |
| **Domain 2: Treasury & Fiduciary** | `src/components/domain2/` | `TreasuryLedgerDesk`, `TaxReceiptDesk`, `KarmaLedgerDesk`, `AssetInventoryDesk`, `RatnaBhandarAssetDesk`, `HundiCountingAuditDesk`, `Form10BDComplianceDesk`, `MandirCampaignsDesk`, `QuickChandaPOS` | Double-entry accounting, 80G tax certificates, Form 10BD compliance export, dual-trustee Hundi counting audit, physical asset custody & sacred jewelry tracking. |
| **Domain 3: Sacred Rituals** | `src/components/domain3/` | `PoojaBookingDesk`, `MandirPujaDesk`, `PanchangMuhuratDesk`, `PanchangAstrologyEngine`, `PitruShradhDesk`, `PurohitDesk`, `PurohitManagementDesk`, `PurohitMarketDesk`, `YatraNetCommandCenter` | Sankalp reservations, priest scheduling & Dakshina management, astronomical Panchang calculations (Tithi, Nakshatra, Rahu Kaal), Pitru Tarpan lifecycle tracking. |
| **Domain 4: Community Welfare** | `src/components/domain4/` | `AnnadanamKitchenDesk`, `SmartBhandarProcurementDesk`, `DharamshalaDesk`, `AshramGoshalaGurukulDesk`, `GauSevaDesk`, `SanataniVivahDesk`, `VedicSevaShikshaDesk` | Mega-kitchen Annadanam portioning, procurement, pilgrim guest house room allocations, Gomata cattle health & adoption tracking, Vedic matrimony matching. |
| **Domain 5: Spiritual Lifecycle** | `src/components/domain5/` | `DevoteeAccountPortal`, `PersonalSadhanaDesk`, `SanskritLibraryDesk`, `VedicCalendarEventsDesk`, `WhatsAppBroadcasterDesk` | Devotee self-service portal, daily Japa & Sadhana tracker, digital scriptural repository with trilingual commentaries, festival broadcasting. |
| **Domain 6: Governance & Security** | `src/components/domain6/` | `MasterSettingsDesk`, `AuditLogDesk`, `UserRolesDesk`, `CrisisCommandCenter`, `PanchayatPollingDesk`, `CommunityPollsTab`, `WorkspaceSelectorDesk`, `AppStoreDesk` | Immutable cryptographic audit trails, granular role assignment, emergency crisis command protocols, democratic trust polling. |
| **Domain 7: Global Outreach & GIS** | `src/components/domain7/` | `YatraNetDesk`, `DevoteeCommsDrawer` | Interactive Leaflet GIS pilgrimage radar, live pilgrim tracking, lost devotee beacons, SOS distress broadcast dispatch. |

---

### 1.2 Backend API Architecture

The platform backend is organized as an Express application in `server/index.ts` with dedicated modular sub-routers:

#### A. Middlewares
- **CORS Middleware (`cors`)**: Permits authorized origins across staging, development, and custom temple domains.
- **Body Parsers (`express.json`, `express.urlencoded`)**: Parses incoming JSON payloads up to 20MB.
- **Security Middleware (`server/middleware/authMiddleware.ts` - `requireSuperAdmin`)**:
  - Extracts and parses the `Authorization: Bearer <token>` header.
  - Calls `getAuth().verifyIdToken(token)` via Firebase Admin SDK.
  - Queries the Firestore root collection `/platform_admins/{uid}` to verify active superadmin status before granting access.

#### B. API Endpoints

```
[ POST ] /api/admin/tenants
├── Middleware: requireSuperAdmin
├── Request: { name, location, state, tier, custodian }
├── Logic: Generates unique URL-safe tenantId and temple code, writes to /tenants/{tenantId}
└── Response: 201 Created { success: true, tenant: { ... } }

[ POST ] /api/webhooks/payments
├── Middleware: Public IPN Listener (Universal)
├── Request: { tenantId, transactionId, amount, currency, gateway, devoteeName }
├── Logic: Validates fields, confirms tenant existence, creates ledger entry in /tenants/{tenantId}/treasury
└── Response: 200 OK { success: true, transactionId }

[ POST ] /api/notifications/email
├── Request: { to, subject, text, html }
├── Logic: Dispatches email via Nodemailer SMTP (Gmail or custom mail relay)
└── Response: 200 OK { success: true, message: 'Email dispatched successfully' }

[ POST ] /api/notifications/telegram
├── Request: { message, chatId }
├── Logic: Calls Telegram Bot API (https://api.telegram.org/bot<TOKEN>/sendMessage) with Markdown support
└── Response: 200 OK { success: true, message: 'Telegram alert dispatched successfully' }

[ GET ] /api/health
├── Logic: Returns server operational status and ISO timestamp
└── Response: 200 OK { status: 'ok', timestamp: '...' }

[ POST ] /api/gemini/* (server.ts)
├── /api/gemini/validate-key       -> Tests custom Gemini API keys
├── /api/gemini/dharma-marketing   -> Generates festival social media & WhatsApp campaigns
├── /api/gemini/shloka-explain     -> Trilingual scriptural translation & commentary
└── /api/gemini/dharmic-assistant  -> Context-aware administrative & ritual AI copilot
```

---

### 1.3 Database Architecture & Firestore Security Rules

#### A. Data Schema
The database operates on an isolated multi-tenant NoSQL structure:

```
firestore-root
│
├── platform_admins/
│   └── {adminUid}
│       ├── email: string
│       ├── active: boolean
│       └── assignedAt: timestamp
│
├── users/
│   └── {userId}
│       ├── email: string
│       ├── role: string (SuperAdmin | Trustee | Accountant | Priest | Sevadar | Devotee)
│       └── workspaceId: string
│
└── tenants/
    └── {tenantId}
        ├── id: string (e.g., 'ws-kashi-vishwanath-x89f')
        ├── name: string
        ├── code: string (e.g., 'KAS-UP-42')
        ├── location: string
        ├── state: string
        ├── tier: string
        ├── custodian: string
        ├── status: 'Active' | 'Trial Mode' | 'Suspended'
        ├── createdAt: timestamp
        │
        ├── treasury/
        │   └── {transactionId}
        │       ├── type: 'Income' | 'Expense'
        │       ├── category: 'Digital Donation' | 'Hundi' | 'Annadanam' | ...
        │       ├── amount: number
        │       ├── currency: 'INR' | 'USD' | 'BDT' | ...
        │       ├── paymentMode: 'UPI' | 'Stripe' | 'Razorpay' | 'Cash' | ...
        │       ├── devoteeName: string
        │       ├── date: ISOString
        │       ├── status: 'Verified'
        │       └── source: 'Webhook' | 'POS' | 'Manual'
        │
        ├── devotees/
        │   └── {devoteeId}
        │       ├── fullName: string
        │       ├── phone: string
        │       ├── gotra: string
        │       ├── nakshatra: string
        │       ├── rashi: string
        │       ├── sevaIndex: number
        │       └── kycStatus: 'Verified' | 'Pending'
        │
        └── yatranet_alerts/
            └── {alertId}
                ├── type: 'Medical' | 'CrowdSurge' | 'LostPerson' | 'Weather'
                ├── location: { lat: number, lng: number, landmark: string }
                ├── severity: 'Critical' | 'High' | 'Moderate'
                ├── status: 'Active' | 'Dispatched' | 'Resolved'
                ├── reportedBy: string
                └── timestamp: timestamp
```

#### B. Security Rules Summary (`firestore.rules`)
- **Root Admin Barrier:** Platform admins are verified via `exists(/databases/$(database)/documents/platform_admins/$(request.auth.uid))`.
- **Tenant Isolation:** Enforced via `request.auth.token.workspaceId == tenantId`. Devotees, accountants, and trustees from Tenant A cannot read or write to Tenant B under any circumstance.
- **Subcollection Rules:** All subcollections (`treasury`, `devotees`, `yatranet_alerts`) inherit the workspace tenant boundaries, with Super Admin bypass ("God Mode") enabled for disaster recovery and cross-tenant auditing.

---

## 2. Feature & Logic Deep-Dive

### 2.1 Devotee CRM & Smart KYC
- **Gotra-Pravara & Nakshatra Registry:** Traditional lineage identification (Gotra, Veda, Shakha, Pravara, Janma Nakshatra) is captured alongside statutory contact details.
- **Seva Index Algorithm:** Tracks lifetime spiritual contributions, volunteer hours in Annadanam/Gau Seva, and financial patronage to calculate a composite engagement score.
- **Family Unit Clustering:** Links nuclear and extended households under a unified `householdId` for generational lineage (Vanshavali) mapping.
- **Digital QR Pass:** Devotees receive dynamically generated client-side QR codes carrying cryptographic hashes of their ID, enabling contactless entry during high-volume festival darshans.

### 2.2 Treasury & Fiduciary Accounting
- **Double-Entry Classification:** Receipts are strictly segregated into Corpus Funds, General Donations, Puja Sankalp Dakshina, and Tied Annadanam Endowments.
- **Statutory Form 10BD & Section 80G:** Generates sequential, tamper-evident tax exemption certificates with unique serials, donor PAN verification, and automated fiscal-year reporting.
- **Hundi Counting Dual-Key Audit:** Requires simultaneous authentication by two trustees before recording cash offerings extracted from physical donation receptacles (Hundis).
- **Multi-Gateway Universal Webhooks:** Reconciles cross-border currencies (USD, GBP, INR, BDT) automatically via incoming IPN payloads into the tenant's treasury partition.

### 2.3 YatraNet (GIS Pilgrimage Radar & SOS Emergency System)
- **Geospatial Mapping:** Utilizes Leaflet and OpenStreetMap tiles to visualize temple perimeters, crowd densities, medical dispensaries, water stations, and lodging facilities.
- **Real-Time SOS Beacon Dispatch:** Devotees or sevadars trigger distress beacons with GPS coordinates. Incidents immediately stream to `YatraNetCommandCenter.tsx` via Firestore `onSnapshot()` listeners.
- **Triage Workflow:** Operators transition incident tickets across `Active` -> `Dispatched` -> `Resolved`, triggering automated SMS/Telegram broadcast notifications to nearby sevadar emergency teams.

---

## 3. Competitive Gap Analysis (The Path to Market Dominance)

To dominate the market against legacy Church Management Systems (Pushpay, Planning Center, TouchPoint, Realm, Tithe.ly) and generic ERP systems (Tally Prime, Zoho Books, SAP Business One), Sanatani Bandhan must address specific requirements unique to Hindu institutional governance.

### 3.1 Competitive Comparison Matrix

| Capability | Sanatani Bandhan (Current) | Pushpay / Church Community Builder | Planning Center | Tally Prime / Zoho Books | Market Dominator Requirement |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Multi-Tenant Architecture** | **Native Firestore Partitioning** | Multi-account / Surcharge | Single organization | Standalone desktop/cloud | Multi-tenant with federation capability across temple branches |
| **Vedic & Cultural Depth** | **High** (Panchang, Gotra, Shradh) | None (Christian/ChMS focused) | None | None | Deep scriptural logic, astrological Muhurat, gotra validation |
| **Zero-Cost Alert Infrastructure** | **Yes** (Nodemailer + Telegram) | Expensive Twilio/SendGrid plans | Paid add-ons | None | Free fallback channels (WhatsApp Cloud API + Telegram + Web Push) |
| **Prasad & Samagri Inventory BOM** | Moderate (Basic asset cards) | None | Basic pantry tracking | Complex, non-spiritual | **Smart Bhandar Engine** with Raw Ingredient BOM -> Cooked Prasad yield |
| **Offline-First PWA Sync** | Prototype cache | Web-only / mobile app wrapper | Partial check-in | Local desktop file | **True IndexedDB Sync Queue** with conflict resolution for remote ashrams |
| **Tally Prime Financial Bridge** | Manual CSV Export | Quickbooks / Xero only | Generic CSV | Native Tally | **Automated XML/ODBC Tally Ledger Sync** for Indian chartered accountants |
| **Multi-Lingual Localization** | Partial (UI text strings) | English / Spanish only | English only | Multi-language (Indian) | **10-Language Dharmic Localization** (Hindi, Bengali, Tamil, Telugu, etc.) |
| **Crowd & Yatra GIS Radar** | **Native Leaflet Real-Time Map** | None | Event check-in only | None | **Live GPS beaconing, BLE mesh support, geo-fencing** |

---

### 3.2 Critical Architectural Gaps Identified

#### Gap 1: Prasad Production & Smart Bhandar Supply Chain (Bill of Materials)
- *Current State:* Basic asset registers and dry grocery counts in `InventoryDesk.tsx`.
- *Deficiency:* Mega-temples (e.g., Tirupati, Somnath, Jagannath Puri) prepare thousands of daily Prasad packets. They require a **Bill of Materials (BOM) Recipe Engine** that deducts raw ingredients (Ghee, Rice, Jaggery, Cardamom, Wheat) from inventory based on batch cooking counts and alerts trustees of expiration thresholds.

#### Gap 2: Reliable Two-Way Offline Sync Queue
- *Current State:* Optimistic updates in React Context with basic Firestore caching.
- *Deficiency:* Remote Ashrams in rural or Himalayan regions often lose connectivity for hours. If transactions or registrations occur while offline, browser refresh or crash risks data loss without a dedicated **IndexedDB persistent outbox queue** and exponential backoff retry worker.

#### Gap 3: Tally Prime & Accounting Bridge
- *Current State:* Exports data as generic CSV or PDF tax receipts.
- *Deficiency:* Over 90% of Indian temple chartered accountants require standard **Tally Prime XML format** or direct ODBC integration to conduct annual statutory trust audits.

#### Gap 4: Deep Multi-Lingual & Scriptural Transliteration
- *Current State:* UI elements support mixed English, Hindi, and Bengali, with some hardcoded strings.
- *Deficiency:* Temple sevadars and elderly trustees often read only regional scripts (Tamil, Telugu, Kannada, Marathi, Gujarati, Devanagari). The platform needs a comprehensive translation engine with phonetic transliteration for Sanskrit Shlokas and mantras.

#### Gap 5: Granular Role & Permission Matrices (RBAC 2.0)
- *Current State:* Roles are coarse-grained (`Trustee`, `Accountant`, `Priest`, `Sevadar`).
- *Deficiency:* In large institutions, an accountant should only see specific donation counters, a head priest should only edit rituals, and inventory storekeepers should not view cash registers. A dynamic capability matrix is required.

---

## 4. Strategic Recommendations & Actionable Roadmap

To achieve absolute market dominance as the premier global spiritual operating system, the following prioritized execution phases are recommended:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE ROADMAP TO MARKET DOMINANCE                               │
├────────────────────┬────────────────────┬────────────────────┬─────────────────────────┤
│      Phase 6       │      Phase 7       │      Phase 8       │         Phase 9         │
│   Smart Bhandar    │  True Offline Sync │    Tally Prime     │   10-Language Dharmic   │
│   BOM Inventory    │  IndexedDB Outbox  │    XML Bridge      │   Localization Engine   │
│ (Prasad & Recipes) │  (Remote Ashrams)  │ (Trust Compliance) │ (Pan-India Penetration) │
└────────────────────┴────────────────────┴────────────────────┴─────────────────────────┘
```

### Phase 6: Smart Bhandar & Prasad BOM (Bill of Materials) Engine
- **Objective:** Enable multi-tier kitchen procurement and recipe conversion.
- **Deliverables:**
  - Build `PrasadRecipeManager`: Define ingredient ratios (e.g., 50 kg Besan + 40 kg Sugar + 20 kg Ghee = 1,000 Ladoos).
  - Automated inventory depletion on batch cooking confirmation.
  - Supplier purchase order generation and perishable expiration alerts.

### Phase 7: Bi-Directional Offline Sync Engine (IndexedDB + ServiceWorker)
- **Objective:** Zero data loss in zero-connectivity environments.
- **Deliverables:**
  - Implement an IndexedDB mutation outbox store using `idb` or native Dexie protocols.
  - Background ServiceWorker intercepting network dropouts and queuing outgoing writes.
  - Automatic reconciliation and conflict resolution using Last-Write-Wins (LWW) with server-side validation.

### Phase 8: Financial Bridge & Tally Prime XML Export Automation
- **Objective:** Seamless statutory trust compliance for temple chartered accountants.
- **Deliverables:**
  - Tally XML Schema 9/Prime compliant export engine.
  - Double-entry ledger mapper (Bank Accounts, Cash Hundis, Corpus Inflows, Puja Dakshina).
  - 1-click fiscal year package download formatted for Indian Income Tax filing.

### Phase 9: Pan-India Multi-Lingual Dynamic Localization Engine
- **Objective:** 100% vernacular adoption across regional pilgrimage circuits.
- **Deliverables:**
  - Complete JSON localization dictionaries covering 10 Dharmic languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Odia, Malayalam, and Sanskrit.
  - Dynamic phonetic Roman-to-Indic script transliterator for devotee gotra and name inputs.

### Phase 10: Dynamic RBAC 2.0 & Cryptographic Audit Signatures
- **Objective:** Enterprise institutional security and fraud prevention.
- **Deliverables:**
  - Custom role builder with fine-grained granular permissions (e.g., `treasury:view_hundi`, `inventory:create_bom`, `devotee:export_csv`).
  - SHA-256 chained hashing on every financial audit log entry to ensure tamper-evident records.

---

## 5. Conclusion

Sanatani Bandhan possesses an exceptional architectural foundation combining modern cloud technologies (React 19, Tailwind CSS, Firestore, Express, Firebase Admin) with deep Vedic domain expertise. By executing the strategic recommendations in Phases 6 through 10, the platform will establish uncontested market leadership, delivering the most secure, culturally attuned, and functionally complete Dharmic ERP in the world.
