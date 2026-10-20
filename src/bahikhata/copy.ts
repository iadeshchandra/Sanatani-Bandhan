/* Bahi-Khata Seva — module-local copy in EN / BN / HI (the module     */
/* precedent is pathshala/bn.ts: sacred terms stay Sanatani, the        */
/* chrome speaks the user's language). Any other app language falls     */
/* back to English rather than showing a wrong tongue.                  */

export type BkLang = 'en' | 'bn' | 'hi';

export function bkLangOf(currentLang: string | null | undefined): BkLang {
  const l = String(currentLang || 'en').toLowerCase();
  if (l === 'bn') return 'bn';
  if (l === 'hi' || l === 'sa' || l === 'mr') return 'hi';
  return 'en';
}

type Dict = Record<string, { en: string; bn: string; hi: string }>;

export const BK: Dict = {
  doorTitle: { en: '📖 Bahi-Khata Seva', bn: '📖 বহি-খাতা সেবা', hi: '📖 बही-खाता सेवा' },
  doorSub: {
    en: 'Bring the paper register into the app — page by page, checked by a trustee before anything becomes real.',
    bn: 'কাগজের খাতা পাতা ধরে ধরে অ্যাপে তুলুন — ট্রাস্টি যাচাই করার আগে কিছুই চূড়ান্ত হবে না।',
    hi: 'कागज़ का रजिस्टर पृष्ठ-दर-पृष्ठ ऐप में लाएँ — ट्रस्टी की जाँच से पहले कुछ भी अंतिम नहीं होगा।',
  },
  whatEntering: { en: 'What are you entering?', bn: 'কী তুলছেন?', hi: 'क्या दर्ज कर रहे हैं?' },
  targetHerd: { en: '🐄 Gai — the herd', bn: '🐄 গাই — গোশালা', hi: '🐄 गाय — गोशाला' },
  targetMembers: { en: '🙏 Members', bn: '🙏 সদস্য', hi: '🙏 सदस्य' },
  targetDonors: { en: '🪔 Donors & dan-khata', bn: '🪔 দাতা ও দান-খাতা', hi: '🪔 दाता व दान-बही' },
  howEntering: { en: 'How?', bn: 'কীভাবে?', hi: 'कैसे?' },
  modeRegister: { en: '✍️ Type from the register', bn: '✍️ খাতা দেখে লিখুন', hi: '✍️ रजिस्टर देखकर लिखें' },
  modeCsv: { en: '📄 Bring a file (CSV)', bn: '📄 ফাইল আনুন (CSV)', hi: '📄 फ़ाइल लाएँ (CSV)' },
  modePhotoSoon: { en: '📷 Photo the page — coming in Phase 2', bn: '📷 পাতার ছবি — দ্বিতীয় পর্যায়ে আসছে', hi: '📷 पृष्ठ की फ़ोटो — चरण 2 में आएगा' },
  modeVoiceSoon: { en: '🎙️ Speak it — coming in Phase 3', bn: '🎙️ বলে বলুন — তৃতীয় পর্যায়ে আসছে', hi: '🎙️ बोलकर कहें — चरण 3 में आएगा' },
  myBatches: { en: 'Batches', bn: 'ব্যাচসমূহ', hi: 'बैच' },
  awaitingReview: { en: 'Waiting for your review', bn: 'আপনার যাচাইয়ের অপেক্ষায়', hi: 'आपकी जाँच की प्रतीक्षा में' },
  noBatches: { en: 'No batches yet. Start one above — the paper book is safe: nothing becomes real until approval.', bn: 'এখনো কোনো ব্যাচ নেই। উপরে একটি শুরু করুন — কাগজের খাতাই নিরাপদ: অনুমোদনের আগে কিছুই চূড়ান্ত নয়।', hi: 'अभी कोई बैच नहीं। ऊपर से एक शुरू करें — कागज़ की बही सुरक्षित है: स्वीकृति से पहले कुछ भी अंतिम नहीं।' },
  stateDraft: { en: 'Draft', bn: 'খসড়া', hi: 'मसौदा' },
  statePending: { en: 'Waiting for approval', bn: 'অনুমোদনের অপেক্ষায়', hi: 'स्वीकृति की प्रतीक्षा' },
  stateApproved: { en: 'Approved', bn: 'অনুমোদিত', hi: 'स्वीकृत' },
  stateRejected: { en: 'Sent back', bn: 'ফেরত পাঠানো', hi: 'वापस भेजा' },
  stateCommitted: { en: 'Committed ✓', bn: 'সম্পন্ন ✓', hi: 'पूर्ण ✓' },
  rowsWord: { en: 'rows', bn: 'টি সারি', hi: 'पंक्तियाँ' },
  continueBtn: { en: 'Continue', bn: 'চালিয়ে যান', hi: 'जारी रखें' },
  reviewBtn: { en: 'Review', bn: 'যাচাই করুন', hi: 'जाँचें' },
  viewBtn: { en: 'View', bn: 'দেখুন', hi: 'देखें' },
  deleteBtn: { en: 'Delete', bn: 'মুছুন', hi: 'हटाएँ' },
  backBtn: { en: '← Back', bn: '← ফিরে যান', hi: '← वापस' },
  batchLabel: { en: 'Which book & pages? (e.g. Gai khata vol. 3, pages 12–15)', bn: 'কোন খাতা ও পৃষ্ঠা? (যেমন: গাই খাতা খণ্ড ৩, পৃষ্ঠা ১২–১৫)', hi: 'कौन-सी बही व पृष्ठ? (जैसे: गाय बही खंड 3, पृष्ठ 12–15)' },
  pageWord: { en: 'Page', bn: 'পৃষ্ঠা', hi: 'पृष्ठ' },
  pageDone: { en: 'Page done ✓ — next page', bn: 'পৃষ্ঠা শেষ ✓ — পরের পৃষ্ঠা', hi: 'पृष्ठ पूर्ण ✓ — अगला पृष्ठ' },
  sameForNext: { en: 'Same for next rows:', bn: 'পরের সারিগুলোতেও একই:', hi: 'अगली पंक्तियों में भी यही:' },
  addRow: { en: '＋ Add this row', bn: '＋ এই সারি যোগ করুন', hi: '＋ यह पंक्ति जोड़ें' },
  updateRow: { en: '✓ Save changes', bn: '✓ পরিবর্তন রাখুন', hi: '✓ परिवर्तन रखें' },
  cancelEdit: { en: 'Cancel edit', bn: 'সম্পাদনা বাতিল', hi: 'संपादन रद्द करें' },
  undoLast: { en: '↩ Undo last row', bn: '↩ শেষ সারি ফিরিয়ে নিন', hi: '↩ अंतिम पंक्ति वापस लें' },
  attachPhoto: { en: '📷 Photo of this page', bn: '📷 এই পৃষ্ঠার ছবি', hi: '📷 इस पृष्ठ की फ़ोटो' },
  photoAttached: { en: 'Page photo saved ✓', bn: 'পৃষ্ঠার ছবি রাখা হয়েছে ✓', hi: 'पृष्ठ फ़ोटो सहेजा गया ✓' },
  photoFailed: { en: 'Photo could not be saved on this device — the rows are safe; try again.', bn: 'ছবিটি এই ডিভাইসে রাখা যায়নি — সারিগুলো নিরাপদ আছে; আবার চেষ্টা করুন।', hi: 'फ़ोटो इस डिवाइस पर सहेजा नहीं गया — पंक्तियाँ सुरक्षित हैं; फिर प्रयास करें।' },
  submitForReview: { en: 'Submit for trustee review →', bn: 'ট্রাস্টির যাচাইয়ের জন্য পাঠান →', hi: 'ट्रस्टी जाँच हेतु भेजें →' },
  submittedToast: { en: 'Batch sent for review. Nothing is final until approval.', bn: 'ব্যাচ যাচাইয়ের জন্য পাঠানো হয়েছে। অনুমোদনের আগে কিছুই চূড়ান্ত নয়।', hi: 'बैच जाँच हेतु भेजा गया। स्वीकृति से पहले कुछ भी अंतिम नहीं।' },
  draftSaved: { en: 'Draft saves itself as you type — stop anytime, lose nothing.', bn: 'লিখলেই খসড়া নিজে নিজে সংরক্ষিত হয় — যেকোনো সময় থামুন, কিছুই হারাবে না।', hi: 'लिखते ही मसौदा स्वयं सहेजा जाता है — कभी भी रुकें, कुछ नहीं खोएगा।' },
  rowAdded: { en: 'Row added', bn: 'সারি যোগ হয়েছে', hi: 'पंक्ति जोड़ी गई' },
  optional: { en: 'optional', bn: 'ঐচ্ছিক', hi: 'वैकल्पिक' },
  reviewTitle: { en: 'Review this batch', bn: 'এই ব্যাচ যাচাই করুন', hi: 'इस बैच की जाँच करें' },
  reviewIntro: {
    en: 'Rows needing a look are first. Duplicates are already marked off. Fields the system filled in are shown honestly — check them against the paper.',
    bn: 'যেসব সারি দেখা দরকার সেগুলো প্রথমে। নকলগুলো আগেই আলাদা করা। সিস্টেম যেসব ঘর নিজে পূরণ করেছে তা সততার সঙ্গে দেখানো হয়েছে — কাগজের সঙ্গে মিলিয়ে দেখুন।',
    hi: 'जिन पंक्तियों को देखना है वे पहले हैं। दोहराव पहले से अलग किए गए हैं। सिस्टम ने जो खाने स्वयं भरे हैं वे ईमानदारी से दिखाए गए हैं — कागज़ से मिलाकर देखें।',
  },
  groupNeedsFix: { en: 'Needs a look', bn: 'দেখা দরকার', hi: 'देखना आवश्यक' },
  groupDuplicates: { en: 'Duplicates (kept out)', bn: 'নকল (বাদ দেওয়া)', hi: 'दोहराव (बाहर रखे)' },
  groupOk: { en: 'Ready rows', bn: 'প্রস্তুত সারি', hi: 'तैयार पंक्तियाँ' },
  assumedLine: { en: '{field} assumed “{value}” — {count} rows', bn: '{field} ধরে নেওয়া হয়েছে “{value}” — {count}টি সারি', hi: '{field} “{value}” माना गया — {count} पंक्तियाँ' },
  includeRow: { en: 'Include', bn: 'রাখুন', hi: 'शामिल करें' },
  excludeRow: { en: 'Keep out', bn: 'বাদ দিন', hi: 'बाहर रखें' },
  editRow: { en: 'Edit', bn: 'বদলান', hi: 'बदलें' },
  pagePhotos: { en: '📷 The paper pages', bn: '📷 কাগজের পৃষ্ঠাগুলো', hi: '📷 कागज़ के पृष्ठ' },
  openingTitle: { en: 'Opening balance (from the paper book)', bn: 'প্রারম্ভিক জের (কাগজের খাতা থেকে)', hi: 'प्रारंभिक शेष (कागज़ की बही से)' },
  openingIntro: {
    en: 'One honest line carries the past — individual old entries are never recreated. Only you (the approver) can add it, and only after checking the paper.',
    bn: 'একটি সৎ লাইনেই অতীত বহন করা হয় — পুরনো প্রতিটি হিসাব আর তৈরি করা হয় না। শুধু আপনিই (অনুমোদক) এটি যোগ করতে পারেন, কাগজ যাচাই করার পরেই।',
    hi: 'एक ईमानदार पंक्ति ही अतीत को वहन करती है — पुरानी हर प्रविष्टि पुनः नहीं बनाई जाती। केवल आप (स्वीकर्ता) ही इसे जोड़ सकते हैं, कागज़ जाँचने के बाद ही।',
  },
  openingAmount: { en: 'Opening balance amount', bn: 'প্রারম্ভিক জেরের পরিমাণ', hi: 'प्रारंभिक शेष राशि' },
  openingFund: { en: 'Fund name (e.g. General Fund)', bn: 'তহবিলের নাম (যেমন: সাধারণ তহবিল)', hi: 'निधि का नाम (जैसे: सामान्य निधि)' },
  openingAsOf: { en: 'Balance as of date', bn: 'জেরের তারিখ', hi: 'शेष की तिथि' },
  openingVerify: { en: 'I have verified this against the paper book ✓', bn: 'আমি কাগজের খাতার সঙ্গে মিলিয়ে দেখেছি ✓', hi: 'मैंने कागज़ की बही से मिलान कर लिया है ✓' },
  approveCommit: { en: '✓ Approve & Commit', bn: '✓ অনুমোদন ও সম্পন্ন করুন', hi: '✓ स्वीकृत करें व पूर्ण करें' },
  committing: { en: 'Committing…', bn: 'সম্পন্ন হচ্ছে…', hi: 'पूर्ण हो रहा…' },
  committedToast: { en: 'Batch committed — {added} records are now real.', bn: 'ব্যাচ সম্পন্ন — {added}টি রেকর্ড এখন চূড়ান্ত।', hi: 'बैच पूर्ण — {added} अभिलेख अब अंतिम हैं।' },
  rejectBtn: { en: 'Send back with a reason', bn: 'কারণসহ ফেরত পাঠান', hi: 'कारण सहित वापस भेजें' },
  rejectPlaceholder: { en: 'Speak plainly — the entrant will read this (e.g. “3 phone numbers look wrong — page 13”)', bn: 'সহজ করে লিখুন — যিনি তুলেছেন তিনি পড়বেন (যেমন: “৩টি ফোন নম্বর ভুল মনে হচ্ছে — পৃষ্ঠা ১৩”)', hi: 'सरल शब्दों में लिखें — दर्ज करने वाला इसे पढ़ेगा (जैसे: “3 फ़ोन नंबर ग़लत लगते हैं — पृष्ठ 13”)' },
  rejectedBanner: { en: 'Sent back by the reviewer:', bn: 'যাচাইকারী ফেরত পাঠিয়েছেন:', hi: 'जाँचकर्ता ने वापस भेजा:' },
  withdrawBtn: { en: 'Withdraw to draft', bn: 'খসড়ায় ফিরিয়ে নিন', hi: 'मसौदे में वापस लें' },
  readOnlyNote: { en: 'This batch is waiting for an approver. You can look, but not change it.', bn: 'এই ব্যাচ অনুমোদকের অপেক্ষায়। আপনি দেখতে পারেন, বদলাতে পারবেন না।', hi: 'यह बैच स्वीकर्ता की प्रतीक्षा में है। आप देख सकते हैं, बदल नहीं सकते।' },
  cannotApproveNote: { en: 'Your role can enter data but not approve this batch — a trustee (or accountant, for donors) approves it on this device.', bn: 'আপনার ভূমিকায় তথ্য তোলা যায় কিন্তু এই ব্যাচ অনুমোদন করা যায় না — ট্রাস্টি (দাতার ক্ষেত্রে হিসাবরক্ষকও) এই ডিভাইসেই অনুমোদন করবেন।', hi: 'आपकी भूमिका से डेटा दर्ज हो सकता है पर यह बैच स्वीकृत नहीं हो सकता — ट्रस्टी (दाताओं हेतु लेखाकार भी) इसी डिवाइस पर स्वीकृत करेंगे।' },
  csvTitle: { en: 'Bring a file', bn: 'ফাইল আনুন', hi: 'फ़ाइल लाएँ' },
  csvPick: { en: 'Choose a .csv file', bn: '.csv ফাইল বেছে নিন', hi: '.csv फ़ाइल चुनें' },
  csvXlsxNote: {
    en: 'Have an Excel file (.xlsx)? In Excel: File → Save As → choose “CSV (Comma delimited)” — then bring that file here. Your original Excel file stays untouched.',
    bn: 'Excel ফাইল (.xlsx) আছে? Excel-এ: File → Save As → “CSV (Comma delimited)” বেছে নিন — তারপর সেই ফাইলটি এখানে আনুন। আপনার মূল Excel ফাইল অক্ষত থাকবে।',
    hi: 'Excel फ़ाइल (.xlsx) है? Excel में: File → Save As → “CSV (Comma delimited)” चुनें — फिर वह फ़ाइल यहाँ लाएँ। आपकी मूल Excel फ़ाइल अछूती रहेगी।',
  },
  csvMapTitle: { en: 'Match the file’s columns', bn: 'ফাইলের কলাম মিলিয়ে দিন', hi: 'फ़ाइल के स्तंभ मिलाएँ' },
  csvMapIntro: { en: 'We guessed from the column names — correct anything that looks wrong. The matching is remembered for the next file from the same office.', bn: 'কলামের নাম দেখে আমরা অনুমান করেছি — যা ভুল মনে হয় ঠিক করে দিন। এই মিল পরের একই অফিসের ফাইলের জন্য মনে রাখা হবে।', hi: 'स्तंभों के नाम देखकर हमने अनुमान लगाया है — जो ग़लत लगे उसे ठीक कर दें। यह मिलान उसी कार्यालय की अगली फ़ाइल हेतु याद रखा जाएगा।' },
  csvIgnore: { en: '— not in the file —', bn: '— ফাইলে নেই —', hi: '— फ़ाइल में नहीं —' },
  csvCreateBatch: { en: 'Create review batch →', bn: 'যাচাই ব্যাচ তৈরি করুন →', hi: 'जाँच बैच बनाएँ →' },
  csvBatchCreated: { en: 'Batch created — review it before anything becomes real.', bn: 'ব্যাচ তৈরি হয়েছে — কিছু চূড়ান্ত হওয়ার আগে যাচাই করুন।', hi: 'बैच बन गया — कुछ भी अंतिम होने से पहले जाँचें।' },
  csvNoRows: { en: 'No rows could be read from that file. Is it a CSV with a header row?', bn: 'ওই ফাইল থেকে কোনো সারি পড়া যায়নি। এটি কি শিরোনামসহ CSV?', hi: 'उस फ़ाइल से कोई पंक्ति नहीं पढ़ी गई। क्या यह शीर्षक-पंक्ति वाली CSV है?' },
  csvTemplate: { en: '⬇ Download a blank template', bn: '⬇ ফাঁকা নমুনা নামান', hi: '⬇ खाली नमूना डाउनलोड करें' },
  summaryAdded: { en: 'added', bn: 'যোগ হয়েছে', hi: 'जोड़े गए' },
  summarySkipped: { en: 'duplicates kept out', bn: 'নকল বাদ', hi: 'दोहराव बाहर' },
  summaryTreasury: { en: 'treasury lines', bn: 'কোষাগারে লাইন', hi: 'कोष पंक्तियाँ' },
  summaryOpening: { en: 'opening balance written', bn: 'প্রারম্ভিক জের লেখা হয়েছে', hi: 'प्रारंभिक शेष लिखा गया' },
  enteredBy: { en: 'Entered by', bn: 'তুলেছেন', hi: 'दर्जकर्ता' },
  reviewedBy: { en: 'Reviewed by', bn: 'যাচাই করেছেন', hi: 'जाँचकर्ता' },
  lifetimeLabel: { en: 'Lifetime given before this year (from paper)', bn: 'এ বছরের আগের মোট দান (কাগজ থেকে)', hi: 'इस वर्ष से पूर्व का कुल दान (कागज़ से)' },
  lineLabel: { en: 'One recent gift from the register (optional)', bn: 'খাতা থেকে একটি সাম্প্রতিক দান (ঐচ্ছিক)', hi: 'बही से एक हाल का दान (वैकल्पिक)' },
};

/** Field labels (register column names) per language. */
export const FIELD_LABELS: Record<string, { en: string; bn: string; hi: string }> = {
  name: { en: 'Name', bn: 'নাম', hi: 'नाम' },
  tagId: { en: 'Tag / ear no.', bn: 'ট্যাগ / কানের নম্বর', hi: 'टैग / कान नंबर' },
  breed: { en: 'Breed', bn: 'জাত', hi: 'नस्ल' },
  sex: { en: 'Gai / Shar / Bachhda', bn: 'গাই / ষাঁড় / বাছুর', hi: 'गाय / साँड़ / बछड़ा' },
  ageYears: { en: 'Age (years)', bn: 'বয়স (বছর)', hi: 'आयु (वर्ष)' },
  arrivalYear: { en: '…or year she came', bn: '…অথবা আসার বছর', hi: '…या आने का वर्ष' },
  source: { en: 'How she came', bn: 'কীভাবে এসেছে', hi: 'कैसे आई' },
  notes: { en: 'Note', bn: 'মন্তব্য', hi: 'टिप्पणी' },
  fullName: { en: 'Full name', bn: 'পুরো নাম', hi: 'पूरा नाम' },
  phone: { en: 'Phone', bn: 'ফোন', hi: 'फ़ोन' },
  gotra: { en: 'Gotra', bn: 'গোত্র', hi: 'गोत्र' },
  address: { en: 'Village / address', bn: 'গ্রাম / ঠিকানা', hi: 'गाँव / पता' },
  sevaTier: { en: 'Seva tier', bn: 'সেবা স্তর', hi: 'सेवा स्तर' },
  spiritualName: { en: 'Spiritual name', bn: 'আধ্যাত্মিক নাম', hi: 'आध्यात्मिक नाम' },
  email: { en: 'Email', bn: 'ইমেইল', hi: 'ईमेल' },
  lifetimeDonated: { en: 'Lifetime given (before this year)', bn: 'মোট দান (এ বছরের আগে)', hi: 'कुल दान (इस वर्ष से पूर्व)' },
  donationDate: { en: 'Gift date', bn: 'দানের তারিখ', hi: 'दान की तिथि' },
  donationAmount: { en: 'Gift amount', bn: 'দানের পরিমাণ', hi: 'दान राशि' },
  purpose: { en: 'Occasion (as written)', bn: 'উপলক্ষ (যেভাবে লেখা)', hi: 'अवसर (जैसा लिखा)' },
  paymentMode: { en: 'How given', bn: 'কীভাবে দিয়েছেন', hi: 'कैसे दिया' },
  receiptNo: { en: 'Paper receipt no.', bn: 'কাগজের রসিদ নং', hi: 'कागज़ रसीद नं.' },
};

export function bk(lang: BkLang, key: keyof typeof BK, vars?: Record<string, string | number>): string {
  const entry = BK[key];
  let s = entry ? entry[lang] || entry.en : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

export function fieldLabel(lang: BkLang, key: string): string {
  const e = FIELD_LABELS[key];
  return e ? e[lang] || e.en : key;
}
