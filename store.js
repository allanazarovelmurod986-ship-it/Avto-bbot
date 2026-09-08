const fs = require('fs');
const path = require('path');

// Render'da persistent disk ulasangiz, DB_PATH=/data/db.json qiling (.env orqali)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');

const DEFAULT_DATA = {
  autoReplies: [
    "Assalomu alaykum! 👋 Xabaringiz uchun rahmat, tez orada javob beramiz.",
  ],
  keywords: [], // [{ key: 'narx', response: '...' }]
  welcomeMessage:
    "Assalomu alaykum! 👋 Bizga yozganingiz uchun rahmat. Savollaringiz bo'lsa, marhamat yozavering.",
  seenUsers: [], // avval yozgan mijozlar chatId ro'yxati
  events: [], // { ts: number, type: 'received'|'sent'|'autoReply'|'newUser' }
};

function loadData() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
      return { ...DEFAULT_DATA };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch (err) {
    console.error('db.json o\'qishda xato:', err.message);
    return { ...DEFAULT_DATA };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('db.json yozishda xato:', err.message);
  }
}

// ---------- Avto javoblar ----------
function listAutoReplies() {
  return loadData().autoReplies;
}
function addAutoReply(text) {
  const data = loadData();
  data.autoReplies.push(text);
  saveData(data);
}
function removeAutoReply(index) {
  const data = loadData();
  data.autoReplies.splice(index, 1);
  saveData(data);
}
function getRandomAutoReply() {
  const list = listAutoReplies();
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// ---------- Kalit so'zlar ----------
function listKeywords() {
  return loadData().keywords;
}
function addKeyword(key, response) {
  const data = loadData();
  data.keywords.push({ key: key.toLowerCase().trim(), response });
  saveData(data);
}
function removeKeyword(index) {
  const data = loadData();
  data.keywords.splice(index, 1);
  saveData(data);
}
function findKeywordMatch(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const list = listKeywords();
  return list.find((k) => t.includes(k.key)) || null;
}

// ---------- Yangi foydalanuvchi xabari ----------
function getWelcomeMessage() {
  return loadData().welcomeMessage;
}
function setWelcomeMessage(text) {
  const data = loadData();
  data.welcomeMessage = text;
  saveData(data);
}
function isNewUser(chatId) {
  const data = loadData();
  return !data.seenUsers.includes(chatId);
}
function markUserSeen(chatId) {
  const data = loadData();
  if (!data.seenUsers.includes(chatId)) {
    data.seenUsers.push(chatId);
    saveData(data);
  }
}

// ---------- Statistika ----------
const MAX_EVENTS = 20000; // xotira shishib ketmasligi uchun

function logEvent(type) {
  const data = loadData();
  data.events.push({ ts: Date.now(), type });
  if (data.events.length > MAX_EVENTS) {
    data.events = data.events.slice(-MAX_EVENTS);
  }
  saveData(data);
}

function getStats(period) {
  const data = loadData();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let cutoff = 0;

  if (period === 'today') cutoff = now - DAY;
  else if (period === 'week') cutoff = now - 7 * DAY;
  else if (period === 'month') cutoff = now - 30 * DAY;
  else cutoff = 0; // 'all'

  const filtered = data.events.filter((e) => e.ts >= cutoff);

  return {
    newUsers: filtered.filter((e) => e.type === 'newUser').length,
    received: filtered.filter((e) => e.type === 'received').length,
    sent: filtered.filter((e) => e.type === 'sent').length,
    autoReply: filtered.filter((e) => e.type === 'autoReply').length,
  };
}

module.exports = {
  listAutoReplies,
  addAutoReply,
  removeAutoReply,
  getRandomAutoReply,
  listKeywords,
  addKeyword,
  removeKeyword,
  findKeywordMatch,
  getWelcomeMessage,
  setWelcomeMessage,
  isNewUser,
  markUserSeen,
  logEvent,
  getStats,
};
