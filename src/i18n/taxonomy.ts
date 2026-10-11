export interface TaxonomyTerm {
  Mandir: string;
  Ashram: string;
  Gurukul: string;
  Trust: string;
}

export const dharmicTaxonomy: Record<string, TaxonomyTerm> = {
  SpiritualCustodian: {
    Mandir: "Pradhan Archaka / Pujari",
    Ashram: "Mahant / Guru / Swami",
    Gurukul: "Kulapati / Acharya",
    Trust: "Chief Trustee / President",
  },
  Participant: {
    Mandir: "Devotee (Bhakta)",
    Ashram: "Seeker / Disciple (Shishya)",
    Gurukul: "Student (Vidyarthi)",
    Trust: "Member / Patron",
  },
  FinancialOffering: {
    Mandir: "Chanda / Hundi / Daan",
    Ashram: "Guru Dakshina / Bhiksha",
    Gurukul: "Vidyadaan / Shulka",
    Trust: "Corpus Contribution",
  },
  PrimaryActivity: {
    Mandir: "Pooja, Darshan & Aarti",
    Ashram: "Satsang, Sadhana & Japa",
    Gurukul: "Veda Patha & Adhyayan",
    Trust: "Seva Project & Karyakram",
  },
  Kitchen: {
    Mandir: "Mahaprasad / Naivedyam",
    Ashram: "Bhojan Prasadam",
    Gurukul: "Gurukul Annadanam",
    Trust: "Community Kitchen",
  },
  SacredInventory: {
    Mandir: "Ratna Bhandar & Samagri",
    Ashram: "Ashram Bhandar",
    Gurukul: "Pathashala Samagri",
    Trust: "Trust Asset Ledger",
  },
};

export default dharmicTaxonomy;
