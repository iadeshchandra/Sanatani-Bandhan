/**
 * Sanatani Bandhan — Enterprise RBAC Verification Suite & Diagnostic Engine
 * Phase 10: RBAC Verification Suite & Live Persona Testing Rig
 */

import { UserRole, ROLE_MIGRATION_MAP } from '../types';
import { SevaBooking } from '../types/b2c';

export interface RBACDiagnosticResult {
  testId: string;
  testName: string;
  category: 'Access Guard' | 'Role Separation' | 'Sovereign Security' | 'Data Contract';
  roleUnderAudit: UserRole | string;
  targetResource: string;
  expected: string;
  actual: string;
  status: 'PASSED' | 'FAILED';
  evidence: string;
}

export interface RBACDiagnosticReport {
  timestamp: string;
  suiteName: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  overallStatus: 'SECURE' | 'VULNERABLE';
  results: RBACDiagnosticResult[];
}

/**
 * Determines whether a given role has clearance to access a specific desk module ID.
 * Implements strict least-privilege RBAC matching App.tsx and Sidebar.tsx router guards.
 */
export function canRoleAccessDesk(rawRole: UserRole | string, deskModuleId: string): boolean {
  const role: UserRole = (ROLE_MIGRATION_MAP[rawRole] || rawRole) as UserRole;

  // 1. SuperAdmin has universal master override
  if (role === 'SuperAdmin') {
    return true;
  }

  // 2. Devotee role: strictly restricted to B2C Devotee Portal desks
  if (role === 'Devotee') {
    const devoteeAllowedDesks = [
      'devoteePortal',
      'devotee-super-app',
      'devotee-portal',
      'personal-portal',
      'devotee-account',
      'sadhana-karma',
    ];
    return devoteeAllowedDesks.includes(deskModuleId);
  }

  // 3. Priest role: ritual sanctum, panchang, puja booking, spiritual library
  // Strictly blocked from treasury, 80G tax filings, and security perimeter turnstiles
  if (role === 'Priest') {
    const priestAllowed = [
      'sanctum-hud',
      'sanctumHud',
      'poojaBooking',
      'pooja-booking',
      'mandirPuja',
      'aarti-roster',
      'purohitManagement',
      'purohit-management',
      'purohitDesk',
      'purohit-desk',
      'purohitPortal',
      'purohit-portal',
      'purohitMarket',
      'pitruShradh',
      'pitru-shradh',
      'panchang',
      'panchang-muhurat',
      'shlokaFeed',
      'satsang',
      'granthLibrary',
      'utsavPanjika',
      'dharmicAssistant',
      'yatranet-gis',
      'devoteePortal',
      'devotee-portal',
    ];
    return priestAllowed.includes(deskModuleId);
  }

  // 4. Accountant role: treasury, expenses, 80G tax receipts, CBDT 10BD, assets, inventory, federation
  // Strictly blocked from sanctum rituals and gate command / turnstile checkin
  if (role === 'Accountant') {
    const accountantAllowed = [
      'treasury',
      'treasury-audit',
      'treasuryAudit',
      'treasury-ledger',
      'hundi',
      'hundi-audit',
      'hundi-counting',
      'golak',
      'ratna-bhandar',
      'ratnaBhandar',
      'taxReceipts',
      'tax-receipt-80g',
      'form10bd',
      'form-10bd',
      'form10bdCompliance',
      'quick-chanda-pos',
      'inventory',
      'store-inventory',
      'assets',
      'asset-register',
      'bulkImport',
      'federation',
      'devotees',
      'campaigns',
      'karmaLedger',
      'devoteePortal',
      'devotee-portal',
    ];
    return accountantAllowed.includes(deskModuleId);
  }

  // 5. CSO (Chief Security Officer): tactical perimeter radar, crisis command, turnstile gate checkin, sevadar roster
  // Strictly blocked from treasury and sanctum ritual management
  if (role === 'CSO') {
    const csoAllowed = [
      'tactical-radar',
      'tactical-perimeter-radar',
      'tacticalPerimeterRadar',
      'perimeter-radar',
      'crisis-command',
      'checkin',
      'darshan-checkin',
      'gate-command',
      'qrScanner',
      'sevadar-roster',
      'sevadarRoster',
      'yatranet-gis',
      'devoteePortal',
      'devotee-portal',
    ];
    return csoAllowed.includes(deskModuleId);
  }

  // 6. Trustee role: broad administrative and operational oversight
  if (role === 'Trustee') {
    const trusteeBlocked: string[] = []; // Trustee has high-level operational clearance
    return !trusteeBlocked.includes(deskModuleId);
  }

  // 7. Sevadar / Volunteer role
  if (role === 'Sevadar') {
    const sevadarAllowed = [
      'checkin',
      'darshan-checkin',
      'gate-command',
      'qrScanner',
      'sevadar-roster',
      'sevadarRoster',
      'inventory',
      'devotees',
      'devoteePortal',
      'devotee-portal',
    ];
    return sevadarAllowed.includes(deskModuleId);
  }

  return false;
}

/**
 * Validates authority to engage God Mode / Emergency Perimeter Lockdown.
 * Preserves the Phase 8 SuperAdmin security restriction (only SaaS Infrastructure Owner).
 */
export function canRoleExecuteGodMode(rawRole: UserRole | string): boolean {
  const role: UserRole = (ROLE_MIGRATION_MAP[rawRole] || rawRole) as UserRole;
  return role === 'SuperAdmin';
}

/**
 * Validates that a SevaBooking packet created in the B2C Devotee Super App
 * satisfies the cryptographic data contract required by the Priest Sanctum HUD.
 */
export function validateSevaBookingContract(booking: Partial<SevaBooking>): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!booking.id || typeof booking.id !== 'string') missingFields.push('id');
  if (!booking.type || !['Puja', 'Annadanam', 'Goshala'].includes(booking.type)) {
    missingFields.push('type');
  }
  if (!booking.b2bWorkspaceId || typeof booking.b2bWorkspaceId !== 'string') {
    missingFields.push('b2bWorkspaceId');
  }
  if (!booking.status || !['confirmed', 'pending', 'completed', 'cancelled'].includes(booking.status)) {
    missingFields.push('status');
  }
  if (!booking.sankalpDetails || typeof booking.sankalpDetails !== 'object') {
    missingFields.push('sankalpDetails');
  } else {
    if (!booking.sankalpDetails.devoteeName) missingFields.push('sankalpDetails.devoteeName');
    if (!booking.sankalpDetails.gotra) missingFields.push('sankalpDetails.gotra');
    if (!booking.sankalpDetails.intention) missingFields.push('sankalpDetails.intention');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Executes the complete 6-point programmatic RBAC verification suite.
 * Outputs a formatted console.table and returns an audit report.
 */
export function runRBACDiagnostics(): RBACDiagnosticReport {
  const results: RBACDiagnosticResult[] = [];

  // -------------------------------------------------------------
  // Test 1: Devotee role blocked from admin desk rendering
  // -------------------------------------------------------------
  const devoteeBlockedFromAdmin =
    !canRoleAccessDesk('Devotee', 'dashboard') &&
    !canRoleAccessDesk('Devotee', 'treasury') &&
    !canRoleAccessDesk('Devotee', 'checkin') &&
    !canRoleAccessDesk('Devotee', 'tactical-radar') &&
    !canRoleAccessDesk('Devotee', 'sanctum-hud') &&
    !canRoleAccessDesk('Devotee', 'masterSettings');

  const devoteeAllowedOnPortal = canRoleAccessDesk('Devotee', 'devoteePortal');
  const test1Passed = devoteeBlockedFromAdmin && devoteeAllowedOnPortal;

  results.push({
    testId: 'RBAC-001',
    testName: 'Devotee Role Admin Desk Boundary Guard',
    category: 'Access Guard',
    roleUnderAudit: 'Devotee',
    targetResource: 'Domains 1-7 Admin Desks (Blocked) & DevoteePortal (Allowed)',
    expected: 'Devotee blocked from all ERP admin desks; routed solely to DevoteePortal',
    actual: test1Passed ? 'BLOCKED_FROM_ERP_ADMIN_DESKS' : 'UNAUTHORIZED_ACCESS_DETECTED',
    status: test1Passed ? 'PASSED' : 'FAILED',
    evidence: test1Passed
      ? 'Devotee denied access to dashboard/treasury/checkin/radar/sanctum; permitted on DevoteePortal'
      : 'Devotee has unauthorized access to one or more administrative desks',
  });

  // -------------------------------------------------------------
  // Test 2: Priest role granted Sanctum HUD, blocked from Treasury
  // -------------------------------------------------------------
  const priestHasSanctum =
    canRoleAccessDesk('Priest', 'sanctum-hud') &&
    canRoleAccessDesk('Priest', 'poojaBooking') &&
    canRoleAccessDesk('Priest', 'mandirPuja');

  const priestBlockedFromTreasury =
    !canRoleAccessDesk('Priest', 'treasury') &&
    !canRoleAccessDesk('Priest', 'treasury-audit') &&
    !canRoleAccessDesk('Priest', 'hundi-audit') &&
    !canRoleAccessDesk('Priest', 'taxReceipts');

  const test2Passed = priestHasSanctum && priestBlockedFromTreasury;

  results.push({
    testId: 'RBAC-002',
    testName: 'Priest Sanctum Clearance & Treasury Firewall',
    category: 'Role Separation',
    roleUnderAudit: 'Priest',
    targetResource: 'Sanctum HUD (Allowed) & Treasury/Tax/Hundi (Blocked)',
    expected: 'Priest granted Sanctum HUD & Ritual Desks; strictly blocked from Treasury & 80G',
    actual: test2Passed ? 'GRANTED_SANCTUM_BLOCKED_TREASURY' : 'SEPARATION_OF_POWERS_BREACH',
    status: test2Passed ? 'PASSED' : 'FAILED',
    evidence: test2Passed
      ? 'Priest granted sanctum-hud/poojaBooking; denied access to treasury/treasury-audit/hundi-audit'
      : 'Priest either lacks sanctum-hud or has unauthorized treasury access',
  });

  // -------------------------------------------------------------
  // Test 3: Accountant granted Treasury & 80G, blocked from Gate Command
  // -------------------------------------------------------------
  const accountantHasTreasuryAnd80G =
    canRoleAccessDesk('Accountant', 'treasury') &&
    canRoleAccessDesk('Accountant', 'treasury-audit') &&
    canRoleAccessDesk('Accountant', 'taxReceipts') &&
    canRoleAccessDesk('Accountant', 'form10bd');

  const accountantBlockedFromGate =
    !canRoleAccessDesk('Accountant', 'checkin') &&
    !canRoleAccessDesk('Accountant', 'gate-command') &&
    !canRoleAccessDesk('Accountant', 'sanctum-hud');

  const test3Passed = accountantHasTreasuryAnd80G && accountantBlockedFromGate;

  results.push({
    testId: 'RBAC-003',
    testName: 'Accountant Treasury Authority & Gate Command Defense',
    category: 'Role Separation',
    roleUnderAudit: 'Accountant',
    targetResource: 'Treasury & 80G (Allowed) & Gate Command Check-in (Blocked)',
    expected: 'Accountant granted Treasury & 80G; strictly blocked from Turnstile Gate Command',
    actual: test3Passed ? 'GRANTED_TREASURY_BLOCKED_GATE' : 'UNAUTHORIZED_ACCESS_DETECTED',
    status: test3Passed ? 'PASSED' : 'FAILED',
    evidence: test3Passed
      ? 'Accountant granted treasury/taxReceipts(80G); denied access to checkin/gate-command'
      : 'Accountant either lacks treasury or has unauthorized gate command access',
  });

  // -------------------------------------------------------------
  // Test 4: CSO granted Radar, but God Mode lockdown returns unauthorized
  // -------------------------------------------------------------
  const csoHasRadar =
    canRoleAccessDesk('CSO', 'tactical-radar') &&
    canRoleAccessDesk('CSO', 'checkin') &&
    canRoleAccessDesk('CSO', 'crisis-command');

  const csoBlockedFromGodMode = !canRoleExecuteGodMode('CSO');
  const test4Passed = csoHasRadar && csoBlockedFromGodMode;

  results.push({
    testId: 'RBAC-004',
    testName: 'CSO Tactical Radar Clearance & God Mode Defense',
    category: 'Sovereign Security',
    roleUnderAudit: 'CSO',
    targetResource: 'Tactical Perimeter Radar (Allowed) & God Mode Lockdown (Restricted)',
    expected: 'CSO granted Tactical Radar; God Mode Emergency Perimeter Lockdown returns unauthorized',
    actual: test4Passed ? 'GRANTED_RADAR_GODMODE_UNAUTHORIZED' : 'SOVEREIGN_AUTHORITY_BREACH',
    status: test4Passed ? 'PASSED' : 'FAILED',
    evidence: test4Passed
      ? 'CSO granted tactical-radar; God Mode lockdown restricted exclusively to SuperAdmin'
      : 'CSO either lacks radar or has unauthorized God Mode lockdown authority',
  });

  // -------------------------------------------------------------
  // Test 5: SuperAdmin granted God Mode lockdown authority
  // -------------------------------------------------------------
  const superAdminHasRadar = canRoleAccessDesk('SuperAdmin', 'tactical-radar');
  const superAdminHasGodMode = canRoleExecuteGodMode('SuperAdmin');
  const test5Passed = superAdminHasRadar && superAdminHasGodMode;

  results.push({
    testId: 'RBAC-005',
    testName: 'SuperAdmin Sovereign Override & God Mode Lockdown Authority',
    category: 'Sovereign Security',
    roleUnderAudit: 'SuperAdmin',
    targetResource: 'Tactical Radar & God Mode Lockdown Switch',
    expected: 'SuperAdmin granted universal desk access and God Mode emergency lockdown authority',
    actual: test5Passed ? 'SUPERADMIN_SOVEREIGN_OVERRIDE_VERIFIED' : 'SUPERADMIN_CLEARANCE_FAILURE',
    status: test5Passed ? 'PASSED' : 'FAILED',
    evidence: test5Passed
      ? 'SuperAdmin successfully verified for God Mode lockdown initiation and universal desk access'
      : 'SuperAdmin fails God Mode lockdown authorization check',
  });

  // -------------------------------------------------------------
  // Test 6: Cross-domain flow: Devotee SevaBooking contract contains required fields
  // -------------------------------------------------------------
  const canonicalSevaContract: SevaBooking = {
    id: 'seva-kashi-rudra-108',
    type: 'Puja',
    sankalpDetails: {
      devoteeName: 'Arun Sharma',
      gotra: 'Bharadwaja',
      nakshatra: 'Pushya',
      intention: 'Ayur, Arogya & Dharma Raksha for Parivar',
    },
    status: 'confirmed',
    b2bWorkspaceId: 'DEMO_ws-mandir',
    workspaceName: 'Sri Sanatan Dharma Mandir',
    amount: 2100,
    bookingDate: '2026-10-04',
    muhurat: 'Abhijit Muhurat (11:45 AM - 12:35 PM)',
  };

  const validation = validateSevaBookingContract(canonicalSevaContract);
  const test6Passed = validation.valid;

  results.push({
    testId: 'RBAC-006',
    testName: 'Cross-Domain B2C-to-B2B SevaBooking Contract Verification',
    category: 'Data Contract',
    roleUnderAudit: 'Devotee -> Priest',
    targetResource: 'SevaBooking -> Priest Sanctum HUD Roster',
    expected: 'Devotee SevaBooking payload satisfies all required fields for Priest Sanctum recitation',
    actual: test6Passed ? 'CONTRACT_COMPLIANT' : `MISSING_FIELDS: ${validation.missingFields.join(', ')}`,
    status: test6Passed ? 'PASSED' : 'FAILED',
    evidence: test6Passed
      ? 'Verified id, type, sankalpDetails (devoteeName, gotra, intention), status, and b2bWorkspaceId'
      : `Missing required contract fields: ${validation.missingFields.join(', ')}`,
  });

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.length - passedCount;

  const report: RBACDiagnosticReport = {
    timestamp: new Date().toISOString(),
    suiteName: 'Sanatani Bandhan RBAC & Sovereign Security Diagnostic Suite v10.0',
    totalTests: results.length,
    passedCount,
    failedCount,
    overallStatus: failedCount === 0 ? 'SECURE' : 'VULNERABLE',
    results,
  };

  // Formatted tabular console output
  console.group('🛡️ Sanatani Bandhan — Programmatic RBAC Verification Suite');
  console.log(`Executed: ${report.timestamp} | Status: ${report.overallStatus}`);
  console.table(
    results.map((r) => ({
      TestID: r.testId,
      Role: r.roleUnderAudit,
      Resource: r.targetResource,
      Status: r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED',
      Evidence: r.evidence,
    }))
  );
  console.groupEnd();

  return report;
}
