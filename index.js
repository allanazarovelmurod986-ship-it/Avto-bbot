require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Telegraf } = require('telegraf');
const { askGemini } = require('./gemini');
const store = require('./store');
const menu = require('./menu');

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_URL;
const USE_AI = (process.env.USE_AI || 'true').toLowerCase() !== 'false';
// Sizning shaxsiy Telegram ID'ingiz - faqat shu odam boshqaruv menyusini ko'radi.
// ID'ni bilish uchun @userinfobot ga yozing.
const OWNER_ID = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : null;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN topilmadi (.env)');
if (!OWNER_ID) console.warn('DIQQAT: OWNER_ID o\'rnatilmagan - boshqaruv menyusi ishlamaydi.');

const bot = new Telegraf(BOT_TOKEN);

// ============ BIZNES MA'LUMOTLARI (AI uchun) ============
const BUSINESS_FILE = path.join(__dirname, 'business.json');
function loadBusinessInfo() {
  try {
    return JSON.parse(fs.readFileSync(BUSINESS_FILE, 'utf-8'));
  } catch {
    return { name: 'Biznes', description: '-', workingHours: '-', address: '-', phone: '-' };
  }
}

// ============ SUHBAT TARIXI (AI konteksti uchun) ============
const chatHistories = new Map();
const MAX_HISTORY_TURNS = 6;
function getHistory(id) {
  return chatHistories.get(id) || [];
}
function pushHistory(id, userText, botText) {
  const h = getHistory(id);
  h.push({ role: 'user', parts: [{ text: userText }] });
  h.push({ role: 'model', parts: [{ text: botText }] });
  while (h.length > MAX_HISTORY_TURNS) h.shift();
  chatHistories.set(id, h);
}

function isOwner(ctx) {
  return OWNER_ID && ctx.from && ctx.from.id === OWNER_ID;
}

// ============================================================
// MIJOZGA JAVOB TANLASH MANTIG'I (business_message uchun)
// Tartib: 1) kalit so'z  2) AI  3) hech narsa
// ============================================================
async function buildCustomerReply(chatId, text) {
  const kwMatch = store.findKeywordMatch(text);
  if (kwMatch) {
    store.logEvent('autoReply');
    return kwMatch.response;
  }

  if (USE_AI) {
    try {
      const businessInfo = loadBusinessInfo();
      const history = getHistory(chatId);
      const reply = await askGemini(text, businessInfo, history);
      pushHistory(chatId, text, reply);
      return reply;
    } catch (err) {
      console.error('AI xato, avto javobga o\'tildi:', err.message);
    }
  }

  // AI ishlamasa yoki o'chirilgan bo'lsa - tasodifiy avto javob
  const fallback = store.getRandomAutoReply();
  if (fallback) store.logEvent('autoReply');
  return fallback;
}

// ============================================================
// 1) BUSINESS xabarlar - haqiqiy mijozlar
// ============================================================
bot.on('business_message', async (ctx) => {
  const msg = ctx.update.business_message;
  const chatId = msg.chat.id;
  store.logEvent('received');

  // Birinchi marta yozgan mijozga xush kelibsiz xabari
  if (store.isNewUser(chatId)) {
    store.markUserSeen(chatId);
    store.logEvent('newUser');
    try {
      await ctx.telegram.sendMessage(chatId, store.getWelcomeMessage(), {
        business_connection_id: msg.business_connection_id,
      });
      store.logEvent('sent');
    } catch (err) {
      console.error('Xush kelibsiz xabari xatosi:', err.message);
    }
    return; // birinchi xabarga faqat welcome yetarli
  }

  const replyText = await buildCustomerReply(chatId, msg.text);
  if (!replyText) return;

  try {
    await ctx.telegram.sendMessage(chatId, replyText, {
      business_connection_id: msg.business_connection_id,
    });
    store.logEvent('sent');
  } catch (err) {
    console.error('Business javob yuborishda xato:', err.message);
  }
});

bot.on('business_connection', (ctx) => {
  const conn = ctx.update.business_connection;
  console.log('Business ulanish:', conn.is_enabled ? 'YOQILDI' : "O'CHIRILDI");
});

// ============================================================
// 2) BOT EGASINING shaxsiy chati - BOSHQARUV PANELI
// ============================================================
const ownerState = new Map(); // chatId -> { mode, temp }

bot.start((ctx) => {
  if (isOwner(ctx)) {
    ctx.reply('Boshqaruv paneliga xush kelibsiz! 👇', menu.mainMenu);
  } else {
    ctx.reply("Bot ishga tushdi ✅");
  }
});

bot.command('menu', (ctx) => {
  if (isOwner(ctx)) ctx.reply('Boshqaruv menyusi:', menu.mainMenu);
});

// --- Matnli xabarlar: avval owner-menu holatini tekshiramiz ---
bot.on('text', async (ctx) => {
  if (!isOwner(ctx)) return; // faqat egasi bilan ishlaydi, qolganlar AI/keyword oqimidan tashqarida
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const state = ownerState.get(chatId);

  // --- Kutilayotgan kiritish bormi? ---
  if (state?.mode === 'awaiting_autoreply') {
    store.addAutoReply(text);
    ownerState.delete(chatId);
    return ctx.reply('✅ Avto javob qo\'shildi.', menu.mainMenu);
  }
  if (state?.mode === 'awaiting_keyword_key') {
    ownerState.set(chatId, { mode: 'awaiting_keyword_response', temp: { key: text } });
    return ctx.reply(`Kalit so'z: "${text}"\nEndi shu so'zga javobni yozing:`);
  }
  if (state?.mode === 'awaiting_keyword_response') {
    store.addKeyword(state.temp.key, text);
    ownerState.delete(chatId);
    return ctx.reply('✅ Kalit so\'z qo\'shildi.', menu.mainMenu);
  }
  if (state?.mode === 'awaiting_welcome') {
    store.setWelcomeMessage(text);
    ownerState.delete(chatId);
    return ctx.reply('✅ Xush kelibsiz xabari yangilandi.', menu.mainMenu);
  }

  // --- Asosiy menyu tugmalari ---
  if (text === "🚀 Avto javob") {
    const list = store.listAutoReplies();
    const body = list.length
      ? list.map((t, i) => `${i + 1}. ${t}`).join('\n\n')
      : "Hozircha avto javoblar yo'q.";
    return ctx.reply(`🚀 Avto javoblar ro'yxati:\n\n${body}`, menu.autoReplyListKeyboard(list));
  }

  if (text === "🔑 Kalit so'z") {
    const list = store.listKeywords();
    const body = list.length
      ? list.map((k, i) => `${i + 1}. "${k.key}" → ${k.response}`).join('\n\n')
      : "Hozircha kalit so'zlar yo'q.";
    return ctx.reply(`🔑 Kalit so'zlar:\n\n${body}`, menu.keywordListKeyboard(list));
  }

  if (text === "🚶 Yangi foydalanuvchilarga xabar") {
    return ctx.reply(
      `Hozirgi xush kelibsiz xabari:\n\n"${store.getWelcomeMessage()}"`,
      menu.welcomeKeyboard
    );
  }

  if (text === "📊 Statistika") {
    return ctx.reply('Qaysi davr uchun statistikani ko\'rmoqchisiz?', menu.statsKeyboard);
  }
});

// --- Inline tugma bosilganda (callback_query) ---
bot.on('callback_query', async (ctx) => {
  if (!isOwner(ctx)) return ctx.answerCbQuery();
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;

  if (data === 'ar_add') {
    ownerState.set(chatId, { mode: 'awaiting_autoreply' });
    await ctx.answerCbQuery();
    return ctx.reply("Yangi avto javob matnini kiriting:");
  }
  if (data.startsWith('ar_del_')) {
    store.removeAutoReply(Number(data.replace('ar_del_', '')));
    await ctx.answerCbQuery("O'chirildi");
    return ctx.editMessageReplyMarkup(menu.autoReplyListKeyboard(store.listAutoReplies()).reply_markup);
  }

  if (data === 'kw_add') {
    ownerState.set(chatId, { mode: 'awaiting_keyword_key' });
    await ctx.answerCbQuery();
    return ctx.reply("Yangi kalit so'zni kiriting (masalan: narx):");
  }
  if (data.startsWith('kw_del_')) {
    store.removeKeyword(Number(data.replace('kw_del_', '')));
    await ctx.answerCbQuery("O'chirildi");
    return ctx.editMessageReplyMarkup(menu.keywordListKeyboard(store.listKeywords()).reply_markup);
  }

  if (data === 'welcome_edit') {
    ownerState.set(chatId, { mode: 'awaiting_welcome' });
    await ctx.answerCbQuery();
    return ctx.reply("Yangi xush kelibsiz xabarini kiriting:");
  }

  if (data.startsWith('stats_')) {
    const period = data.replace('stats_', '');
    const titles = { today: 'Kechagi', week: 'Haftalik', month: 'Oylik', all: 'Umumiy' };
    const s = store.getStats(period);
    await ctx.answerCbQuery();
    return ctx.reply(menu.formatStats(titles[period], s));
  }

  ctx.answerCbQuery();
});

// ============ SERVER + WEBHOOK ============
const app = express();
app.use(bot.webhookCallback('/webhook'));
app.get('/', (req, res) => res.send('Telegram bot serveri ishlayapti ✅'));

app.listen(PORT, async () => {
  console.log(`Server ${PORT}-portda ishga tushdi. AI: ${USE_AI ? 'YOQILGAN' : "O'CHIRILGAN"}`);
  if (DOMAIN) {
    const webhookUrl = `${DOMAIN.replace(/\/$/, '')}/webhook`;
    try {
      await bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: [
          'message',
          'callback_query',
          'business_connection',
          'business_message',
          'edited_business_message',
          'deleted_business_messages',
        ],
      });
      console.log("Webhook o'rnatildi:", webhookUrl);
    } catch (err) {
      console.error('Webhook xatosi:', err.message);
    }
  } else {
    console.warn("DOMAIN topilmadi - lokal test uchun WEBHOOK_URL (ngrok) qo'ying.");
  }
});
