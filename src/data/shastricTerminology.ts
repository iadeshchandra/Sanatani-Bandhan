// Barrel: split for maintainability (see shastricTypes / shastricTerms / shastricSops*).
export * from './shastricTypes';
export { SHASTRIC_TERMINOLOGY } from './shastricTerms';
import type { ModuleRoleSOP, TermCategory, ShastricTerm } from './shastricTypes';
import { SHASTRIC_TERMINOLOGY } from './shastricTerms';
import { MODULE_ROLE_SOPS_A } from './shastricSopsA';
import { MODULE_ROLE_SOPS_B } from './shastricSopsB';
import { MODULE_ROLE_SOPS_C } from './shastricSopsC';
import { MODULE_ROLE_SOPS_D } from './shastricSopsD';

export const MODULE_ROLE_SOPS: Record<string, Record<string, ModuleRoleSOP>> = {
  ...MODULE_ROLE_SOPS_A,
  ...MODULE_ROLE_SOPS_B,
  ...MODULE_ROLE_SOPS_C,
  ...MODULE_ROLE_SOPS_D,
};

export function searchTerminology(
  query: string,
  category?: TermCategory | 'ALL',
  language: 'en' | 'hi' | 'bn' | 'sa' = 'hi'
): ShastricTerm[] {
  const cleanQ = query.trim().toLowerCase();

  return SHASTRIC_TERMINOLOGY.filter((term) => {
    const matchCategory = !category || category === 'ALL' || term.category === category;
    if (!matchCategory) return false;

    if (!cleanQ) return true;

    // Check term key, labels across languages, definitions, synonyms
    const inKey = term.termKey.toLowerCase().includes(cleanQ);
    const inEnLabel = term.label.en.toLowerCase().includes(cleanQ);
    const inHiLabel = term.label.hi.toLowerCase().includes(cleanQ);
    const inBnLabel = term.label.bn.toLowerCase().includes(cleanQ);
    const inSaLabel = term.label.sa.toLowerCase().includes(cleanQ);

    const inDef = term.definition[language].toLowerCase().includes(cleanQ);
    const inSynonyms = term.synonyms?.some((s) => s.toLowerCase().includes(cleanQ));

    return inKey || inEnLabel || inHiLabel || inBnLabel || inSaLabel || inDef || inSynonyms;
  });
}

/**
 * Finds a term by its unique termKey.
 */
export function getTermByKey(key: string): ShastricTerm | undefined {
  return SHASTRIC_TERMINOLOGY.find((t) => t.termKey === key.toUpperCase());
}

/**
 * Retrieves a role-based SOP for a given module and role.
 * Falls back to generic SOP if module or role is not explicitly mapped.
 */
export function getModuleRoleSOP(moduleId: string, role: string): ModuleRoleSOP {
  // Normalize module key
  const normalizedModule = moduleId.toUpperCase().replace(/-/g, '_');
  const normalizedRole = role.toUpperCase();

  const moduleGroup = MODULE_ROLE_SOPS[normalizedModule];
  if (moduleGroup) {
    if (moduleGroup[normalizedRole]) {
      return moduleGroup[normalizedRole];
    }
    // Return first available role in module if exact role not matched
    const firstRoleKey = Object.keys(moduleGroup)[0];
    if (firstRoleKey) {
      return moduleGroup[firstRoleKey];
    }
  }

  // Fallback Generic Module SOP
  return {
    moduleId: normalizedModule || 'GENERAL_DESK',
    moduleName: {
      en: 'Operational Desk & Shastric Governance',
      hi: 'प्रचालन डेस्क एवं शास्त्रीय अभिशासन',
      bn: 'পরিচালনা ডেস্ক এবং শাস্ত্রীয় প্রশাসন',
      sa: 'कार्यप्रणाली-शास्त्रप्रशासन-विभागश्च',
    },
    role: normalizedRole || 'SEVADAR',
    roleLabel: {
      en: 'Authorized Mandir Official / Sevadar',
      hi: 'अधिकृत मंदिर अधिकारी / सेवादार',
      bn: 'অনুমোদিত মন্দির প্রতিনিধি / সেবাদার',
      sa: 'अधिकृत-मन्दिर-कार्यकर्ता',
    },
    roleSummary: {
      en: 'Follow prescribed standard operating protocols, maintain temple ledger integrity, and respect traditional Shastric decorum.',
      hi: 'निर्धारित कार्यप्रणाली का पालन करें, मंदिर बहीखाता की शुचिता बनाए रखें एवं पारंपरिक शास्त्रीय मर्यादा का सम्मान करें।',
      bn: 'নির্ধারিত কার্যপদ্ধতি অনুসরণ করুন, মন্দিরের তহবিলের স্বচ্ছতা বজায় রাখুন এবং ঐতিহ্যবাহী সনাতন মর্যাদা রক্ষা করুন।',
      sa: 'शास्त्रविहित-मार्गम् अनुसृत्य मन्दिरकार्याणि निष्पादयन्तु।',
    },
    steps: [
      {
        stepNumber: 1,
        title: {
          en: '1. Access Verification & Role Permissions Check',
          hi: '१. पहुँच सत्यापन एवं भूमिका अधिकार परीक्षण',
          bn: '১. অনুমতি যাচাই ও দায়িত্ব নিশ্চিতকরণ',
          sa: '१. अधिकार-परीक्षणम्',
        },
        description: {
          en: 'Ensure your active role matches the tasks you perform. Sensitive financial and disciplinary modifications require Trustee sign-off.',
          hi: 'सुनिश्चित करें कि आपकी सक्रिय भूमिका आपके कार्यों के अनुकूल है। वित्तीय निर्णयों के लिए न्यासी अनुमोदन अनिवार्य है।',
          bn: 'নিশ্চিত করুন আপনার বর্তমান ভূমিকা সম্পাদ্য কাজের সাথে সামঞ্জস্যপূর্ণ। আর্থিক বিষয়ে ট্রাস্টির অনুমতি প্রয়োজন।',
          sa: 'स्वस्य अधिकारक्षेत्रं परीक्ष्य कार्यं कुर्वन्तु।',
        },
        complianceTag: 'Sanatani Bandhan RBAC Safeguard',
      },
      {
        stepNumber: 2,
        title: {
          en: '2. Audit Trail & Real-time Record Keeping',
          hi: '२. ऑडिट ट्रेल एवं वास्तविक समय प्रविष्टि संरक्षण',
          bn: '২. অডিট ট্রেইল ও রিয়েল-টাইম তথ্য সংরক্ষণ',
          sa: '२. अभिलेख-संरक्षणम्',
        },
        description: {
          en: 'Every update to treasury, inventory, or sankalpa records is cryptographically time-stamped with your user credentials.',
          hi: 'कोष, भंडार या संकल्प में प्रत्येक बदलाव आपके परिचय के साथ समयबद्ध रूप से सुरक्षित होता है।',
          bn: 'তহবিল, ভাণ্ডার বা পূজার প্রতিটি পরিবর্তন আপনার ইউজার আইডিসহ সময়চিহ্নে সুরক্ষিত হয়।',
          sa: 'सर्वं परिवर्तनं समयचिह्नेन सह सुरक्ष्यते।',
        },
        complianceTag: 'Digital Trust Accounting Standard',
      },
    ],
    checklistItems: [
      {
        en: 'Session authenticated with authorized role credentials',
        hi: 'सत्र अधिकृत भूमिका प्रमाणपत्रों से प्रमाणित',
        bn: 'অনুমোদিত ইউজার দিয়ে লগইন সম্পন্ন',
        sa: 'प्रमाणीकृत-प्रवेशः सम्पन्नः',
      },
      {
        en: 'Shastric decorum and statutory trust norms adhered to',
        hi: 'शास्त्रीय मर्यादा एवं वैधानिक ट्रस्ट नियमों का अक्षरशः पालन',
        bn: 'শাস্ত্রীয় মর্যাদা এবং ট্রাস্টের আইনি নিয়মকানুন অনুসরণ নিশ্চিত',
        sa: 'शास्त्रमर्यादा-पालनं सुनिश्चितम्',
      },
    ],
  };
}

