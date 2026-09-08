const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
  ['🚀 Avto javob', '🔑 Kalit so\'z'],
  ['🚶 Yangi foydalanuvchilarga xabar'],
  ['📊 Statistika'],
]).resize();

function autoReplyListKeyboard(list) {
  const rows = list.map((text, i) => [
    Markup.button.callback(`❌ ${text.slice(0, 30)}${text.length > 30 ? '…' : ''}`, `ar_del_${i}`),
  ]);
  rows.push([Markup.button.callback('➕ Qo\'shish', 'ar_add')]);
  return Markup.inlineKeyboard(rows);
}

function keywordListKeyboard(list) {
  const rows = list.map((k, i) => [
    Markup.button.callback(`❌ ${k.key}`, `kw_del_${i}`),
  ]);
  rows.push([Markup.button.callback('➕ Qo\'shish', 'kw_add')]);
  return Markup.inlineKeyboard(rows);
}

const welcomeKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✏️ Tahrirlash', 'welcome_edit')],
]);

const statsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('Kechagi', 'stats_today'),
    Markup.button.callback('Haftalik', 'stats_week'),
  ],
  [
    Markup.button.callback('Oylik', 'stats_month'),
    Markup.button.callback('Umumiy', 'stats_all'),
  ],
]);

function formatStats(title, s) {
  return (
    `📈 ${title}\n\n` +
    `🆕 Yangi odamlar: ${s.newUsers}\n` +
    `📥 Qabul qilindi: ${s.received}\n` +
    `📤 Yuborildi: ${s.sent}\n` +
    `🚀 Avto javob: ${s.autoReply}`
  );
}

module.exports = {
  mainMenu,
  autoReplyListKeyboard,
  keywordListKeyboard,
  welcomeKeyboard,
  statsKeyboard,
  formatStats,
};
