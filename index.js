
  'الميت',
  'سبدور',
  'هنفقة',
  'شجزكط',
  'حخضذص'
];

const MIN_UNIQUE_LETTERS_BEFORE_DICTIONARY = 5;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let service = null;
let reconnecting = false;
let isBotReady = false;

function getMessageText(message) {
  return (message.body || message.content || message.text || message.message || '').trim();
}

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

function getMessagingService() {
  if (!service) return null;
  if (service._messaging) return service._messaging;
  if (service.messaging && typeof service.messaging !== 'function') return service.messaging;
  return null;
}

async function send(roomId, text) {
  try {
    if (!service || !isBotReady) return false;

    const messaging = getMessagingService();

    if (!messaging || typeof messaging.sendGroupMessage !== 'function') {
      console.log('❌ فشل الإرسال: sendGroupMessage غير موجودة');
      return false;
    }

    await messaging.sendGroupMessage(roomId, text);
    console.log(`🚀 تم الإرسال: ${text}`);
    return true;

  } catch (err) {
    console.log('❌ فشل الإرسال:', err.message);
    return false;
  }
}

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

// يحسب الحروف المختلفة المكتشفة، وليس عدد الخانات
function countKnownSlots(history) {
  const knownLetters = new Set();

  for (const attempt of history) {
    for (let i = 0; i < 5; i++) {
      const status = attempt.feedback[i];

      if (status === 'green' || status === 'yellow') {
        knownLetters.add(attempt.word[i]);
      }
    }
  }

  return knownLetters.size;
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

        if (status === 'yellow') {
          if (!word.includes(letter)) return false;
          if (word[i] === letter) return false;
        }

        if (status === 'gray') {
          const sameLetterHasColor = guess
            .split('')
            .some((l, idx) => l === letter && feedback[idx] !== 'gray');

          if (!sameLetterHasColor && word.includes(letter)) return false;
          if (sameLetterHasColor && word[i] === letter) return false;
        }
      }
    }

    return true;
  });
}

function chooseNextGuess(history) {
  const usedWords = history.map(h => h.word);
  const knownLettersCount = countKnownSlots(history);

  console.log(`✅ عدد الحروف الفريدة المكتشفة: ${knownLettersCount}`);

  if (knownLettersCount < MIN_UNIQUE_LETTERS_BEFORE_DICTIONARY) {
    const nextTestWord = TEST_WORDS.find(w => !usedWords.includes(w));

    if (nextTestWord) {
      console.log('🧪 مرحلة اختبار الحروف');
      return nextTestWord;
    }
  }

  console.log('📚 مرحلة البحث في القاموس');

  const currentPool = filterDictionary(ALL_WORDS, history)
    .filter(w => !usedWords.includes(w));

  console.log(`📚 عدد الكلمات المتبقية: ${currentPool.length}`);

  if (currentPool.length === 0) {
    const fallbackTest = TEST_WORDS.find(w => !usedWords.includes(w));
    if (fallbackTest) return fallbackTest;

    const fallbackDict = ALL_WORDS.find(w => !usedWords.includes(w));
    return fallbackDict || null;
  }

  return currentPool[0];
}

async function safeLogout() {
  try {
    if (!service || typeof service.logout !== 'function') return;

    const result = service.logout();

    if (result && typeof result.catch === 'function') {
      await result.catch(() => {});
    }
  } catch {}
}

async function restartBot(reason) {
  if (reconnecting) return;

  reconnecting = true;
  isBotReady = false;

  console.log('🔄 إعادة تشغيل البوت بسبب:', reason);

  try {
    if (service) {
      service.removeAllListeners();
      await safeLogout();
    }
  } catch {}

  await sleep(5000);
  startBot();
}

async function handleMessage(message) {
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
}

function startBot() {
  if (!WOLF_CLIENT) {
    console.log('❌ لم يتم العثور على WOLF أو WOLFBot');
    return;
  }

  service = new WOLF_CLIENT();

  service.on('message', handleMessage);
  service.on('groupMessage', handleMessage);

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

  try {
    const loginResult = service.login(process.env.U_MAIL_1, process.env.U_PASS_1);

    if (loginResult && typeof loginResult.catch === 'function') {
      loginResult.catch(() => {
        reconnecting = false;
        restartBot('login failed');
      });
    }
  } catch (err) {
    console.log('❌ فشل تسجيل الدخول:', err.message);
    reconnecting = false;
    restartBot('login failed');
  }
}

startBot();
