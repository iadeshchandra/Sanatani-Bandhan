/**
 * Automated RBAC Verification Suite for CI/CD Pipeline
 * Phase 10: RBAC Verification Suite & Live Persona Testing Rig
 */

import {
  canRoleAccessDesk,
  canRoleExecuteGodMode,
  validateSevaBookingContract,
  runRBACDiagnostics,
} from '../utils/rbacDiagnostics';
import { SevaBooking } from '../types/b2c';

describe('Sanatani Bandhan RBAC Security Matrix & Sovereign Clearance Suite', () => {
  // -------------------------------------------------------------
  // Test 1: Devotee role blocked from admin desk rendering
  // -------------------------------------------------------------
  describe('Test 1: Devotee Role Access Boundaries', () => {
    it('blocks Devotee from rendering core administrative and operational desks', () => {
      const adminDesks = [
        'dashboard',
        'treasury',
        'treasury-audit',
        'checkin',
        'gate-command',
        'tactical-radar',
        'sanctum-hud',
        'masterSettings',
        'crisis-command',
        'bulkImport',
      ];

      adminDesks.forEach((deskId) => {
        expect(canRoleAccessDesk('Devotee', deskId)).toBe(false);
      });
    });

    it('grants Devotee access to personal Devotee Portal desks', () => {
      expect(canRoleAccessDesk('Devotee', 'devoteePortal')).toBe(true);
      expect(canRoleAccessDesk('Devotee', 'devotee-super-app')).toBe(true);
      expect(canRoleAccessDesk('Devotee', 'devotee-portal')).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Test 2: Priest role granted Sanctum HUD, blocked from Treasury
  // -------------------------------------------------------------
  describe('Test 2: Priest Sanctum Clearance & Treasury Firewall', () => {
    it('grants Priest access to Sanctum HUD and ritual desks', () => {
      expect(canRoleAccessDesk('Priest', 'sanctum-hud')).toBe(true);
      expect(canRoleAccessDesk('Priest', 'poojaBooking')).toBe(true);
      expect(canRoleAccessDesk('Priest', 'mandirPuja')).toBe(true);
      expect(canRoleAccessDesk('Priest', 'purohitDesk')).toBe(true);
      expect(canRoleAccessDesk('Priest', 'panchang')).toBe(true);
    });

    it('strictly blocks Priest from Treasury, Hundi audits, and 80G tax desks', () => {
      expect(canRoleAccessDesk('Priest', 'treasury')).toBe(false);
      expect(canRoleAccessDesk('Priest', 'treasury-audit')).toBe(false);
      expect(canRoleAccessDesk('Priest', 'hundi-audit')).toBe(false);
      expect(canRoleAccessDesk('Priest', 'ratna-bhandar')).toBe(false);
      expect(canRoleAccessDesk('Priest', 'taxReceipts')).toBe(false);
      expect(canRoleAccessDesk('Priest', 'form10bd')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 3: Accountant granted Treasury & 80G, blocked from Gate Command
  // -------------------------------------------------------------
  describe('Test 3: Accountant Treasury Authority & Gate Firewall', () => {
    it('grants Accountant access to Treasury, Audit Ledgers, 80G Tax Receipts, and CBDT Form 10BD', () => {
      expect(canRoleAccessDesk('Accountant', 'treasury')).toBe(true);
      expect(canRoleAccessDesk('Accountant', 'treasury-audit')).toBe(true);
      expect(canRoleAccessDesk('Accountant', 'taxReceipts')).toBe(true);
      expect(canRoleAccessDesk('Accountant', 'form10bd')).toBe(true);
      expect(canRoleAccessDesk('Accountant', 'quick-chanda-pos')).toBe(true);
      expect(canRoleAccessDesk('Accountant', 'inventory')).toBe(true);
    });

    it('strictly blocks Accountant from Gate Command turnstiles and Sanctum HUD rituals', () => {
      expect(canRoleAccessDesk('Accountant', 'checkin')).toBe(false);
      expect(canRoleAccessDesk('Accountant', 'gate-command')).toBe(false);
      expect(canRoleAccessDesk('Accountant', 'darshan-checkin')).toBe(false);
      expect(canRoleAccessDesk('Accountant', 'sanctum-hud')).toBe(false);
      expect(canRoleAccessDesk('Accountant', 'tactical-radar')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 4: CSO granted Radar, but God Mode lockdown returns unauthorized
  // -------------------------------------------------------------
  describe('Test 4: Chief Security Officer (CSO) Perimeter Clearance & God Mode Defense', () => {
    it('grants CSO access to Tactical Perimeter Radar and Gate Command Check-In', () => {
      expect(canRoleAccessDesk('CSO', 'tactical-radar')).toBe(true);
      expect(canRoleAccessDesk('CSO', 'checkin')).toBe(true);
      expect(canRoleAccessDesk('CSO', 'crisis-command')).toBe(true);
      expect(canRoleAccessDesk('CSO', 'qrScanner')).toBe(true);
    });

    it('ensures God Mode Emergency Perimeter Lockdown returns unauthorized for CSO', () => {
      expect(canRoleExecuteGodMode('CSO')).toBe(false);
    });

    it('blocks CSO from accessing Treasury and Sanctum ritual management', () => {
      expect(canRoleAccessDesk('CSO', 'treasury')).toBe(false);
      expect(canRoleAccessDesk('CSO', 'hundi-audit')).toBe(false);
      expect(canRoleAccessDesk('CSO', 'sanctum-hud')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 5: SuperAdmin granted God Mode lockdown authority
  // -------------------------------------------------------------
  describe('Test 5: SuperAdmin Sovereign Authority & Universal Override', () => {
    it('authorizes SuperAdmin to execute God Mode Emergency Perimeter Lockdown', () => {
      expect(canRoleExecuteGodMode('SuperAdmin')).toBe(true);
    });

    it('grants SuperAdmin universal access across all domain desks', () => {
      const allSampleDesks = [
        'dashboard',
        'treasury',
        'treasury-audit',
        'sanctum-hud',
        'tactical-radar',
        'checkin',
        'masterSettings',
        'devoteePortal',
      ];

      allSampleDesks.forEach((deskId) => {
        expect(canRoleAccessDesk('SuperAdmin', deskId)).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------
  // Test 6: Cross-domain flow: Devotee SevaBooking contract contains required fields
  // -------------------------------------------------------------
  describe('Test 6: Cross-Domain B2C Devotee to Priest Sanctum HUD Contract Flow', () => {
    it('validates a compliant Devotee SevaBooking payload for Priest Sanctum recitation', () => {
      const validBooking: SevaBooking = {
        id: 'seva-test-uuid-991',
        type: 'Puja',
        sankalpDetails: {
          devoteeName: 'Arun Sharma',
          gotra: 'Bharadwaja',
          nakshatra: 'Pushya',
          intention: 'Dharma, Moksha & Family Wellbeing',
        },
        status: 'confirmed',
        b2bWorkspaceId: 'DEMO_ws-mandir',
      };

      const result = validateSevaBookingContract(validBooking);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('flags malformed or incomplete SevaBooking contracts missing mandatory sankalp fields', () => {
      const incompleteBooking: Partial<SevaBooking> = {
        id: 'bad-contract',
        type: 'Puja',
        // missing sankalpDetails, status, b2bWorkspaceId
      };

      const result = validateSevaBookingContract(incompleteBooking);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('sankalpDetails');
      expect(result.missingFields).toContain('status');
      expect(result.missingFields).toContain('b2bWorkspaceId');
    });
  });

  // -------------------------------------------------------------
  // Test 7: Programmatic Diagnostic Suite Execution
  // -------------------------------------------------------------
  describe('Test 7: Full Programmatic Diagnostic Healthcheck', () => {
    it('executes runRBACDiagnostics() and reports zero vulnerabilities', () => {
      const report = runRBACDiagnostics();

      expect(report.totalTests).toBe(6);
      expect(report.passedCount).toBe(6);
      expect(report.failedCount).toBe(0);
      expect(report.overallStatus).toBe('SECURE');
    });
  });
});
