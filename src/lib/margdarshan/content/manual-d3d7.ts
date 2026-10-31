import type { ManualEntry } from '../manualTypes';

export const MANUAL_D3D7: Record<string, ManualEntry> = {
  'poojaBooking': {
    whatItDoes: {
      en: 'This is where devotees book a puja or sankalp, and the booking reaches the right purohit without phone calls getting lost. The priest, purohits and trustees see the same list, so nothing is promised twice.',
      hi: 'यहाँ भक्त puja या sankalp की booking करते हैं, और booking सही purohit तक पहुँचती है — फोन पर बातें खोती नहीं। Priest, purohit और trustee एक ही सूची देखते हैं, इसलिए एक ही समय दो जगह वादा नहीं होता।',
      bn: 'এখানে ভক্তরা puja বা sankalp বুক করেন, আর সেই বুকিং সঠিক purohit-এর কাছে পৌঁছে যায় — ফোনের কথা হারিয়ে যায় না। Priest, purohit ও trustee একই তালিকা দেখেন, তাই একই সময়ে দুই জায়গায় কথা দেওয়া হয় না।'
    },
    realLifeExample: {
      en: 'A daughter in Kolkata books a Satyanarayan puja for her parents\' home in the village and writes the family sankalp with it. The village purohit sees the date, time and sankalp in his own diary, and arrives prepared — no one had to chase anyone on the phone.',
      hi: 'Kolkata में रहने वाली एक बेटी गाँव में अपने माता-पिता के घर के लिए Satyanarayan puja book करती है और परिवार का sankalp साथ लिख देती है। गाँव के purohit को तारीख, समय और sankalp अपनी diary में दिख जाता है, और वे तैयारी के साथ पहुँचते हैं — किसी को फोन पर भागना नहीं पड़ा।',
      bn: 'কলকাতায় থাকা এক মেয়ে গ্রামে বাবা-মায়ের বাড়ির জন্য Satyanarayan puja বুক করেন এবং পরিবারের sankalp সঙ্গে লিখে দেন। গ্রামের purohit তারিখ, সময় ও sankalp নিজের diary-তে দেখতে পান এবং প্রস্তুতি নিয়ে পৌঁছান — কাউকে ফোনে ছোটাছুটি করতে হয়নি।'
    },
    steps: [
      {
        en: 'Open Rituals & Sankalp Hub and start a new booking for the puja you need.',
        hi: 'Rituals & Sankalp Hub खोलें और जिस puja की ज़रूरत है, उसकी नई booking शुरू करें।',
        bn: 'Rituals & Sankalp Hub খুলুন এবং যে puja দরকার, তার নতুন বুকিং শুরু করুন।'
      },
      {
        en: 'Choose the date and time after checking the day in the panchang, and write the sankalp clearly.',
        hi: 'Panchang में दिन देखकर तारीख और समय चुनें, और sankalp साफ़-साफ़ लिखें।',
        bn: 'Panchang-এ দিন দেখে তারিখ ও সময় বেছে নিন, আর sankalp স্পষ্ট করে লিখুন।'
      },
      {
        en: 'Add the family name, place and any special request, then confirm the booking.',
        hi: 'परिवार का नाम, स्थान और कोई विशेष निवेदन जोड़ें, फिर booking पक्की करें।',
        bn: 'পরিবারের নাম, স্থান ও কোনো বিশেষ অনুরোধ যোগ করুন, তারপর বুকিং নিশ্চিত করুন।'
      },
      {
        en: 'Check the booking list before the day, so the purohit and the family are ready together.',
        hi: 'दिन से पहले booking सूची देख लें, ताकि purohit और परिवार दोनों तैयार रहें।',
        bn: 'দিনের আগে বুকিং তালিকা দেখে নিন, যাতে purohit ও পরিবার দুজনেই প্রস্তুত থাকেন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Fixing the date from the calendar alone, without checking tithi and muhurat first — a puja booked on the wrong tithi has to be moved later.',
        hi: 'केवल calendar देखकर तारीख पक्की करना, पहले tithi और muhurat न देखना — गलत tithi पर book हुई puja बाद में बदलनी पड़ती है।',
        bn: 'শুধু calendar দেখে তারিখ ঠিক করা, আগে tithi ও muhurat না দেখা — ভুল tithi-তে বুক করা puja পরে বদলাতে হয়।'
      },
      {
        en: 'Writing the sankalp in short or unclear words. The purohit speaks what is written, so names and gotra should be full and correct.',
        hi: 'Sankalp छोटे या अस्पष्ट शब्दों में लिखना। Purohit वही बोलते हैं जो लिखा है, इसलिए नाम और gotra पूरे और सही होने चाहिए।',
        bn: 'Sankalp ছোট বা অস্পষ্ট কথায় লেখা। Purohit যা লেখা থাকে তাই বলেন, তাই নাম ও gotra পুরো ও সঠিক হওয়া চাই।'
      },
      {
        en: 'Booking the same puja in two places or with two purohits. Keep one booking in one place, so the whole family sees the same promise.',
        hi: 'एक ही puja दो जगह या दो purohits के पास book करना। एक booking एक ही जगह रखें, ताकि पूरे परिवार को एक ही वादा दिखे।',
        bn: 'একই puja দুই জায়গায় বা দুই purohit-এর কাছে বুক করা। একটা বুকিং এক জায়গাতেই রাখুন, যাতে পুরো পরিবার একই প্রতিশ্রুতি দেখে।'
      }
    ],
    capabilities: [
      {
        en: 'Book pujas and sankalp in advance, with date, time and family details together.',
        hi: 'Puja और sankalp पहले से book करें — तारीख, समय और परिवार का विवरण एक साथ।',
        bn: 'Puja ও sankalp আগে থেকে বুক করুন — তারিখ, সময় ও পরিবারের বিবরণ একসঙ্গে।'
      },
      {
        en: 'Share the same booking list with the priest, purohits and trustees.',
        hi: 'एक ही booking सूची priest, purohits और trustees के साथ साझा करें।',
        bn: 'একই বুকিং তালিকা priest, purohit ও trustee-দের সঙ্গে ভাগ করুন।'
      },
      {
        en: 'Keep each booking with its sankalp, so preparation starts from the right words.',
        hi: 'हर booking के साथ उसका sankalp रखें, ताकि तैयारी सही शब्दों से शुरू हो।',
        bn: 'প্রতিটি বুকিংয়ের সঙ্গে তার sankalp রাখুন, যাতে প্রস্তুতি সঠিক কথা থেকে শুরু হয়।'
      }
    ],
    worksOffline: true
  },
  'mandirPuja': {
    whatItDoes: {
      en: 'This desk holds the daily rhythm of worship — the aarti and puja schedule for each day, with reminders so no aarti is missed. Trustees and purohits work from the same schedule, even when different people serve on different days.',
      hi: 'यह desk पूजा की रोज़ की लय संभालता है — हर दिन की aarti और puja का कार्यक्रम, reminders के साथ ताकि कोई aarti छूटे नहीं। Trustee और purohit एक ही कार्यक्रम से काम करते हैं, चाहे अलग-अलग दिन अलग-अलग लोग सेवा करें।',
      bn: 'এই desk পুজোর রোজকার ছন্দ ধরে রাখে — প্রতিদিনের aarti ও puja-র সূচি, reminders সহ যাতে কোনো aarti বাদ না যায়। Trustee ও purohit একই সূচি থেকে কাজ করেন, আলাদা দিনে আলাদা লোক seba করলেও।'
    },
    realLifeExample: {
      en: 'A small trust has no full-time staff, and three sevadars take turns opening the doors in the morning. Each one sees the same day\'s aarti times and puja list on the phone, so the morning aarti happens at the right time whoever comes.',
      hi: 'एक छोटे trust के पास कोई स्थायी कर्मचारी नहीं है, और 3 sevadar बारी-बारी से सुबह द्वार खोलते हैं। हर एक को फोन पर उसी दिन की aarti का समय और puja सूची दिखती है, इसलिए सुबह की aarti सही समय पर होती है, चाहे कोई भी आए।',
      bn: 'একটি ছোট trust-এর কোনো স্থায়ী কর্মী নেই, আর ৩ জন sevadar পালা করে সকালে দরজা খোলেন। প্রত্যেকে ফোনে সেই দিনের aarti-র সময় ও puja তালিকা দেখতে পান, তাই যেই আসুন সকালের aarti ঠিক সময়ে হয়।'
    },
    steps: [
      {
        en: 'Open Daily Aarti & Pujas and set the regular aarti and puja times for each day.',
        hi: 'Daily Aarti & Pujas खोलें और हर दिन के नियमित aarti और puja समय तय करें।',
        bn: 'Daily Aarti & Pujas খুলুন এবং প্রতিদিনের নিয়মিত aarti ও puja-র সময় ঠিক করুন।'
      },
      {
        en: 'Add special pujas for festivals and special tithis on top of the daily schedule.',
        hi: 'रोज़ के कार्यक्रम के ऊपर त्योहारों और विशेष tithis की विशेष pujas जोड़ें।',
        bn: 'রোজকার সূচির ওপরে উৎসব ও বিশেষ tithi-র বিশেষ puja যোগ করুন।'
      },
      {
        en: 'Check the day\'s list in the morning, so flowers, prasad and other needs are ready before aarti.',
        hi: 'सुबह उस दिन की सूची देख लें, ताकि aarti से पहले फूल, prasad और बाकी ज़रूरतें तैयार रहें।',
        bn: 'সকালে সেই দিনের তালিকা দেখে নিন, যাতে aarti-র আগে ফুল, prasad ও বাকি প্রয়োজন তৈরি থাকে।'
      },
      {
        en: 'When a time changes for a festival or a special day, update the schedule at once so everyone sees the new time.',
        hi: 'जब किसी त्योहार या विशेष दिन पर समय बदले, कार्यक्रम तुरंत बदलें ताकि सबको नया समय दिखे।',
        bn: 'কোনো উৎসব বা বিশেষ দিনে সময় বদলালে সূচি সঙ্গে সঙ্গে বদলে দিন, যাতে সবাই নতুন সময় দেখতে পান।'
      }
    ],
    commonMistakes: [
      {
        en: 'Keeping festival times only in someone\'s memory. If that person is away, the aarti time is lost — write every change in the schedule.',
        hi: 'त्योहार के समय केवल किसी की याद में रखना। वह व्यक्ति न हो तो aarti का समय खो जाता है — हर बदलाव कार्यक्रम में लिखें।',
        bn: 'উৎসবের সময় শুধু কারো মনে রাখা। সেই মানুষ না থাকলে aarti-র সময় হারিয়ে যায় — প্রতিটি বদল সূচিতে লিখুন।'
      },
      {
        en: 'Leaving the old time in place after a seasonal change. Morning and evening aarti shift with the season, and an old time quietly misleads devotees.',
        hi: 'मौसम बदलने के बाद पुराना समय छोड़ देना। सुबह-शाम की aarti मौसम के साथ बदलती है, और पुराना समय भक्तों को चुपचाप भटका देता है।',
        bn: 'ঋতু বদলের পর পুরনো সময় রেখে দেওয়া। সকাল-সন্ধ্যার aarti ঋতুর সঙ্গে বদলায়, আর পুরনো সময় ভক্তদের নীরবে ভুল পথে নেয়।'
      }
    ],
    capabilities: [
      {
        en: 'Keep the daily aarti and puja schedule in one shared place.',
        hi: 'रोज़ का aarti और puja कार्यक्रम एक साझा जगह पर रखें।',
        bn: 'রোজকার aarti ও puja সূচি এক ভাগ-করা জায়গায় রাখুন।'
      },
      {
        en: 'Get reminders for aartis and pujas, so the day\'s worship is not missed.',
        hi: 'Aarti और puja के reminders पाएँ, ताकि दिन की पूजा छूटे नहीं।',
        bn: 'Aarti ও puja-র reminders পান, যাতে দিনের পুজো বাদ না যায়।'
      },
      {
        en: 'Add festival and special-day pujas over the regular daily rhythm.',
        hi: 'नियमित रोज़ की लय के ऊपर त्योहार और विशेष दिनों की pujas जोड़ें।',
        bn: 'নিয়মিত রোজকার ছন্দের ওপরে উৎসব ও বিশেষ দিনের puja যোগ করুন।'
      }
    ],
    worksOffline: true
  },
  'purohitDesk': {
    whatItDoes: {
      en: 'This is the purohit\'s own diary — bookings, dakshina received, and the daily discipline of service, kept in one place instead of scattered notebooks. It helps a purohit see the week ahead clearly and keep honest accounts.',
      hi: 'यह purohit की अपनी diary है — bookings, मिली हुई dakshina, और सेवा का रोज़ का अनुशासन, बिखरी हुई कॉपियों की जगह एक जगह पर। इससे purohit को आने वाला सप्ताह साफ़ दिखता है और हिसाब ईमानदारी से रहता है।',
      bn: 'এটি purohit-এর নিজের diary — বুকিং, পাওয়া dakshina, আর সেবার রোজকার শৃঙ্খলা, ছড়ানো খাতার বদলে এক জায়গায়। এতে purohit সামনের সপ্তাহ স্পষ্ট দেখতে পান এবং হিসাব সত্‌ভাবে থাকে।'
    },
    realLifeExample: {
      en: 'A purohit serves five families in nearby villages and used to carry three small notebooks. Now his bookings and dakshina sit in one diary — on Sunday evening he sees the whole coming week, and at month\'s end the family accounts add up without argument.',
      hi: 'एक purohit पास के गाँवों में 5 परिवारों की सेवा करते हैं और पहले 3 छोटी कॉपियाँ लेकर चलते थे। अब उनकी bookings और dakshina एक ही diary में हैं — रविवार शाम को उन्हें पूरा आने वाला सप्ताह दिखता है, और महीने के अंत में परिवारों का हिसाब बिना बहस के मिल जाता है।',
      bn: 'একজন purohit কাছের গ্রামে ৫টি পরিবারের সেবা করেন এবং আগে ৩টি ছোট খাতা নিয়ে চলতেন। এখন তাঁর বুকিং ও dakshina এক diary-তেই আছে — রবিবার সন্ধ্যায় তিনি পুরো আসন্ন সপ্তাহ দেখতে পান, আর মাসের শেষে পরিবারগুলির হিসাব বিতর্ক ছাড়াই মিলে যায়।'
    },
    steps: [
      {
        en: 'Open Purohit Diary & Dakshina and add each booking as soon as a family confirms it.',
        hi: 'Purohit Diary & Dakshina खोलें और जैसे ही कोई परिवार booking पक्की करे, उसे जोड़ दें।',
        bn: 'Purohit Diary & Dakshina খুলুন এবং কোনো পরিবার বুকিং নিশ্চিত করলেই তা যোগ করুন।'
      },
      {
        en: 'Write the puja, place, time and sankalp with the booking, so the day needs no second phone call.',
        hi: 'Booking के साथ puja, स्थान, समय और sankalp लिखें, ताकि उस दिन दूसरे फोन की ज़रूरत न पड़े।',
        bn: 'বুকিংয়ের সঙ্গে puja, স্থান, সময় ও sankalp লিখুন, যাতে সেই দিন দ্বিতীয় ফোনের দরকার না পড়ে।'
      },
      {
        en: 'Record the dakshina on the same day it is received, while the memory is fresh.',
        hi: 'Dakshina उसी दिन लिखें जिस दिन मिले, जब बात ताज़ा याद हो।',
        bn: 'Dakshina যেদিন পাবেন সেদিনই লিখুন, যখন কথা তাজা মনে আছে।'
      },
      {
        en: 'Look at the week ahead each evening, and prepare the next day\'s pujas in peace.',
        hi: 'हर शाम आने वाला सप्ताह देखें, और अगले दिन की pujas शांति से तैयार करें।',
        bn: 'প্রতিদিন সন্ধ্যায় সামনের সপ্তাহ দেখুন, আর পরের দিনের puja শান্তিতে প্রস্তুত করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Writing dakshina down days later from memory. Small amounts get forgotten or mixed between families — same-day writing keeps the account clean.',
        hi: 'Dakshina कई दिन बाद याद से लिखना। छोटी रकमें भूल जाती हैं या परिवारों के बीच मिल जाती हैं — उसी दिन लिखने से हिसाब साफ़ रहता है।',
        bn: 'Dakshina কয়েক দিন পরে মনে করে লেখা। ছোট অঙ্ক ভুলে যাওয়া যায় বা পরিবারের মধ্যে গুলিয়ে যায় — সেদিনই লিখলে হিসাব পরিষ্কার থাকে।'
      },
      {
        en: 'Accepting two bookings at the same time in different villages. Check the diary before saying yes — travel takes time too.',
        hi: 'अलग-अलग गाँवों में एक ही समय पर 2 bookings मान लेना। हाँ कहने से पहले diary देखें — आने-जाने में भी समय लगता है।',
        bn: 'আলাদা গ্রামে একই সময়ে ২টি বুকিং মেনে নেওয়া। হ্যাঁ বলার আগে diary দেখুন — যাতায়াতেও সময় লাগে।'
      },
      {
        en: 'Keeping family bookings only on paper that can be lost. A diary on the phone stays with you and syncs when the network returns.',
        hi: 'परिवारों की bookings केवल खो सकने वाले कागज़ पर रखना। फोन की diary हमेशा साथ रहती है और network लौटते ही sync हो जाती है।',
        bn: 'পরিবারগুলির বুকিং শুধু হারিয়ে যেতে পারে এমন কাগজে রাখা। ফোনের diary সবসময় সঙ্গে থাকে এবং network ফিরলেই sync হয়ে যায়।'
      }
    ],
    capabilities: [
      {
        en: 'Keep all bookings in one diary, with puja, place, time and sankalp together.',
        hi: 'सभी bookings एक diary में रखें — puja, स्थान, समय और sankalp एक साथ।',
        bn: 'সব বুকিং এক diary-তে রাখুন — puja, স্থান, সময় ও sankalp একসঙ্গে।'
      },
      {
        en: 'Record dakshina booking by booking, so accounts stay clear and honest.',
        hi: 'Dakshina booking के हिसाब से लिखें, ताकि हिसाब साफ़ और ईमानदार रहे।',
        bn: 'Dakshina বুকিং অনুযায়ী লিখুন, যাতে হিসাব পরিষ্কার ও সত্‌ থাকে।'
      },
      {
        en: 'Follow a daily discipline view alongside the work of the day.',
        hi: 'दिन के काम के साथ रोज़ के अनुशासन का दृश्य भी देखें।',
        bn: 'দিনের কাজের পাশাপাশি রোজকার শৃঙ্খলার দৃশ্যও দেখুন।'
      }
    ],
    worksOffline: true
  },
  'purohitMarket': {
    realLifeExample: {
      en: 'A small trust needs a scholar for a special yajna that no local purohit performs. Through this marketplace the trustees find a verified scholar from another town, agree the date in advance, and the yajna happens with the right vidhi instead of being dropped.',
      hi: 'एक छोटे trust को एक विशेष yajna के लिए विद्वान चाहिए, जो कोई स्थानीय purohit नहीं करते। इस marketplace से trustees को दूसरे शहर के सत्यापित विद्वान मिलते हैं, तारीख पहले तय हो जाती है, और yajna सही vidhi से होता है — छूटता नहीं।',
      bn: 'একটি ছোট trust-এর একটি বিশেষ yajna-র জন্য বিদ্বান দরকার, যা কোনো স্থানীয় purohit করেন না। এই marketplace থেকে trustee-রা অন্য শহরের যাচাই-করা বিদ্বান পান, তারিখ আগে ঠিক হয়ে যায়, আর yajna সঠিক vidhi-তে হয় — বাদ যায় না।'
    },
    commonMistakes: [
      {
        en: 'Calling a scholar at the last moment for a rare ritual. Verified scholars are few and their calendars fill early — search and book well before the tithi.',
        hi: 'किसी दुर्लभ अनुष्ठान के लिए अंतिम समय पर विद्वान को बुलाना। सत्यापित विद्वान कम हैं और उनकी diary जल्दी भर जाती है — tithi से काफी पहले खोजें और book करें।',
        bn: 'কোনো দুর্লভ অনুষ্ঠানের জন্য শেষ মুহূর্তে বিদ্বানকে ডাকা। যাচাই-করা বিদ্বান কম এবং তাঁদের diary তাড়াতাড়ি ভরে যায় — tithi-র অনেক আগে খুঁজুন ও বুক করুন।'
      },
      {
        en: 'Not checking the verification and the ritual a scholar is known for. The right scholar for one vidhi may not be the right one for another.',
        hi: 'किसी विद्वान का सत्यापन और वे किस अनुष्ठान के लिए जाने जाते हैं, यह न देखना। एक vidhi के लिए सही विद्वान दूसरी के लिए सही न हों, ऐसा हो सकता है।',
        bn: 'কোনো বিদ্বানের যাচাই এবং তিনি কোন অনুষ্ঠানের জন্য পরিচিত, তা না দেখা। এক vidhi-র জন্য সঠিক বিদ্বান অন্য vidhi-র জন্য সঠিক নাও হতে পারেন।'
      }
    ],
    capabilities: [
      {
        en: 'Find KYC-verified scholars and purohits for a ritual, near or far.',
        hi: 'किसी अनुष्ठान के लिए, पास या दूर के, KYC-सत्यापित विद्वान और purohit खोजें।',
        bn: 'কোনো অনুষ্ঠানের জন্য, কাছে বা দূরের, KYC-যাচাই করা বিদ্বান ও purohit খুঁজুন।'
      },
      {
        en: 'Reach the right scholar for a special ritual that local purohits do not perform.',
        hi: 'उस विशेष अनुष्ठान के लिए सही विद्वान तक पहुँचें, जो स्थानीय purohit नहीं करते।',
        bn: 'সেই বিশেষ অনুষ্ঠানের জন্য সঠিক বিদ্বানের কাছে পৌঁছান, যা স্থানীয় purohit করেন না।'
      }
    ],
    worksOffline: true
  },
  'pitruShradh': {
    whatItDoes: {
      en: 'This desk keeps the shradh tithis of families safe and reminds them before the day passes. Pitru seva depends on the tithi, not the calendar date — this desk watches the tithi so a family never learns of it a day late.',
      hi: 'यह desk परिवारों की shradh tithis सुरक्षित रखता है और दिन बीतने से पहले उन्हें याद दिलाता है। Pitru seva calendar की तारीख पर नहीं, tithi पर निर्भर है — यह desk tithi पर नज़र रखता है ताकि किसी परिवार को एक दिन देर से पता न चले।',
      bn: 'এই desk পরিবারগুলির shradh tithi নিরাপদে রাখে এবং দিন পেরিয়ে যাওয়ার আগে তাদের মনে করিয়ে দেয়। Pitru seba calendar-এর তারিখের ওপর নয়, tithi-র ওপর নির্ভর করে — এই desk tithi-র দিকে নজর রাখে যাতে কোনো পরিবার এক দিন দেরিতে না জানে।'
    },
    realLifeExample: {
      en: 'A son working in another city almost missed his father\'s shradh last year because the tithi fell on a different calendar date. This year the reminder came days before Pitru Paksha, he travelled home in time, and the shradh was offered with the whole family present.',
      hi: 'दूसरे शहर में काम करने वाला एक बेटा पिछले साल अपने पिता के shradh से लगभग चूक गया था, क्योंकि tithi calendar की दूसरी तारीख पर पड़ी थी। इस साल reminder Pitru Paksha से कई दिन पहले आया, वह समय पर घर पहुँचा, और shradh पूरे परिवार की उपस्थिति में हुआ।',
      bn: 'অন্য শহরে কাজ করা এক ছেলে গত বছর বাবার shradh প্রায় মিস করেছিলেন, কারণ tithi calendar-এর অন্য তারিখে পড়েছিল। এই বছর reminder Pitru Paksha-র কয়েক দিন আগে এল, তিনি সময়মতো বাড়ি পৌঁছলেন, আর shradh পুরো পরিবারের উপস্থিতিতে হল।'
    },
    steps: [
      {
        en: 'Open Pitru Paksha & Shradh Alerts and add the shradh of each departed elder in the family.',
        hi: 'Pitru Paksha & Shradh Alerts खोलें और परिवार के हर दिवंगत बुज़ुर्ग का shradh जोड़ें।',
        bn: 'Pitru Paksha & Shradh Alerts খুলুন এবং পরিবারের প্রতিটি প্রয়াত গুরুজনের shradh যোগ করুন।'
      },
      {
        en: 'Record the tithi of passing carefully, along with the name — the tithi is what returns each year.',
        hi: 'देहांत की tithi नाम के साथ ध्यान से लिखें — हर साल tithi ही लौटती है।',
        bn: 'প্রয়াণের tithi নামের সঙ্গে যত্নে লিখুন — প্রতি বছর tithi-ই ফিরে আসে।'
      },
      {
        en: 'When the alert comes before Pitru Paksha, inform the family and fix the day with the purohit.',
        hi: 'Pitru Paksha से पहले alert आए तो परिवार को बताएँ और purohit के साथ दिन तय करें।',
        bn: 'Pitru Paksha-র আগে alert এলে পরিবারকে জানান এবং purohit-এর সঙ্গে দিন ঠিক করুন।'
      },
      {
        en: 'After the shradh, mark it done, so next year\'s reminder starts from a clean record.',
        hi: 'Shradh के बाद उसे पूर्ण चिह्नित करें, ताकि अगले साल का reminder साफ़ record से शुरू हो।',
        bn: 'Shradh-এর পরে তা সম্পন্ন বলে চিহ্নিত করুন, যাতে পরের বছরের reminder পরিষ্কার record থেকে শুরু হয়।'
      }
    ],
    commonMistakes: [
      {
        en: 'Recording only the Gregorian date of passing. Shradh follows the tithi, which moves against the calendar — record the tithi, not only the date.',
        hi: 'केवल देहांत की Gregorian तारीख लिखना। Shradh tithi के अनुसार होता है, जो calendar के हिसाब से बदलती रहती है — केवल तारीख नहीं, tithi लिखें।',
        bn: 'শুধু প্রয়াণের Gregorian তারিখ লেখা। Shradh tithi অনুযায়ী হয়, যা calendar-এর হিসাবে বদলায় — শুধু তারিখ নয়, tithi লিখুন।'
      },
      {
        en: 'Waiting until Pitru Paksha begins to arrange the purohit and the samagri. Alerts come early so the family can prepare in peace — use that time.',
        hi: 'Purohit और samagri की व्यवस्था के लिए Pitru Paksha शुरू होने तक रुकना। Alerts पहले आते हैं ताकि परिवार शांति से तैयारी कर सके — उस समय का उपयोग करें।',
        bn: 'Purohit ও samagri-র ব্যবস্থার জন্য Pitru Paksha শুরু হওয়া পর্যন্ত অপেক্ষা করা। Alert আগে আসে যাতে পরিবার শান্তিতে প্রস্তুতি নিতে পারে — সেই সময়টা কাজে লাগান।'
      }
    ],
    capabilities: [
      {
        en: 'Keep the shradh tithi of each departed elder recorded safely for the family.',
        hi: 'परिवार के लिए हर दिवंगत बुज़ुर्ग की shradh tithi सुरक्षित लिखकर रखें।',
        bn: 'পরিবারের জন্য প্রতিটি প্রয়াত গুরুজনের shradh tithi নিরাপদে লিখে রাখুন।'
      },
      {
        en: 'Remind families before the shradh tithi passes, especially in Pitru Paksha.',
        hi: 'Shradh tithi बीतने से पहले परिवारों को याद दिलाएँ, विशेषकर Pitru Paksha में।',
        bn: 'Shradh tithi পেরিয়ে যাওয়ার আগে পরিবারগুলিকে মনে করান, বিশেষ করে Pitru Paksha-য়।'
      },
      {
        en: 'Keep a year-by-year record of shradhs offered, family by family.',
        hi: 'किए गए shradhs का साल-दर-साल record रखें, परिवार के हिसाब से।',
        bn: 'করা shradh-গুলির বছর অনুযায়ী record রাখুন, পরিবার অনুযায়ী।'
      }
    ],
    worksOffline: true
  },
  'panchang': {
    realLifeExample: {
      en: 'Before fixing her daughter\'s vivah date, a mother opens the panchang with the purohit and checks the muhurat for three possible days. They choose the day where tithi, nakshatra and muhurat agree, and only then is the hall booked — the date never had to be changed.',
      hi: 'अपनी बेटी के vivah की तारीख तय करने से पहले, एक माँ purohit के साथ panchang खोलकर 3 संभावित दिनों के muhurat देखती हैं। वे वह दिन चुनते हैं जहाँ tithi, nakshatra और muhurat एकमत होते हैं, और तभी hall book होता है — तारीख कभी बदलनी नहीं पड़ी।',
      bn: 'মেয়ের vivah-এর তারিখ ঠিক করার আগে এক মা purohit-এর সঙ্গে panchang খুলে ৩টি সম্ভাব্য দিনের muhurat দেখেন। তাঁরা সেই দিন বেছে নেন যেখানে tithi, nakshatra ও muhurat মিলে যায়, আর তখনই hall বুক হয় — তারিখ কখনও বদলাতে হয়নি।'
    },
    commonMistakes: [
      {
        en: 'Fixing a wedding, griha pravesh or puja date from the plain calendar, without checking muhurat first. The panchang is there to be checked before the date is promised, not after.',
        hi: 'Muhurat देखे बिना केवल calendar से vivah, griha pravesh या puja की तारीख तय करना। Panchang तारीख का वादा करने से पहले देखने के लिए है, बाद में नहीं।',
        bn: 'Muhurat না দেখে শুধু calendar থেকে vivah, griha pravesh বা puja-র তারিখ ঠিক করা। Panchang তারিখের প্রতিশ্রুতি দেওয়ার আগে দেখার জন্য, পরে নয়।'
      },
      {
        en: 'Reading only the tithi and ignoring nakshatra and the day\'s other details. A good muhurat is where the parts agree together.',
        hi: 'केवल tithi पढ़ना और nakshatra व दिन के अन्य विवरणों को छोड़ देना। अच्छा muhurat वही है जहाँ सभी भाग एक साथ मिलते हैं।',
        bn: 'শুধু tithi পড়া এবং nakshatra ও দিনের অন্য বিবরণ উপেক্ষা করা। ভালো muhurat সেখানেই যেখানে সব অংশ একসঙ্গে মেলে।'
      }
    ],
    capabilities: [
      {
        en: 'See tithi, nakshatra and the day\'s panchang details for every day.',
        hi: 'हर दिन के लिए tithi, nakshatra और दिन के panchang विवरण देखें।',
        bn: 'প্রতিদিনের জন্য tithi, nakshatra ও দিনের panchang বিবরণ দেখুন।'
      },
      {
        en: 'Check muhurat before fixing dates for pujas, vivah and other sankalp-based work.',
        hi: 'Puja, vivah और अन्य sankalp वाले कार्यों की तारीख तय करने से पहले muhurat देखें।',
        bn: 'Puja, vivah ও অন্য sankalp-ভিত্তিক কাজের তারিখ ঠিক করার আগে muhurat দেখুন।'
      }
    ],
    worksOffline: true
  },
  'yatranet-gis': {
    whatItDoes: {
      en: 'This desk shows the crowd on a live map during big gatherings, so trustees and the security team can see where people are gathering too thickly. If someone raises an SOS, the team sees where help is needed and can respond before a problem grows.',
      hi: 'यह desk बड़े आयोजनों के दौरान भीड़ को live map पर दिखाता है, ताकि trustee और security team देख सकें कि लोग कहाँ बहुत घने हो रहे हैं। यदि कोई SOS उठाए, तो team को दिखता है कि मदद कहाँ चाहिए, और समस्या बढ़ने से पहले वे पहुँच सकते हैं।',
      bn: 'এই desk বড় জমায়েতের সময় live map-এ ভিড় দেখায়, যাতে trustee ও security team দেখতে পান মানুষ কোথায় খুব ঘন হচ্ছে। কেউ SOS তুললে team দেখতে পায় কোথায় সাহায্য দরকার, আর সমস্যা বাড়ার আগেই পৌঁছাতে পারে।'
    },
    realLifeExample: {
      en: 'On a festival evening, a small trust\'s ground fills faster than expected near the main gate. The sevadar on duty sees the dense patch on the map, opens the side gate and guides families that way — the crowd eases without any pushing or panic.',
      hi: 'त्योहार की एक शाम, एक छोटे trust के मैदान में मुख्य द्वार के पास उम्मीद से तेज़ी से भीड़ भर जाती है। Duty पर मौजूद sevadar map पर घना हिस्सा देखते हैं, बगल का द्वार खोलते हैं और परिवारों को उस ओर ले जाते हैं — भीड़ बिना धक्का-मुक्की या घबराहट के हल्की हो जाती है।',
      bn: 'উৎসবের এক সন্ধ্যায় একটি ছোট trust-এর মাঠে প্রধান দরজার কাছে প্রত্যাশার চেয়ে দ্রুত ভিড় ভরে যায়। Duty-তে থাকা sevadar map-এ ঘন অংশ দেখেন, পাশের দরজা খোলেন এবং পরিবারগুলিকে সেদিকে নিয়ে যান — ধাক্কাধাক্কি বা আতঙ্ক ছাড়াই ভিড় হালকা হয়ে যায়।'
    },
    steps: [
      {
        en: 'Open YatraNet GIS Crowd & SOS before a big gathering and check that the map shows your ground correctly.',
        hi: 'बड़े आयोजन से पहले YatraNet GIS Crowd & SOS खोलें और देखें कि map आपके मैदान को सही दिखा रहा है।',
        bn: 'বড় জমায়েতের আগে YatraNet GIS Crowd & SOS খুলুন এবং দেখুন map আপনার মাঠ সঠিকভাবে দেখাচ্ছে কিনা।'
      },
      {
        en: 'During the event, watch the crowd areas on the map and note where people gather most thickly.',
        hi: 'कार्यक्रम के दौरान map पर भीड़ वाले क्षेत्रों को देखें और नोट करें कि लोग कहाँ सबसे घने हो रहे हैं।',
        bn: 'অনুষ্ঠানের সময় map-এ ভিড়ের এলাকাগুলি দেখুন এবং লক্ষ করুন মানুষ কোথায় সবচেয়ে ঘন হচ্ছে।'
      },
      {
        en: 'If one place grows too dense, send sevadars there and open another way in or out.',
        hi: 'यदि एक जगह बहुत घनी हो जाए, तो वहाँ sevadar भेजें और आने-जाने का दूसरा रास्ता खोलें।',
        bn: 'এক জায়গা খুব ঘন হয়ে গেলে সেখানে sevadar পাঠান এবং ঢোকা-বেরোনোর অন্য পথ খুলুন।'
      },
      {
        en: 'When an SOS appears, go to that spot first, help, and close the alert only after the person is safe.',
        hi: 'जब SOS दिखे, सबसे पहले उस स्थान पर जाएँ, मदद करें, और व्यक्ति के सुरक्षित होने के बाद ही alert बंद करें।',
        bn: 'SOS দেখা গেলে সবার আগে সেই জায়গায় যান, সাহায্য করুন, এবং ব্যক্তি নিরাপদ হওয়ার পরেই alert বন্ধ করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Watching the map but sending no one on the ground. The map only shows the problem — relief happens when a sevadar actually reaches the spot.',
        hi: 'केवल map देखते रहना, पर ज़मीन पर किसी को न भेजना। Map केवल समस्या दिखाता है — राहत तब मिलती है जब कोई sevadar सच में उस स्थान पर पहुँचे।',
        bn: 'শুধু map দেখা কিন্তু মাটিতে কাউকে না পাঠানো। Map শুধু সমস্যা দেখায় — স্বস্তি তখনই আসে যখন কোনো sevadar সত্যিই সেই জায়গায় পৌঁছান।'
      },
      {
        en: 'Waiting for a crowd to become dangerous before acting. A growing dense patch is the time to open another gate, not after people start pushing.',
        hi: 'भीड़ के खतरनाक होने तक कार्रवाई का इंतज़ार करना। बढ़ता हुआ घना हिस्सा ही दूसरा द्वार खोलने का समय है, लोगों के धक्का देने के बाद नहीं।',
        bn: 'ভিড় বিপজ্জনক হওয়া পর্যন্ত ব্যবস্থার অপেক্ষা করা। বাড়তে থাকা ঘন অংশই অন্য দরজা খোলার সময়, মানুষ ধাক্কা দেওয়ার পরে নয়।'
      },
      {
        en: 'Expecting the live map to work without internet. Live crowd and SOS positions need the network — agree a simple ground plan with sevadars before the event as well.',
        hi: 'बिना internet के live map के काम करने की उम्मीद करना। Live भीड़ और SOS स्थानों के लिए network चाहिए — कार्यक्रम से पहले sevadars के साथ एक सरल ज़मीनी योजना भी तय कर लें।',
        bn: 'Internet ছাড়া live map কাজ করবে বলে আশা করা। Live ভিড় ও SOS অবস্থানের জন্য network চাই — অনুষ্ঠানের আগে sevadar-দের সঙ্গে একটি সরল মাঠের পরিকল্পনাও ঠিক করে নিন।'
      }
    ],
    capabilities: [
      {
        en: 'Watch crowd density live on a map during festivals, yatras and melas.',
        hi: 'त्योहारों, yatras और melas के दौरान map पर भीड़ का घनत्व live देखें।',
        bn: 'উৎসব, yatra ও mela-র সময় map-এ ভিড়ের ঘনত্ব live দেখুন।'
      },
      {
        en: 'See SOS alerts with their place, so help reaches the right spot quickly.',
        hi: 'SOS alerts उनके स्थान के साथ देखें, ताकि मदद सही जगह जल्दी पहुँचे।',
        bn: 'SOS alert তার জায়গাসহ দেখুন, যাতে সাহায্য সঠিক জায়গায় দ্রুত পৌঁছায়।'
      },
      {
        en: 'Saved places and records still open offline, while live maps need internet.',
        hi: 'सहेजे गए स्थान और records offline भी खुलते हैं, जबकि live maps के लिए internet चाहिए।',
        bn: 'সংরক্ষিত জায়গা ও record offline-এও খোলে, তবে live map-এর জন্য internet চাই।'
      }
    ],
    worksOffline: false
  },
  'sadhana-karma': {
    whatItDoes: {
      en: 'This is a personal companion for daily practice — japa counters, vratas and the small disciplines of each day, kept gently in one place. It does not judge anyone; it simply helps a devotee keep a promise made to oneself.',
      hi: 'यह रोज़ के अभ्यास के लिए एक व्यक्तिगत साथी है — japa counters, vratas और हर दिन के छोटे अनुशासन, एक जगह पर सहज रूप से रखे हुए। यह किसी को आँकता नहीं; यह केवल भक्त को स्वयं से किया वादा निभाने में मदद करता है।',
      bn: 'এটি রোজকার অনুশীলনের জন্য একটি ব্যক্তিগত সঙ্গী — japa counter, vrata এবং প্রতিদিনের ছোট শৃঙ্খলা, এক জায়গায় সহজে রাখা। এটি কাউকে বিচার করে না; এটি কেবল ভক্তকে নিজের কাছে করা প্রতিশ্রুতি রাখতে সাহায্য করে।'
    },
    realLifeExample: {
      en: 'A devotee mother does 108 japa every morning before the household wakes, and keeps a Monday vrata. Her counter and vrata sit in one place on her phone — on busy days she does a shorter count honestly recorded, and the thread of her sadhana never breaks.',
      hi: 'एक भक्त माँ हर सुबह घर के जागने से पहले 108 japa करती हैं और सोमवार का vrata रखती हैं। उनका counter और vrata फोन पर एक ही जगह पर हैं — व्यस्त दिनों में वे ईमानदारी से लिखा छोटा जाप करती हैं, और उनकी sadhana की डोर कभी टूटती नहीं।',
      bn: 'একজন ভক্ত মা প্রতিদিন সকালে বাড়ির সবাই ওঠার আগে ১০৮ বার japa করেন এবং সোমবারের vrata রাখেন। তাঁর counter ও vrata ফোনে এক জায়গায় আছে — ব্যস্ত দিনে তিনি সত্‌ভাবে লেখা ছোট গণনা করেন, আর তাঁর sadhana-র সুতো কখনও ছেঁড়ে না।'
    },
    steps: [
      {
        en: 'Open Sadhana & Japa Counters and set the japa or practice you want to keep daily.',
        hi: 'Sadhana & Japa Counters खोलें और वह japa या अभ्यास तय करें, जिसे आप रोज़ रखना चाहते हैं।',
        bn: 'Sadhana & Japa Counters খুলুন এবং যে japa বা অনুশীলন রোজ রাখতে চান তা ঠিক করুন।'
      },
      {
        en: 'Use the counter during japa, so the count is kept without beads or paper in hand.',
        hi: 'Japa के दौरान counter का उपयोग करें, ताकि बिना माला या कागज़ हाथ में लिए गिनती बनी रहे।',
        bn: 'Japa-র সময় counter ব্যবহার করুন, যাতে হাতে মালা বা কাগজ ছাড়াই গণনা থাকে।'
      },
      {
        en: 'Mark each vrata day as you keep it, so the record grows truthfully over the months.',
        hi: 'हर vrata का दिन जैसे-जैसे रखें, चिह्नित करें, ताकि record महीनों में सचाई से बढ़े।',
        bn: 'প্রতিটি vrata-র দিন যেমন রাখবেন তেমন চিহ্নিত করুন, যাতে record মাসের পর মাস সত্‌ভাবে বাড়ে।'
      },
      {
        en: 'Look back at the week on a quiet evening, and set the next week\'s practice gently, not harshly.',
        hi: 'किसी शांत शाम को सप्ताह पीछे देखें, और अगले सप्ताह का अभ्यास कोमलता से तय करें, कठोरता से नहीं।',
        bn: 'কোনো শান্ত সন্ধ্যায় সপ্তাহটা ফিরে দেখুন, আর পরের সপ্তাহের অনুশীলন কোমলভাবে ঠিক করুন, কঠোরভাবে নয়।'
      }
    ],
    commonMistakes: [
      {
        en: 'Setting a count so high that it breaks within a week. A small sadhana kept daily for years is worth more than a grand one dropped in days.',
        hi: 'इतनी बड़ी गिनती तय करना कि वह एक सप्ताह में ही टूट जाए। रोज़ वर्षों तक निभाई गई छोटी sadhana, दिनों में छूट जाने वाली बड़ी sadhana से अधिक मूल्यवान है।',
        bn: 'এত বড় গণনা ঠিক করা যে তা এক সপ্তাহেই ভেঙে যায়। বছরের পর বছর রোজ রাখা ছোট sadhana, কয়েক দিনে ছেড়ে দেওয়া বড় sadhana-র চেয়ে বেশি মূল্যবান।'
      },
      {
        en: 'Filling in counts for days that were missed, to make the record look full. The record is for oneself — an honest gap teaches more than a false full page.',
        hi: 'छूटे हुए दिनों की गिनती बाद में भर देना, ताकि record भरा दिखे। Record स्वयं के लिए है — ईमानदार खाली जगह, झूठे भरे पन्ने से अधिक सिखाती है।',
        bn: 'বাদ যাওয়া দিনের গণনা পরে ভরে দেওয়া, যাতে record ভরা দেখায়। Record নিজের জন্য — সত্‌ ফাঁক মিথ্যা ভরা পাতার চেয়ে বেশি শেখায়।'
      }
    ],
    capabilities: [
      {
        en: 'Count japa with a simple counter that keeps the total for the day.',
        hi: 'एक सरल counter से japa गिनें, जो दिन की कुल गिनती संभालकर रखे।',
        bn: 'একটি সরল counter দিয়ে japa গুনুন, যা দিনের মোট গণনা ধরে রাখে।'
      },
      {
        en: 'Keep vratas and daily disciplines recorded in one personal place.',
        hi: 'Vratas और रोज़ के अनुशासनों को एक व्यक्तिगत जगह पर लिखकर रखें।',
        bn: 'Vrata ও রোজকার শৃঙ্খলা এক ব্যক্তিগত জায়গায় লিখে রাখুন।'
      },
      {
        en: 'See the thread of practice over days and months, and begin again calmly after a gap.',
        hi: 'दिनों और महीनों में अभ्यास की डोर देखें, और अंतराल के बाद शांति से फिर शुरू करें।',
        bn: 'দিন ও মাস জুড়ে অনুশীলনের সুতো দেখুন, আর বিরতির পরে শান্তিতে আবার শুরু করুন।'
      }
    ],
    worksOffline: true
  },
  'sanatani-vivah': {
    whatItDoes: {
      en: 'This is the community\'s vivah portal — profiles for brides and grooms that families can verify, kept inside a trusted circle instead of open public sites. It is a place for families to meet with dignity, at their own pace.',
      hi: 'यह समुदाय का vivah portal है — वर और वधू के profiles जिन्हें परिवार सत्यापित कर सकते हैं, खुले सार्वजनिक sites की जगह एक विश्वसनीय घेरे के भीतर। यह परिवारों के लिए सम्मान के साथ, अपनी गति से मिलने की जगह है।',
      bn: 'এটি সম্প্রদায়ের vivah portal — পাত্র ও পাত্রীর profile যা পরিবার যাচাই করতে পারে, খোলা public site-এর বদলে একটি বিশ্বস্ত বলয়ের ভেতরে। এটি পরিবারগুলির জন্য মর্যাদার সঙ্গে, নিজের গতিতে দেখা করার জায়গা।'
    },
    realLifeExample: {
      en: 'A family in a small town is looking for a match for their son, but does not trust open matrimonial sites. In this portal they see a profile from a known community family, verify the basic details through people they both know, and the first meeting happens at a family home, not a stranger\'s office.',
      hi: 'एक छोटे शहर का परिवार अपने बेटे के लिए रिश्ता खोज रहा है, पर खुले matrimonial sites पर भरोसा नहीं करता। इस portal में उन्हें एक परिचित समुदाय-परिवार का profile दिखता है, वे दोनों के परिचित लोगों से बुनियादी विवरण सत्यापित करते हैं, और पहली मुलाकात किसी अजनबी के office में नहीं, एक परिवार के घर पर होती है।',
      bn: 'একটি ছোট শহরের পরিবার ছেলের জন্য পাত্রী খুঁজছে, কিন্তু খোলা matrimonial site-এ ভরসা করে না। এই portal-এ তারা একটি পরিচিত সম্প্রদায়-পরিবারের profile দেখে, দুজনের পরিচিত মানুষের মাধ্যমে মূল বিবরণ যাচাই করে, আর প্রথম দেখা কোনো অপরিচিতের office-এ নয়, একটি পরিবারের বাড়িতে হয়।'
    },
    steps: [
      {
        en: 'Open Sanatani Vivah Portal and create the profile with true, complete family details.',
        hi: 'Sanatani Vivah Portal खोलें और सच्चे, पूरे पारिवारिक विवरण के साथ profile बनाएँ।',
        bn: 'Sanatani Vivah Portal খুলুন এবং সত্য, পুরো পারিবারিক বিবরণ দিয়ে profile তৈরি করুন।'
      },
      {
        en: 'Add what the family is looking for, clearly and respectfully, without hiding important facts.',
        hi: 'परिवार क्या खोज रहा है, वह साफ़ और सम्मानपूर्वक लिखें, महत्वपूर्ण बातें छिपाए बिना।',
        bn: 'পরিবার যা খুঁজছে তা স্পষ্ট ও সম্মানের সঙ্গে লিখুন, গুরুত্বপূর্ণ কথা না লুকিয়ে।'
      },
      {
        en: 'Look at profiles that fit, and verify the basic details before any family meeting.',
        hi: 'उपयुक्त profiles देखें, और किसी पारिवारिक मुलाकात से पहले बुनियादी विवरण सत्यापित करें।',
        bn: 'মানানসই profile দেখুন, এবং কোনো পারিবারিক দেখার আগে মূল বিবরণ যাচাই করুন।'
      },
      {
        en: 'Take the conversation forward family to family, at a pace both sides find comfortable.',
        hi: 'बातचीत को परिवार से परिवार आगे बढ़ाएँ, उस गति से जो दोनों पक्षों को सहज लगे।',
        bn: 'কথাবার্তা পরিবার থেকে পরিবারে এগিয়ে নিন, যে গতিতে দুই পক্ষই স্বস্তি পায়।'
      }
    ],
    commonMistakes: [
      {
        en: 'Hiding an important fact in the profile to get more responses. Vivah begins with trust — a fact hidden now becomes a hurt later.',
        hi: 'अधिक प्रतिक्रियाएँ पाने के लिए profile में कोई महत्वपूर्ण बात छिपाना। Vivah भरोसे से शुरू होता है — आज छिपाई बात बाद में दुख बन जाती है।',
        bn: 'বেশি সাড়া পেতে profile-এ গুরুত্বপূর্ণ কথা লুকানো। Vivah বিশ্বাস দিয়ে শুরু হয় — আজ লুকানো কথা পরে কষ্ট হয়ে দাঁড়ায়।'
      },
      {
        en: 'Meeting a family without any verification because the profile looked good. Verify through the community first — that is the whole purpose of this portal.',
        hi: 'केवल profile अच्छा दिखने पर बिना सत्यापन के किसी परिवार से मिलना। पहले समुदाय के माध्यम से सत्यापित करें — यही इस portal का पूरा उद्देश्य है।',
        bn: 'শুধু profile ভালো দেখালেই কোনো যাচাই ছাড়া পরিবারের সঙ্গে দেখা করা। আগে সম্প্রদায়ের মাধ্যমে যাচাই করুন — এটাই এই portal-এর পুরো উদ্দেশ্য।'
      },
      {
        en: 'Rushing the process under pressure. A vivah decision shapes a whole life — use the portal to meet well, not merely fast.',
        hi: 'दबाव में प्रक्रिया में जल्दबाज़ी करना। Vivah का निर्णय पूरे जीवन को आकार देता है — portal का उपयोग केवल तेज़ी के लिए नहीं, अच्छे से मिलने के लिए करें।',
        bn: 'চাপে পড়ে প্রক্রিয়ায় তাড়াহুড়ো করা। Vivah-এর সিদ্ধান্ত পুরো জীবন গড়ে — portal শুধু তাড়াতাড়ির জন্য নয়, ভালোভাবে দেখা করার জন্য ব্যবহার করুন।'
      }
    ],
    capabilities: [
      {
        en: 'Create a vivah profile with family details that others can verify.',
        hi: 'पारिवारिक विवरण के साथ vivah profile बनाएँ, जिसे अन्य लोग सत्यापित कर सकें।',
        bn: 'পারিবারিক বিবরণসহ vivah profile তৈরি করুন, যা অন্যরা যাচাই করতে পারে।'
      },
      {
        en: 'Search profiles inside the trusted community circle, not the open public web.',
        hi: 'खुले सार्वजनिक web पर नहीं, विश्वसनीय समुदाय घेरे के भीतर profiles खोजें।',
        bn: 'খোলা public web-এ নয়, বিশ্বস্ত সম্প্রদায় বলয়ের ভেতরে profile খুঁজুন।'
      },
      {
        en: 'Move from profile to family meeting with verified basics already in place.',
        hi: 'पहले से सत्यापित बुनियादी बातों के साथ profile से पारिवारिक मुलाकात तक बढ़ें।',
        bn: 'আগে থেকেই যাচাই করা মূল বিষয়সহ profile থেকে পারিবারিক দেখা পর্যন্ত এগোন।'
      }
    ],
    worksOffline: true
  },
  'yatraNet': {
    whatItDoes: {
      en: 'This desk helps a yatra or mela group stay connected when there is no internet at all — an offline mesh between the phones of the group. Messages and coordination pass from phone to phone, so a group spread over a fairground is not cut off from each other.',
      hi: 'यह desk yatra या mela समूह को तब जुड़े रहने में मदद करता है जब internet बिल्कुल न हो — समूह के फोनों के बीच एक offline mesh। संदेश और समन्वय एक फोन से दूसरे फोन तक पहुँचते हैं, ताकि मेले के मैदान में फैला समूह एक-दूसरे से कटा न रहे।',
      bn: 'এই desk yatra বা mela দলকে তখন যুক্ত থাকতে সাহায্য করে যখন একেবারেই internet নেই — দলের ফোনগুলির মধ্যে একটি offline mesh। বার্তা ও সমন্বয় এক ফোন থেকে আরেক ফোনে পৌঁছায়, যাতে মেলার মাঠে ছড়ানো দল একে অপরের থেকে বিচ্ছিন্ন না থাকে।'
    },
    realLifeExample: {
      en: 'A sevadar team of twelve runs a three-day mela where the network fails every evening under the crowd. With the offline mesh, the kitchen team still hears that extra families have arrived, and the gate team can call for help — the mela runs calmly even when the signal is gone.',
      hi: '12 sevadars की एक team 3 दिन का mela चलाती है, जहाँ हर शाम भीड़ के कारण network बैठ जाता है। Offline mesh से रसोई team को फिर भी पता चलता है कि अतिरिक्त परिवार आ गए हैं, और gate team मदद बुला सकती है — signal जाने पर भी mela शांति से चलता है।',
      bn: '১২ জন sevadar-এর একটি দল ৩ দিনের mela চালায়, যেখানে প্রতিদিন সন্ধ্যায় ভিড়ের কারণে network বসে যায়। Offline mesh দিয়ে রান্নাঘরের দল তবু জানতে পারে অতিরিক্ত পরিবার এসেছে, আর gate দল সাহায্য ডাকতে পারে — signal চলে গেলেও mela শান্তিতে চলে।'
    },
    steps: [
      {
        en: 'Open YatraNet Offline Mesh before the yatra or mela begins, while internet is still available.',
        hi: 'Yatra या mela शुरू होने से पहले, जब internet अभी उपलब्ध हो, YatraNet Offline Mesh खोलें।',
        bn: 'Yatra বা mela শুরু হওয়ার আগে, যখন internet এখনও আছে, YatraNet Offline Mesh খুলুন।'
      },
      {
        en: 'Form the group with the sevadars and team members who will work together on the ground.',
        hi: 'उन sevadars और team सदस्यों के साथ समूह बनाएँ, जो मैदान पर साथ काम करेंगे।',
        bn: 'যে sevadar ও দলের সদস্যরা মাঠে একসঙ্গে কাজ করবেন, তাঁদের নিয়ে দল গড়ুন।'
      },
      {
        en: 'Agree simple signals for common needs — help, food, water, medical — before the crowd arrives.',
        hi: 'भीड़ आने से पहले सामान्य ज़रूरतों के लिए सरल संकेत तय कर लें — मदद, भोजन, पानी, चिकित्सा।',
        bn: 'ভিড় আসার আগে সাধারণ প্রয়োজনের জন্য সরল সংকেত ঠিক করে নিন — সাহায্য, খাবার, জল, চিকিৎসা।'
      },
      {
        en: 'During the event, keep phones charged and within reach of each other, so messages can pass along the group.',
        hi: 'कार्यक्रम के दौरान फोन charged और एक-दूसरे की पहुँच में रखें, ताकि संदेश समूह में आगे बढ़ सकें।',
        bn: 'অনুষ্ঠানের সময় ফোন charged ও একে অপরের নাগালের মধ্যে রাখুন, যাতে বার্তা দলের মধ্যে এগিয়ে যেতে পারে।'
      }
    ],
    commonMistakes: [
      {
        en: 'Trying to set the group up after the network has already failed. Form the mesh group in advance, on a day when everything still works.',
        hi: 'Network पहले ही बैठ जाने के बाद समूह बनाने की कोशिश करना। Mesh समूह पहले से बनाएँ, उस दिन जब सब कुछ चल रहा हो।',
        bn: 'Network আগেই বসে যাওয়ার পরে দল গড়ার চেষ্টা করা। Mesh দল আগে থেকে গড়ুন, যেদিন সবকিছু চলছে।'
      },
      {
        en: 'Letting phones run out of charge in the middle of the mela. An offline mesh lives on the phones themselves — a dead phone is a broken link.',
        hi: 'Mele के बीच में फोनों की battery खत्म होने देना। Offline mesh खुद फोनों पर जीता है — बंद फोन एक टूटी कड़ी है।',
        bn: 'Mela-র মাঝখানে ফোনের charge শেষ হতে দেওয়া। Offline mesh ফোনগুলির ওপরেই বাঁচে — বন্ধ ফোন একটি ছেঁড়া যোগসূত্র।'
      },
      {
        en: 'Assuming the mesh reaches any distance. Messages pass phone to phone, so a team spread too thin can leave gaps — plan positions with that in mind.',
        hi: 'यह मान लेना कि mesh किसी भी दूरी तक पहुँचता है। संदेश एक फोन से दूसरे फोन तक जाते हैं, इसलिए बहुत फैली हुई team में अंतर रह सकता है — स्थान उसी हिसाब से तय करें।',
        bn: 'Mesh যেকোনো দূরত্বে পৌঁছায় বলে ধরে নেওয়া। বার্তা এক ফোন থেকে আরেক ফোনে যায়, তাই খুব ছড়ানো দলে ফাঁক থাকতে পারে — অবস্থান সেই হিসাবেই ঠিক করুন।'
      }
    ],
    capabilities: [
      {
        en: 'Stay connected with the yatra or mela group with zero internet.',
        hi: 'बिना internet के yatra या mela समूह से जुड़े रहें।',
        bn: 'Internet ছাড়াই yatra বা mela দলের সঙ্গে যুক্ত থাকুন।'
      },
      {
        en: 'Pass messages phone to phone across the group on the ground.',
        hi: 'मैदान पर समूह में संदेश एक फोन से दूसरे फोन तक पहुँचाएँ।',
        bn: 'মাঠে দলের মধ্যে বার্তা এক ফোন থেকে আরেক ফোনে পৌঁছান।'
      },
      {
        en: 'Coordinate sevadars at gates, kitchen and help points when the network fails.',
        hi: 'Network बैठने पर gates, रसोई और help points पर sevadars का समन्वय करें।',
        bn: 'Network বসে গেলে gate, রান্নাঘর ও help point-এ sevadar-দের সমন্বয় করুন।'
      }
    ],
    worksOffline: true
  }
};
