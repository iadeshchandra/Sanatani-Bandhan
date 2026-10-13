/**
 * P2: dharmic taxonomy now covers all major org families (Mandir, Ashram,
 * Gurukul, Trust + Goshala, Sangha, Tirth, Vidyalaya). getTaxonomy() falls
 * back to the term key itself when an org has no entry, so missing coverage
 * degrades to English, never to a blank.
 */
export interface TaxonomyTerm {
  Mandir: string;
  Ashram: string;
  Gurukul: string;
  Trust: string;
  Goshala?: string;
  Sangha?: string;
  Tirth?: string;
  Vidyalaya?: string;
}

export const dharmicTaxonomy: Record<string, TaxonomyTerm> = {
  SpiritualCustodian: {
    Mandir: "Pradhan Archaka / Pujari",
    Ashram: "Mahant / Guru / Swami",
    Gurukul: "Kulapati / Acharya",
    Trust: "Chief Trustee / President",
    Goshala: "Goshala Prabandhak",
    Sangha: "Sangha Adhyaksha",
    Tirth: "Tirth Purohit Pramukh",
    Vidyalaya: "Pradhanacharya",
  },
  Participant: {
    Mandir: "Devotee (Bhakta)",
    Ashram: "Seeker / Disciple (Shishya)",
    Gurukul: "Student (Vidyarthi)",
    Trust: "Member / Patron",
    Goshala: "Gau Sevak",
    Sangha: "Sadasya (Member)",
    Tirth: "Yatri",
    Vidyalaya: "Vidyalaya Student",
  },
  FinancialOffering: {
    Mandir: "Chanda / Hundi / Daan",
    Ashram: "Guru Dakshina / Bhiksha",
    Gurukul: "Vidyadaan / Shulka",
    Trust: "Corpus Contribution",
    Goshala: "Gau Seva / Godaan",
    Sangha: "Sadasyata Shulk / Chanda",
    Tirth: "Yatri Seva / Daan",
    Vidyalaya: "Shiksha Sahayog",
  },
  PrimaryActivity: {
    Mandir: "Pooja, Darshan & Aarti",
    Ashram: "Satsang, Sadhana & Japa",
    Gurukul: "Veda Patha & Adhyayan",
    Trust: "Seva Project & Karyakram",
    Goshala: "Gau Seva, Milk & Fodder",
    Sangha: "Baithak, Utsav & Seva",
    Tirth: "Yatra, Darshan & Snan",
    Vidyalaya: "Pathan & Samskar Shiksha",
  },
  Kitchen: {
    Mandir: "Mahaprasad / Naivedyam",
    Ashram: "Bhojan Prasadam",
    Gurukul: "Gurukul Annadanam",
    Trust: "Community Kitchen",
    Goshala: "Gau Aahar Shala",
    Sangha: "Samoohik Bhojan",
    Tirth: "Yatri Bhojanalaya",
    Vidyalaya: "Vidyalaya Bhojan",
  },
  SacredInventory: {
    Mandir: "Ratna Bhandar & Samagri",
    Ashram: "Ashram Bhandar",
    Gurukul: "Pathashala Samagri",
    Trust: "Trust Asset Ledger",
    Goshala: "Fodder & Medicine Store",
    Sangha: "Sangha Sampada",
    Tirth: "Tirth Suvidha Assets",
    Vidyalaya: "Pathashala Samagri",
  },
};

export default dharmicTaxonomy;
