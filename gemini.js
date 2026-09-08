const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Gemini API orqali javob generatsiya qiladi.
 * @param {string} userText - foydalanuvchi yozgan xabar
 * @param {object} businessInfo - business.json dan olingan ma'lumot
 * @param {Array} history - oldingi xabarlar (ixtiyoriy, kontekst uchun)
 * @returns {Promise<string>}
 */
async function askGemini(userText, businessInfo, history = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY topilmadi (.env fayliga qo\'shing)');
  }

  const systemInstruction = `Siz "${businessInfo.name}" biznesi uchun ishlaydigan Telegram yordamchisisiz.
Quyidagi ma'lumotlarga tayanib mijozlarga javob bering:

Tavsif: ${businessInfo.description}
Ish vaqti: ${businessInfo.workingHours}
Manzil: ${businessInfo.address}
Telefon: ${businessInfo.phone}

Qoidalar:
- Qisqa, samimiy va professional javob bering (odatda 2-4 gap).
- Faqat yuqoridagi ma'lumotlarga tayaning, o'zingizdan biror narsa o'ylab topmang.
- Agar savolga javob ma'lumotlarda bo'lmasa, ochiq tan oling va operator bilan bog'lanishni taklif qiling.
- Faqat o'zbek tilida javob bering.`;

  const contents = [...history, { role: 'user', parts: [{ text: userText }] }];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API xatosi (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    throw new Error("Gemini bo'sh javob qaytardi (ehtimol xavfsizlik filtri)");
  }

  return reply.trim();
}

module.exports = { askGemini };
