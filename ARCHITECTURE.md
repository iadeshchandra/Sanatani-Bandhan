# Sanatani Bandhan (Dharmic ERP) - Architectural Blueprint

## 1. High-Level System Architecture
**Sanatani Bandhan** is a multi-tenant, enterprise-grade ERP built specifically for Hindu Temples, Ashrams, and Spiritual Organizations. It operates as a offline-capable Single Page Application (SPA) utilizing a modern, scalable tech stack.

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS (Strictly utility-first, no external CSS files)
- **State Management:** React Context API (`DataContext`, `AuthWorkspaceContext`) + Offline-first persistent cache
- **Backend Infrastructure:** Firebase (Firestore for NoSQL document storage, Firebase Auth for identity, Cloud Storage for zero-cost static assets)
- **Data Export & Print:** `jsPDF`, `html2canvas`, and CSV Blob engines.

---

## 2. Module-Based Directory Structure (The 7 Domains)
The application strictly adheres to a Domain-Driven Design (DDD) philosophy. Code is segregated into 7 distinct operational domains located in `src/components/domain*` to enforce separation of concerns.

### `domain1/` - People & KYC 
Handles identity, lineage, and compliance.
- **Core Components:** `DevoteeGrid`, `BulkImportDesk`, `VanshavaliDesk` (Family Tree)
- **Responsibilities:** Smart ID card generation, Seva Index tracking, household grouping, KYC verification.

### `domain2/` - Treasury & Finance
The financial backbone and double-entry accounting system.
- **Core Components:** `TreasuryLedgerDesk`, `TaxReceiptDesk`, `KarmaLedgerDesk`, `AssetInventoryDesk`, `InventoryDesk`
- **Responsibilities:** Income/Expense tracking, Recurring transactions (Monthly/Annually), Section 80G tax receipt generation, asset custody tracking.

### `domain3/` - Dharmic Operations
Sacred scheduling and operational calendars.
- **Core Components:** `PoojaBookingDesk`, `PanchangMuhuratDesk`, `PitruShradhDesk`, `VedicCalendarEventsDesk`
- **Responsibilities:** Sankalp reservations, automated Panchang (Tithi, Nakshatra) calculations, shradh lifecycle tracking.

### `domain4/` - Community Services
Welfare, hospitality, and volunteer management.
- **Core Components:** `SanataniVivahDesk` (Matrimony), `RakthaSevaDesk` (Blood Donation), `DharamshalaDesk` (Guest Management), `AnnadanamKitchenDesk`, `SevadarRosterDesk`
- **Responsibilities:** Room allocations, dietary routing for Annadanam, blood-type matching, volunteer shift tracking.

### `domain5/` - Gau Seva & Eco
Ecological and animal welfare tracking.
- **Core Components:** `GauSevaDesk`
- **Responsibilities:** Individual cow tracking (Gomata), milk yield analytics, medical logs, sponsor/adoption management.

### `domain6/` - Security & Settings
System configurations and immutable audit trails.
- **Core Components:** `MasterSettingsDesk`, `AuditLogDesk`, `UserRolesDesk`, `CrisisCommandCenter`
- **Responsibilities:** Zero-trust audit logging (with cryptographic hashing), Security Health Checks (suspicious privilege detection), Role-Based Access Control (RBAC).

### `domain7/` - Outreach & AI
Communication engines and Dharmic intelligence.
- **Core Components:** `DharmicAssistantDesk`, `WhatsAppBroadcasterDesk`, `SanskritLibraryDesk`
- **Responsibilities:** AI-powered query resolution, bulk WhatsApp notifications, shloka and commentary databases.

---

## 3. AuthWorkspaceProvider: Identity & Multi-Tenancy
The `AuthWorkspaceContext` acts as the primary gatekeeper for the application.

- **Multi-Tenancy Isolation:** The ERP supports multiple organizations (Workspaces). The provider injects `activeWorkspace` into the component tree, ensuring data queries and UI elements are strictly scoped to the current tenant.
- **Role-Based Access Control (RBAC):** It manages the `currentUser` and `currentRole`. The exported `checkPermission(['trustee', 'accountant'])` function is used globally to render or hide UI elements securely.
- **Security:** Prevents unauthorized cross-tenant data leakage by enforcing Workspace ID filters on all read/write operations.

---

## 4. Event-Driven Communication
To maintain loose coupling between disparate domains (e.g., clicking a button in `DashboardHome` to open `QuickChandaModal` in `App.tsx`), the architecture utilizes an event-driven pattern alongside React Context.

- **State Uplifting:** High-level navigation and modal toggles (like `showQuickPay`) are hoisted to the root (`App.tsx`).
- **Context Actions:** Functions like `handleNav(moduleId)` or `onOpenQuickPay` are passed down as props or accessed via Context to trigger global view changes.
- **Custom Window Events:** For deeply nested components that need to trigger global alerts or navigation without prop-drilling, the system dispatches custom `window` events (e.g., `window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'treasury-ledger' }))`).

---

## 5. Offline-First Firestore Integration
Spiritual organizations often operate in areas with intermittent internet connectivity (e.g., remote Ashrams). The architecture guarantees uptime via an Offline-First strategy.

1. **Local State Cache (`useData`):** All reads/writes initially hit the local React state and a persistence layer (like `localStorage` or IndexedDB).
2. **Optimistic UI Updates:** When a transaction is logged, the UI updates instantly without waiting for a server response.
3. **Firestore Synchronization:** The Firebase SDK is configured with `enableIndexedDbPersistence()`. Background sync engines quietly push local mutations to the cloud and pull new documents when network connectivity is restored.
4. **Conflict Resolution:** Last-write-wins (LWW) timestamping or specific Firestore merge rules handle multi-device data collisions.

---

## 6. The AI Assistant's Role & Operational Guidelines
As the AI coding agent maintaining this ERP, the role requires strict adherence to architectural boundaries:

1. **Enforce Domain Segregation:** Do not mix financial logic into Domain 1 (People), or KYC logic into Domain 3. Respect the directory boundaries.
2. **Maintain Offline-First Integrity:** Never write code that blocks the UI waiting for a database response. Always update local state first.
3. **Proactive Security:** When building features involving PII (Personally Identifiable Information) or finances, proactively inject Audit Log triggers.
4. **Zero-Slop UI Standards:** Rely entirely on Tailwind CSS utility classes. Reject generic designs; utilize the established `stone`, `amber`, `emerald`, and `rose` color palettes. 
5. **No Monolithic Files:** If a domain file exceeds ~500 lines, aggressively extract pure UI components (like tables, modal wrappers, or stat cards) into `src/components/common/`.
