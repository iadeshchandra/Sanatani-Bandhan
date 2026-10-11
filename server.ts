import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // Initialize Gemini API client lazily / gracefully with optional user-supplied API key
  const getGenAI = (customKey?: string) => {
    const apiKey = (customKey && customKey.trim().length > 5) ? customKey.trim() : process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      platform: "Sanatani Bandhan Enterprise",
      version: "3.2.0",
      time: new Date().toISOString(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });


  // Verify / Test User's Custom Gemini API Key
  app.post("/api/gemini/validate-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return res.status(400).json({ success: false, error: "Please provide a valid Gemini API key" });
      }
      const ai = getGenAI(apiKey);
      if (!ai) {
        return res.status(400).json({ success: false, error: "Could not initialize AI client with provided key" });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "Respond in 2 words: Key Verified",
      });
      res.json({ success: true, message: response.text || "Key verified successfully!" });
    } catch (err: any) {
      console.error("API Key Validation error:", err);
      res.status(400).json({ success: false, error: err.message || "Invalid or unauthorized API key" });
    }
  });

  // Dharma Marketing AI Generation Route
  app.post("/api/gemini/dharma-marketing", async (req, res) => {
    try {
      const {
        festivalOrTopic,
        workspaceType = "Mandir",
        workspaceName = "Sri Sanatan Mandir",
        targetPlatform = "WhatsApp",
        language = "English",
        customInstructions = "",
      } = req.body;

      const ai = getGenAI();
      if (!ai) {
        // Fallback intelligent Vedic generator if API key is not yet attached
        const fallbackResponse = {
          headline: `🕉️ Auspicious ${festivalOrTopic || "Utsav"} Celebrations at ${workspaceName}`,
          postBody: `॥ श्री गुरुभ्यो नमः ॥\n\nDear Dharmic Devotees,\n\nWe cordially invite you and your family to join us for the sacred celebrations of ${festivalOrTopic || "Special Mahotsav"} at ${workspaceName}.\n\n📅 Date: Auspicious Tithi\n⏰ Timings: 6:00 AM Mangala Aarti to 8:30 PM Maha Pushpanjali\n📍 Venue: ${workspaceName} Main Hall\n\nMay the divine blessings of Prabhu bring eternal peace, prosperity, and spiritual elevation to your household.\n\nPrasadam & Mahapuja seva sponsorships are open. Contact the Seva desk to book your Sankalp.\n\n#SanataniBandhan #${festivalOrTopic?.replace(/\s+/g, "") || "VedicUtsav"} #Dharma #SanatanSeva`,
          hashtags: [
            "#SanatanDharma",
            `#${festivalOrTopic?.replace(/\s+/g, "") || "Utsav"}`,
            "#VedicCulture",
            "#BhaktiSeva",
            "#MandirMahotsav",
          ],
          callToAction: "Book Sankalp & Prasad Seva online at Sanatani Bandhan Portal",
          shlokaSnippet: "सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः । सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत् ॥",
          isMock: true,
        };
        return res.json({ success: true, result: fallbackResponse });
      }

      const prompt = `You are the Vedic Marketing Strategist and Sanskrit scholar for "Sanatani Bandhan".
Generate a high-converting, culturally reverent, and inspiring promotional campaign packet for a Hindu organization.

Context:
- Organization Type: ${workspaceType}
- Organization Name: ${workspaceName}
- Event / Festival / Topic: ${festivalOrTopic}
- Primary Channel: ${targetPlatform} (e.g. WhatsApp Broadcast, Instagram/Facebook, Temple Poster, Email Newsletter)
- Output Language: ${language} (English / Hindi / Bengali or mixed with Sanskrit invocation)
- Additional Notes: ${customInstructions}

Return ONLY valid JSON matching this schema:
{
  "headline": "Short captivating headline with auspicious emojis",
  "postBody": "Well-formatted body text with bullet points, timings, Sankalp invitations, and spiritual context",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "callToAction": "Clear step for devotees (e.g. how to donate, join, or register)",
  "shlokaSnippet": "An authentic relevant Sanskrit Shloka with English transliteration or meaning",
  "whatsappSnippet": "Short 3-paragraph condensed broadcast suitable for instant WhatsApp copy-paste"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, result: parsed });
    } catch (err: any) {
      console.error("Dharma Marketing AI error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to generate Dharma Marketing packet",
      });
    }
  });

  // Trilingual Shloka Analysis & Commentary Route
  app.post("/api/gemini/shloka-explain", async (req, res) => {
    try {
      const { shlokaText, contextVerse = "" } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          success: true,
          result: {
            sanskrit: shlokaText || "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
            transliteration: "karmaṇy-evādhikāras te mā phaleṣu kadācana, mā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi",
            wordByWord: "karmaṇi (in duty) eva (only) adhikāraḥ (right) te (your)...",
            englishMeaning: "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.",
            hindiMeaning: "तुम्हारा कर्म करने में ही अधिकार है, उसके फलों में कभी नहीं। इसलिए तुम कर्मफल के हेतु मत बनो और न ही तुम्हारी अकर्मण्यता में आसक्ति हो।",
            bengaliMeaning: "কর্মেতেই তোমার অধিকার আছে, কিন্তু তার ফলে কখনোই তোমার অধিকার নেই। কর্মফলের হেতু হয়ো না এবং কর্মত্যাগে তোমার প্রবৃত্তি যেন না হয়।",
            practicalApplication: "Focus 100% on the dedication, purity, and excellence of your daily seva without anxiety over worldly praise.",
            sourceText: "Bhagavad Gita - Chapter 2, Verse 47",
            isMock: true,
          },
        });
      }

      const prompt = `Analyze this sacred Vedic Shloka or Mantra:
Verse: "${shlokaText}"
${contextVerse ? `Context/Source: ${contextVerse}` : ""}

Provide authentic, scriptural trilingual exposition (English, Hindi, Bengali) with word-by-word breakups and modern practical application for community sevadars.

Return ONLY valid JSON matching this schema:
{
  "sanskrit": "Devanagari script",
  "transliteration": "IAST romanized script",
  "wordByWord": "Concise word-by-word meanings",
  "englishMeaning": "Refined English translation",
  "hindiMeaning": "Authentic Hindi translation",
  "bengaliMeaning": "Authentic Bengali translation",
  "practicalApplication": "Practical lesson for modern life and Seva",
  "sourceText": "Reference scripture (e.g. Gita, Upanishad, Rigveda)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, result: parsed });
    } catch (err: any) {
      console.error("Shloka explain error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to analyze Shloka",
      });
    }
  });

  // Dedicated Context-Aware Dharmic Query Assistant Route
  app.post("/api/gemini/dharmic-assistant", async (req, res) => {
    try {
      const {
        prompt,
        activeModule = "dashboard",
        workspaceType = "Mandir",
        workspaceName = "Sri Sanatan Mandir",
        sampradaya = "Sanatan Vaidika Tradition",
        language = "en", // 'en' | 'hi' | 'bn' | 'sa'
        contextMode = "auto", // 'auto' | 'scriptural' | 'administrative' | 'rituals'
        conversationHistory = [],
        customApiKey,
        apiKey,
        systemInstruction: clientSystemInstruction,
        panchangContext,
        location,
        activeFestivals,
        aartiSchedule,
      } = req.body;

      const ai = getGenAI(customApiKey || apiKey);

      // Module-specific fallback knowledge base for instant high-fidelity responses
      const getModuleFallback = (mod: string, query: string) => {
        const lowerMod = (mod || "").toLowerCase();
        const lowerQuery = (query || "").toLowerCase();

        if (lowerMod.includes("treasury") || lowerMod.includes("tax") || lowerMod.includes("karma") || lowerQuery.includes("fund") || lowerQuery.includes("donation") || lowerQuery.includes("money") || lowerQuery.includes("chanda")) {
          return {
            title: `Dharmic Treasury & Fiduciary Transparency (${workspaceType})`,
            summary: `In Sanatan tradition, temple funds (Devadravya) are considered sacred trusts. The Arthashastra and Smritis stipulate that every Karshapana (rupee) must have strict double-entry verification to preserve spiritual integrity and donor trust.`,
            shloka: `धर्मेणार्थः समाहार्यो धर्मेणैव च पाल्यते।\nधर्मेणैव विनियोगश्च सर्वकल्याणकारकः॥`,
            shlokaTransliteration: `dharmeṇārthaḥ samāhāryo dharmeṇaiva ca pālyate,\ndharmeṇaiva viniyogaśca sarvakalyāṇakārakaḥ.`,
            shlokaMeaning: `Wealth must be gathered with righteousness, preserved with righteousness, and disbursed with righteousness for the welfare of all beings.`,
            scriptureSource: `Kautilya Arthashastra - Adhikarana 2`,
            guidancePoints: [
              `Ensure every Chanda, Pranami, or Hundi collection is promptly classified into General Corpus or Specific Seva Sankalpa.`,
              `Generate Section 80G tax receipts with automated sequential serial numbering to maintain compliance with both civil law and Dharmic accountability.`,
              `Segregate discretionary expenditures from dedicated Pujari Dakshina and Annadanam funds to avoid cross-contamination of dedicated donations.`,
              `Conduct monthly two-trustee digital audits via the Audit Log to uphold absolute fiduciary transparency.`
            ],
            moduleActions: [
              { label: "Log Chanda in Treasury Ledger", targetModule: "treasury-ledger", tip: "Record double-entry donation entry with donor receipt" },
              { label: "Issue 80G Tax Certificate", targetModule: "tax-receipt-80g", tip: "Generate instant PDF certificate for income tax exemption" },
              { label: "Review Security Audit Trail", targetModule: "security-audit-log", tip: "Verify tamper-proof ledger entries" }
            ],
            suggestedQueries: [
              "How to classify Hundi cash collection vs Corpus donations?",
              "What are the Dharmic principles of temple endowment management?",
              "How to maintain donor privacy while ensuring audit transparency?"
            ],
            isMock: !ai
          };
        }

        if (lowerMod.includes("pooja") || lowerMod.includes("aarti") || lowerMod.includes("purohit") || lowerMod.includes("pitru") || lowerMod.includes("panchang") || lowerQuery.includes("puja") || lowerQuery.includes("sankalp") || lowerQuery.includes("ritual")) {
          return {
            title: `Sacred Vedic Ritual Protocols & Sankalp Vidhi`,
            summary: `Vedic rituals (Karmakanda) require alignment of Desha (place), Kaala (auspicious time/Muhurat), Patra (qualified Purohit/Yajamana), and Dravya (pure Samagri). Maintaining precise Gotra-Pravara and Nakshatra records ensures optimal spiritual fruition of the Sankalpa.`,
            shloka: `यज्ञार्थात्कर्मणोऽन्यत्र लोकोऽयं कर्मबन्धनः।\nतदर्थं कर्म कौन्तेय मुक्तसङ्गः समाचर॥`,
            shlokaTransliteration: `yajñārthāt karmaṇo 'nyatra loko 'yaṁ karma-bandhanaḥ,\ntad-arthaṁ karma kaunteya mukta-saṅgaḥ samācara.`,
            shlokaMeaning: `Work done as a sacrifice for the Supreme must be performed; otherwise work causes bondage in this material world. Therefore, perform your duties for His satisfaction, without attachment.`,
            scriptureSource: `Srimad Bhagavad Gita - Chapter 3, Verse 9`,
            guidancePoints: [
              `Verify the Yajamana's Gotra, Pravara, and Janma Nakshatra prior to initiating the Mahasankalp to prevent ritual discrepancies.`,
              `Cross-verify Rahu Kaal, Yamaganda, and Gulika Kaal on the Live Panjika Desk before scheduling major Abhishekams or Havans.`,
              `Ensure all booked Purohits have their Dakshina schedules and Samagri checklists pre-synchronized via SMS/WhatsApp Sandesh.`,
              `For Pitru Tarpan and Shradh, ensure the rituals are performed during the Aparahna Kaal (afternoon Tithi overlap) as prescribed by Dharma Sindhu.`
            ],
            moduleActions: [
              { label: "Open Rituals & Sankalp Hub", targetModule: "pooja-booking", tip: "Reserve Yajamana slots and assign Vedic scholars" },
              { label: "Consult Live Vedic Panjika", targetModule: "panchang-muhurat", tip: "Check Tithi, Nakshatra, and auspicious Muhurats" },
              { label: "View Daily Aarti Roster", targetModule: "aarti-roster", tip: "Coordinate daily temple Sevak shifts and Naivedyam" }
            ],
            suggestedQueries: [
              "What are the essential Samagri items for Rudrabhishek?",
              "How to handle Shradh Tithi when two Tithis overlap during Aparahna?",
              "Which Nakshatras are most auspicious for Griha Pravesh and Vivah?"
            ],
            isMock: !ai
          };
        }

        if (lowerMod.includes("gau") || lowerMod.includes("goshala") || lowerQuery.includes("cow") || lowerQuery.includes("gomata")) {
          return {
            title: `Vedic Go-Seva & Goshala Management Standards`,
            summary: `Gomata is revered in Sanatan Dharma as the abode of all Devas (Sarva-Devamayee). Proper care of indigenous Desi breeds (Gir, Sahiwal, Tharparkar, Rathi) through organic fodder, clean water, and medicinal herbs generates boundless spiritual merit (Punya).`,
            shloka: `गावो ममाग्रतो नित्यं गावः पृष्ठत एव च।\nगावो मे सर्वतश्चैव गवां मध्ये वसाम्यहम्॥`,
            shlokaTransliteration: `gāvo mamāgrato nityaṁ gāvaḥ pṛṣṭhata eva ca,\ngāvo me sarvataścaiva gavāṁ madhye vasāmyaham.`,
            shlokaMeaning: `May cows always be before me; may cows always be behind me; may cows be on all sides of me; I dwell in the very midst of cows.`,
            scriptureSource: `Mahabharata - Anushasana Parva`,
            guidancePoints: [
              `Maintain digitized medical and lactation records for all resident Gomata and Nandi bulls in the Goshala Sanctuary module.`,
              `Organize seasonal Panchagavya preparation (milk, curd, ghee, gomutra, gomaya) for Ayurvedic applications and agricultural nutrition.`,
              `Facilitate monthly Go-Grasa and Go-Daan sponsorship linkages for devotees looking to fulfill ancestral or astrological remedies.`,
              `Ensure round-the-clock veterinary checkup logs and dry/green fodder ratios (60:40) to maintain herd vitality.`
            ],
            moduleActions: [
              { label: "Open Goshala Records Desk", targetModule: "gau-seva-goshala", tip: "Track Gomata profiles, lineage, and medical histories" },
              { label: "Manage Fodder & Medicine Store", targetModule: "store-inventory", tip: "Monitor grass stock and Ayurvedic supplements" }
            ],
            suggestedQueries: [
              "What is the shastric significance of Go-Daan during Pitru Paksha?",
              "How to produce authentic Pancha-Gavya organic fertilizer?",
              "How to set up recurring monthly Go-Seva adoption tiers for devotees?"
            ],
            isMock: !ai
          };
        }

        if (lowerMod.includes("annadanam") || lowerQuery.includes("food") || lowerQuery.includes("prasadam") || lowerQuery.includes("kitchen")) {
          return {
            title: `Maha-Prasadam Purity (Shaucha) & Annadanam Governance`,
            summary: `Anna-Daan is the supreme charity (Mahadaanam) because food sustains Prana in all living entities. Preparing Maha-Prasadam with highest Shaucha (internal and external purity) elevates routine nourishment into divine nectar.`,
            shloka: `अन्नाद्भवन्ति भूतानि पर्जन्यादन्नसम्भवः।\nयज्ञाद्भवति पर्जन्यो यज्ञः कर्मसमुद्भवः॥`,
            shlokaTransliteration: `annād bhavanti bhūtāni parjanyād anna-sambhavaḥ,\nyajñād bhavati parjanyo yajñaḥ karma-samudbhavaḥ.`,
            shlokaMeaning: `All living bodies subsist on food grains, which are produced from rains. Rains are produced by performance of sacrifice, and sacrifice is born of prescribed duties.`,
            scriptureSource: `Srimad Bhagavad Gita - Chapter 3, Verse 14`,
            guidancePoints: [
              `Enforce strict kitchen Shaucha: Cook sevadars must take snana, chant holy mantras during preparation, and avoid tasting food prior to divine offering (Naivedyam).`,
              `Calculate ration requirements using standardized yield ratios: 100g raw rice per person yields ~250g cooked Prasadam.`,
              `Track sponsor names and Sankalps so that daily Annadanam meals are dedicated with the sponsor's Gotra and family intention.`,
              `Ensure zero food wastage through synchronized meal token dispatch via SMS/WhatsApp.`
            ],
            moduleActions: [
              { label: "Open Annadanam Kitchen Desk", targetModule: "annadanam-kitchen", tip: "Manage meal counts, batches, and ingredient stock" },
              { label: "Record Ration Inventory", targetModule: "store-inventory", tip: "Track rice, dal, ghee, and spice supplies" }
            ],
            suggestedQueries: [
              "How to calculate bulk Annadanam ingredients for 1,000 devotees?",
              "What are the classical Shaucha rules for temple kitchen sevadars?",
              "How to link Annadanam sponsorships with devotee Gotra Sankalp?"
            ],
            isMock: !ai
          };
        }

        // Default holistic Dharmic Guidance
        return {
          title: `Sanatan Institutional Guidance (${workspaceType} • ${activeModule})`,
          summary: `Sanatani Bandhan empowers Hindu organizations with unified Dharmic discipline, combining scriptural authenticity (Shastra Pramana) with modern institutional governance (Yukti).`,
          shloka: `सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।\nधर्मात् न प्रमदितव्यम्। कुशलात् न प्रमदितव्यम्॥`,
          shlokaTransliteration: `satyaṁ vada, dharmaṁ cara, svādhyāyān mā pramadaḥ,\ndharmān na pramaditavyam, kuśalān na pramaditavyam.`,
          shlokaMeaning: `Speak the truth. Conduct yourself righteously. Never deviate from sacred study. Never neglect Dharma. Never neglect your own well-being and excellence.`,
          scriptureSource: `Taittiriya Upanishad - Shikshavalli (1.11.1)`,
          guidancePoints: [
            `Maintain synchronized records across Devotee CRM, Lineage trees, and Treasury ledgers to eliminate organizational friction.`,
            `Engage your community regularly using customized WhatsApp/SMS Sandesh for Tithi alerts, festival invitations, and Seva drives.`,
            `Uphold strict data security and role-based permissions (Trustee, Pujari, Auditor, Devotee) to protect community privacy.`,
            `Leverage the 10-workspace taxonomy matrix to ensure all terminology honors your specific tradition (${sampradaya}).`
          ],
          moduleActions: [
            { label: "Visit Devotee & Member Directory", targetModule: "devotee-grid", tip: "Manage registrations and Smart Passes" },
            { label: "Check Live Panjika & Muhurat", targetModule: "panchang-muhurat", tip: "View astrological Tithis and festival dates" },
            { label: "Dispatch WhatsApp Broadcast", targetModule: "whatsapp-broadcaster", tip: "Send announcements to devotee groups" }
          ],
          suggestedQueries: [
            "How do I set up custom Seva tiers for regular donors?",
            "What are the best practices for organizing large Utsav footfall?",
            "How to record 7-generation ancestral Vanshavali records?"
          ],
          isMock: !ai
        };
      };

      if (!ai) {
        const fallbackData = getModuleFallback(activeModule, prompt);
        return res.json({
          success: true,
          result: fallbackData,
          isMock: true,
          note: "Operating in high-fidelity Dharmic Knowledge Base mode. Connect GEMINI_API_KEY for dynamic real-time neural responses."
        });
      }

      const baseInstruction = clientSystemInstruction || `You are the official Dharmic AI Copilot for ${workspaceName} located in ${location || 'Bharat'}.
Your mission is to provide deep, authoritative, culturally reverent, and actionable guidance combining:
1. Authentic Hindu Scriptures (Vedas, Upanishads, Bhagavad Gita, Dharmashastras, Puranas, Agamas, Arthashastra, Chanakya Niti).
2. Live Temple & Panchang context:
   - Organization: ${workspaceName} (${workspaceType})
   - Location: ${location || 'Bharat'}
   - Panchang: ${typeof panchangContext === 'object' ? JSON.stringify(panchangContext) : (panchangContext || 'Live Daily Panchang')}
   - Active Festivals/Vrats: ${activeFestivals || 'Nitya Seva & Puja'}
   - Temple Aarti Timings: ${aartiSchedule || 'Mangala, Madhyahna, Sandhya, and Shayana Aarti'}
   - Sampradaya: ${sampradaya}
   - Output Language: ${language} (en: English, hi: Hindi, bn: Bengali, sa: Sanskrit)`;

      const systemInstruction = `${baseInstruction}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Provide an authentic Sanskrit verse (Shloka/Mantra) in Devanagari script with IAST transliteration, meaning, and scripture reference whenever suitable.
2. Deliver a clear, authoritative summary and 3-5 concise, highly actionable guidance points.
3. Be conversational, reverent, and directly address user queries on scriptures, rituals, fasts, temple timings, or temple operations.
4. Suggest 3 concise follow-up questions the user can ask next.

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "Concise, auspicious title for this guidance",
  "summary": "Clear, direct, authoritative explanation answering the user inquiry",
  "shloka": "Optional Sanskrit verse in Devanagari script if applicable (or empty string)",
  "shlokaTransliteration": "IAST romanized pronunciation (or empty string)",
  "shlokaMeaning": "Meaning in the requested language (or empty string)",
  "scriptureSource": "Exact scripture source (e.g. Bhagavad Gita 2.47, Garuda Purana, Dharma Sindhu)",
  "guidancePoints": [
    "Actionable point 1",
    "Actionable point 2",
    "Actionable point 3"
  ],
  "moduleActions": [
    { "label": "Action button text", "targetModule": "${activeModule}", "tip": "Short explanation" }
  ],
  "suggestedQueries": [
    "Relevant follow up question 1",
    "Relevant follow up question 2",
    "Relevant follow up question 3"
  ]
}`;

      const historyFormatted = (conversationHistory || []).slice(-4).map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.text }]
      }));

      const contents = [
        ...historyFormatted,
        {
          role: "user",
          parts: [{ text: `Devotee Query regarding [${activeModule}]: ${prompt}` }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.4,
        }
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.text || "{}");
      } catch (pe) {
        parsed = {
          title: "Dharmic AI Response",
          summary: response.text || "Guidance received.",
          guidancePoints: [],
          suggestedQueries: ["What are the rules for Ekadashi fasting?", "When is the next evening aarti?", "What samagri is needed for Satyanarayan Puja?"]
        };
      }

      return res.json({
        success: true,
        result: parsed,
        isMock: false
      });
    } catch (err: any) {
      console.error("Dharmic Query Assistant error:", err);
      // Fallback on error gracefully
      const fallback = {
        title: "Dharmic Guidance Overview",
        summary: `Guidance on ${req.body.prompt || "Sanatan institutional duty"} is processed with Vedic reverence.`,
        shloka: "यतो धर्मस्ततो जयः ॥",
        shlokaTransliteration: "yato dharmastato jayaḥ",
        shlokaMeaning: "Where there is righteousness and adherence to sacred duty, there is victory.",
        scriptureSource: "Mahabharata - Bhishma Parva",
        guidancePoints: [
          "Follow prescribed temple Shaucha (cleanliness) and ritual protocols.",
          "Verify the exact Tithi and Muhurat with the temple Panjika before commencing major rituals.",
          "Contact the Purohit desk or temple administrative office for custom Sankalp bookings."
        ],
        suggestedQueries: [
          "What are the rules for Ekadashi fasting?",
          "When is the next evening aarti?",
          "What samagri is needed for Satyanarayan Puja?"
        ],
        isMock: true,
      };
      return res.json({
        success: true,
        result: fallback,
        isMock: true,
        error: err.message
      });
    }
  });

  // Generic Vedic Assistant Query Route
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          success: true,
          text: `Namaste! Sanatani Bandhan AI Assistant is ready. To enable live Gemini neural queries, configure your GEMINI_API_KEY in the Secrets panel. System operating in Dharmic rule-based mode.`,
          isMock: true,
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction:
            systemInstruction ||
            "You are Sanatani Bandhan AI, an expert in Hindu scriptures, Sanskrit, Panjika, Mandir administration, and Vedic rituals.",
        },
      });

      return res.json({ success: true, text: response.text });
    } catch (err: any) {
      console.error("Gemini query error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in development vs Static files in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      // Do not intercept API requests
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        if (vite && typeof vite.ssrFixStacktrace === "function") {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🕉️ Sanatani Bandhan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server boot error:", err);
});
