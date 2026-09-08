# Telegram Business AI Chatbot + Boshqaruv paneli

Bu bot **Telegram Business** orqali shaxsiy profilingizga ulanadi va mijozlarga avtomatik javob beradi. Botning **o'z shaxsiy chati** orqali (mijozlar ko'rmaydigan) boshqaruv menyusi bor:

- **🚀 Avto javob** — bir nechta tayyor javob varianti (tasodifiy tanlanadi)
- **🔑 Kalit so'z** — "narx", "manzil" kabi so'zlarga tayyor javob biriktirish
- **🚶 Yangi foydalanuvchilarga xabar** — birinchi marta yozgan mijozga avtomatik xush kelibsiz xabari
- **📊 Statistika** — kechagi / haftalik / oylik / umumiy hisobot

Mijozdan xabar kelganda tartib: **1) kalit so'z mos kelsa** → shu javob, **2) mos kelmasa** → Gemini AI (`business.json` asosida) javob beradi, **3) AI o'chirilgan/xato bo'lsa** → tasodifiy avto javob.

> ⚠️ Telegram Business funksiyasi uchun sizda **Telegram Premium** bo'lishi shart.

## 1. Bot yaratish (BotFather)

1. [@BotFather](https://t.me/BotFather) → `/newbot` → tokenni saqlang
2. `/mybots` → botingiz → **Bot Settings** → **Business Mode** → **Turn on**

## 2. O'z Telegram ID'ingizni bilish

[@userinfobot](https://t.me/userinfobot) ga `/start` yozing — u sizga ID raqamingizni beradi. Shu raqamni `OWNER_ID` ga yozasiz — faqat shu ID boshqaruv menyusini ko'radi, boshqa hech kim (mijozlar ham) ko'ra olmaydi.

## 3. Gemini API key

[aistudio.google.com/apikey](https://aistudio.google.com/apikey) — **Create API key**, bepul tarif yetarli.

## 4. O'rnatish

```bash
npm install
cp .env.example .env
# BOT_TOKEN, GEMINI_API_KEY, OWNER_ID ni to'ldiring
```

`business.json`ni AI uchun to'ldiring (nomi, tavsif, ish vaqti va h.k.).

Lokal test: `ngrok http 3000`, chiqqan URL'ni `.env`dagi `WEBHOOK_URL`ga yozing.

## 5. Render'ga deploy

1. GitHub'ga push qiling
2. Render → **New** → **Web Service** → repo tanlang
3. Build: `npm install`, Start: `npm start`
4. Environment Variables: `BOT_TOKEN`, `GEMINI_API_KEY`, `OWNER_ID` (va xohlasangiz `GEMINI_MODEL`, `USE_AI`)

### ⚠️ Ma'lumotlar saqlanishi haqida (muhim!)

Bot sozlamalari (kalit so'zlar, statistika, avto javoblar) `db.json` faylida saqlanadi. **Render'ning bepul (Free) tarifida disk vaqtinchalik** — server qayta ishga tushsa yoki qayta deploy qilinsa, bu fayl **tozalanib ketishi mumkin**.

Ishonchli saqlash uchun ikkita variant:
1. **Oddiy va tez:** Render'da **Disks** bo'limidan kichik persistent disk qo'shing (1GB ~$0.25/oy dan boshlanadi), uni masalan `/data`ga mount qiling, keyin `.env`da `DB_PATH=/data/db.json` deb yozing.
2. **Bepul, lekin ko'proq ish:** MongoDB Atlas (bepul tarif) ga o'tkazish — aytsangiz shu integratsiyani ham qo'shib beraman.

Test qilish va boshlash uchun hozirgi holat (`db.json`) yetarli — faqat production'ga chiqishdan oldin shuni hal qiling.

## 6. Botni profilga ulash

**Settings → Telegram Business → Chatbots** → bot username'ini kiritib ulang.

## 7. Boshqaruv panelidan foydalanish

Botning **o'ziga** (business emas, oddiy) shaxsiy xabar yozing: `/start` yoki `/menu` — pastda menyu chiqadi. U yerdan avto javoblar, kalit so'zlar, xush kelibsiz xabari va statistikani boshqarasiz.

## Fayllar

- `index.js` — asosiy bot logikasi
- `store.js` — ma'lumotlar (avto javob, kalit so'z, statistika) bilan ishlash
- `menu.js` — boshqaruv menyusi klaviaturalari
- `gemini.js` — Gemini AI bilan integratsiya
- `business.json` — AI uchun biznes ma'lumotlari
- `db.json` — avtomatik yaratiladi, sozlamalar shu yerda saqlanadi

## Keyingi qadamlar (ixtiyoriy)

- MongoDB Atlas'ga o'tish (doimiy saqlash uchun)
- "Kabinet" — obuna/limit tizimi (agar botni boshqalarga ham sotmoqchi bo'lsangiz)
- Ko'p tilda javob berish
- Guruh chatlar uchun ham qo'llab-quvvatlash

Qaysi birini qo'shishni xohlaysiz?
