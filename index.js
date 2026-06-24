import 'dotenv/config';
import wolfjs from 'wolf.js';
import { ALL_WORDS } from './wordsLibrary.js';

const { WOLF } = wolfjs;

// ================== الإعدادات ==================
const ROOM_ID = 81971125;
const TARGET_USER_ID = 82641759;
const START_COMMAND = '!كلمات';
const FIRST_WORD = 'العمر';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let service = null;
let reconnecting = false;
let isBotReady = false;

// ================== قراءة نص الرسالة ==================
function getMessageText(message) {
  return (message.body || message.content || message.text || message.message || '').trim();
}

// ================== استخراج رقم الغرفة ==================
function getRoomId(message) {
  return Number(
    message.targetGroupId ||
    message.groupId ||
    message.channelId ||
    message.recipientGroupId ||
    message.group?.id ||
    0
  );
}

// ================== إرسال رسالة ==================
async function send(roomId, text) {
  try {
    if (!service || !isBotReady) return false;

    await service.messaging.sendGroupMessage(roomId, text);

    console.log(`🚀 تم الإرسال: ${text}`);
    return true;

  } catch (err) {
    console.log('❌ فشل الإرسال:', err.message);
    return false;
  }
}

// ================== اختيار الكلمة الثانية ==================
function getOptimalSecondWord(words, firstWord) {
  const firstLetters = new Set(firstWord.split(''));

  for (const word of words) {
    const hasOverlap = word.split('').some(char => firstLetters.has(char));
    if (!hasOverlap) return word;
  }

  return words[0];
}

// ================== فلترة القاموس ==================
function filterDictionary(words, history) {
  return words.filter(word => {
    for (const attempt of history) {
      const guess = attempt.word;
      const feedback = attempt.feedback;

      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const status = feedback[i];

        if (status === 'green') {
          if (word[i] !== letter) return false;
        }

        if (status === 'yellow') {
          if (!word.includes(letter) || word[i] === letter) return false;
        }

        if (status === 'gray') {
          const isLetterElsewhere = guess
            .split('')
            .some((l, idx) => l === letter && feedback[idx] !== 'gray');

          if (!isLetterElsewhere && word.includes(letter)) return false;
          if (isLetterElsewhere && word[i] === letter) return false;
        }
      }
    }

    return true;
  });
}

// ================== تحليل HTML لوحة اللعبة ==================
function parseGameHtml(html) {
  const regex = /<div class="wolfdlebot-mp-game__content__container__item\s+([^"]+)"[^>]*>(.*?)<\/div>/g;

  let match;
  const items = [];

  while ((match = regex.exec(html)) !== null) {
    const letter = match[2].replace(/<[^>]*>/g, '').trim();

    items.push({
      className: match[1],
      letter
    });
  }

  const rows = [];

  for (let i = 0; i < items.length; i += 5) {
    const rowItems = items.slice(i, i + 5);

    if (rowItems.length < 5) break;
    if (rowItems[0].className.includes('border-only')) break;

    const word = rowItems.map(item => item.letter).join('');

    if (word.length !== 5) continue;

    const feedback = rowItems.map(item => {
      if (item.className.includes('invalid')) return 'gray';
      if (item.className.includes('incorrect')) return 'yellow';
      return 'green';
    });

    rows.push({ word, feedback });
  }

  return rows;
}

// ================== اختيار المحاولة التالية ==================
function chooseNextGuess(history) {
  let currentPool = [...ALL_WORDS];

  if (history.length === 0) {
    return FIRST_WORD;
  }

  if (history.length === 1) {
    return getOptimalSecondWord(currentPool, history[0].word);
  }

  currentPool = filterDictionary(currentPool, history);

  console.log(`📚 عدد الكلمات المتبقية: ${currentPool.length}`);

  if (currentPool.length === 0) return null;

  return currentPool[0];
}

// ================== إعادة تشغيل البوت ==================
async function restartBot(reason) {
  if (reconnecting) return;

  reconnecting = true;
  isBotReady = false;

  console.log('🔄 إعادة تشغيل البوت بسبب:', reason);

  try {
    if (service) {
      service.removeAllListeners();
      await service.logout().catch(() => {});
    }
  } catch {}

  await sleep(5000);
  startBot();
}

// ================== تشغيل البوت ==================
function startBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = getRoomId(message);
      const text = getMessageText(message);

      if (!text || !message.isGroup) return;
      if (roomId !== ROOM_ID) return;
      if (senderId !== TARGET_USER_ID) return;
      if (!text.includes('wolfdlebot')) return;

      const history = parseGameHtml(text);

      console.log('--------------------');
      console.log(`📊 عدد المحاولات: ${history.length}`);

      if (
        history.length > 0 &&
        history[history.length - 1].feedback.every(f => f === 'green')
      ) {
        console.log(`🎉 تم الفوز بالكلمة: ${history[history.length - 1].word}`);
        return;
      }

      if (history.length >= 6) {
        console.log('💀 انتهت المحاولات الست بدون فوز');
        return;
      }

      const nextGuess = chooseNextGuess(history);

      if (!nextGuess) {
        console.log('⚠️ لم يتم العثور على كلمة مناسبة');
        return;
      }

      console.log(`👉 الكلمة المختارة: ${nextGuess}`);

      await sleep(1500);
      await send(ROOM_ID, nextGuess);

    } catch (err) {
      console.log('❌ Message Error:', err.message);
    }
  });

  service.on('ready', async () => {
    console.log('✅ الحساب جاهز');

    isBotReady = true;
    reconnecting = false;

    await sleep(2000);

    await send(ROOM_ID, START_COMMAND);
  });

  service.on('error', () => restartBot('service error'));
  service.on('disconnected', () => restartBot('disconnected'));
  service.on('close', () => restartBot('close'));

  service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(() => {
    reconnecting = false;
    restartBot('login failed');
  });
}

startBot();
