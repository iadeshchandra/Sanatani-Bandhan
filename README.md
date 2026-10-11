# Sanatani Bandhan

**Universal digital command center, community ERP, and SaaS ecosystem for Hindu organizations worldwide.**

Sanatani Bandhan provides a robust, multi-tenant digital infrastructure (10 distinct Workspace architectures) serving Mandirs, Ashrams, Mathas, Gaushalas, Dharmashalas, and global Sanatani Communities. It features comprehensive Devotee Lineage (Kula/Gotra) CRM, double-entry treasury ledgers, secure biometric authentication, real-time in-app chat, and AI-powered spiritual assistants.

## Features

- **Multi-Tenant Architectures (10 Frameworks)**: Distinct UI, roles, and taxonomies for Mandirs, Ashrams, Sampradayas, Gaushalas, Gurukuls, and more.
- **Advanced Identity Management**:
  - Secure WebAuthn Passkeys / Biometric (Touch ID / Face ID) login fallbacks.
  - Granular RBAC (Role-Based Access Control) supporting 12 unique roles (e.g., Trustee, Purohit, Sevadar).
- **Core Domain Modules**:
  - **Devotee CRM**: Advanced multi-generational lineage tracking, Gotra mapping, and Kuladevata registries.
  - **Dharmic Treasury**: Double-entry accounting, Escrow Dakshina, QR-based digital Chanda (donations), and expense tracking.
  - **Purohit Marketplace & Booking**: Verified scholar network for rituals with escrowed Dakshina and real-time chat.
  - **Sanatani Vivah (Matrimony)**: Secure matchmaking based on Gotra, Dosha, and spiritual compatibility with integrated messaging.
  - **Sanatani Social Feed**: A dedicated, moderated platform for community updates, Pravachans, and darshans.
- **Communication & AI**:
  - Secure end-to-end real-time direct messaging between Devotees and Purohits.
  - "Dharmic Query Assistant" - Context-aware AI guiding users through Shastras, Muhurats, and platform navigation.

## Architecture & Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend/State**: Firebase Firestore (Real-time NoSQL), LocalStorage fallbacks.
- **Authentication**: Firebase Auth (Anonymous, Custom Pin) + WebAuthn/FIDO2.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
\`\`\`

## Security & Privacy
Built with strict compliance to Dharmic community privacy standards, featuring isolated workspaces, permission gating for sensitive lineage data, and moderated networking modules.
