import 'dotenv/config';
import wolfjs from 'wolf.js';
import { ALL_WORDS } from './wordsLibrary.js';

const { WOLF } = wolfjs;

// ==================== ⚙️ الإعدادات الدقيقة ====================
const ROOM_ID = 81971125;          // 🆔 رقم الغرفة
const TARGET_USER_ID = 82641759;   // 🆔 ID بوت الكلمات الرسمي
const START_COMMAND = '!كلمات';    // 🚀 أمر بداية اللعبة
const FIRST_WORD = 'العمر';        // 🎯 الكلمة الافتتاحية الأولى

let service = null;

// دالة انتظار
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getOptimalSecondWord(words, firstWord) {
  const firstLetters = new Set(firstWord.split(''));

  for (const word of words) {
    const hasOverlap = word.split('').some(char => firstLetters.has(char));
    if (!hasOverlap) return word;
  }

  return words[0];
}

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

        else if (status === 'yellow') {
          if (!word.includes(letter) || word[i] === letter) return false;
        }

        else if (status === 'gray') {
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

function parseGameHtml(html) {
  const regex = /<div class="wolfdlebot-mp-game__content__container__item\s+([^"]+)"[^>]*>(.*?)<\/div>/g;

  let match;
  const items = [];

  while ((match = regex.exec(html)) !== null) {
    items.push({
      className: match[1],
      letter: match[2].trim()
    });
  }

  const rows = [];

  for (let i = 0; i < items.length; i += 5) {
    const rowItems = items.slice(i, i + 5);

    if (!rowItems[0] || rowItems[0].className.includes('border-only')) break;

    const word = rowItems.map(item => item.letter).join('');

    const feedback = rowItems.map(item => {
      if (item.className.includes('invalid')) return 'gray';
      if (item.className.includes('incorrect')) return 'yellow';
      return 'green';
    });

    rows.push({ word, feedback });
  }

  return rows;
}

function startBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = Number(message.targetGroupId || message.groupId || 0);

      if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

      const htmlContent = message.body || '';

      if (!htmlContent.includes('wolfdlebot')) return;

      const history = parseGameHtml(htmlContent);

      console.log(`\n📊 تم تحليل اللوحة الحالية. المحاولات الحالية: ${history.length}`);

      if (
        history.length > 0 &&
        history[history.length - 1].feedback.every(f => f === 'green')
      ) {
        console.log(`🎉 تم الفوز بالكلمة: "${history[history.length - 1].word}"`);
        return;
      }

      if (history.length >= 6) {
        console.log('💀 انتهت المحاولات الست دون فوز.');
        return;
      }

      let nextGuess = '';
      let currentPool = [...ALL_WORDS];

      if (history.length === 0) {
        nextGuess = FIRST_WORD;
        console.log(`🎯 خطوة 1: إرسال الكلمة الافتتاحية: [ ${nextGuess} ]`);
      }

      else if (history.length === 1) {
        nextGuess = getOptimalSecondWord(currentPool, history[0].word);
        console.log(`🔍 خطوة 2: إرسال كلمة بحروف مختلفة: [ ${nextGuess} ]`);
      }

      else {
        currentPool = filterDictionary(currentPool, history);

        if (currentPool.length === 0) {
          console.log('⚠️ لا توجد كلمات مطابقة للشروط في المكتبة.');
          return;
        }

        nextGuess = currentPool[0];

        console.log(`🚀 خطوة ${history.length + 1}: الكلمات المتبقية: ${currentPool.length}`);
        console.log(`👉 الكلمة المختارة: [ ${nextGuess} ]`);
      }

      if (!nextGuess) {
        console.log('⚠️ لم يتم اختيار أي كلمة.');
        return;
      }

      await sleep(1500);
      await service.messaging.sendGroupMessage(ROOM_ID, nextGuess);

      console.log(`📤 تم إرسال التخمين: ${nextGuess}`);

    } catch (err) {
      console.error('❌ حدث خطأ أثناء معالجة اللعبة:', err.message);
    }
  });

  service.on('ready', async () => {
    console.log('✅ البوت متصل وجاهز.');

    await sleep(3000);

    await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);

    console.log(`📤 تم إرسال أمر البداية: ${START_COMMAND}`);
  });

  service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(err => {
    console.error('❌ فشل تسجيل الدخول إلى وولف:', err.message);
  });
}

startBot();
