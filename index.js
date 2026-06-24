import 'dotenv/config';
import wolfjs from 'wolf.js';
import { ALL_WORDS } from './wordsLibrary.js';

const { WOLF } = wolfjs;

// ==================== ⚙️ الإعدادات الدقيقة ====================
const ROOM_ID = 81971125;          // 🆔 رقم الغرفة (الروم) الخاص بك
const TARGET_USER_ID = 82641759;   // ⚠️ ضع هنا ID بوت الكلمات (WOLFdle Bot) الرسمي
const FIRST_WORD = 'العمر';         // 🎯 الكلمة الافتتاحية الأولى (ا، ل، ع، م، ر)

let service = null;

/**
 * دالة عبقرية لاختيار الكلمة الثانية (تطبيق فكرتك)
 * تبحث عن كلمة في القاموس لا تشترك في أي حرف مع الكلمة الأولى لجمع أكبر قدر من المعلومات
 */
function getOptimalSecondWord(words, firstWord) {
  const firstLetters = new Set(firstWord.split(''));
  for (const word of words) {
    const hasOverlap = word.split('').some(char => firstLetters.has(char));
    if (!hasOverlap) return word; 
  }
  return words[0]; 
}

/**
 * محرك الفلترة الذكي - يحلل التاريخ ويقذف الكلمات المستحيلة خارج القاموس
 */
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
          const isLetterElsewhere = guess.split('').some((l, idx) => l === letter && feedback[idx] !== 'gray');
          if (!isLetterElsewhere && word.includes(letter)) return false;
          if (isLetterElsewhere && word[i] === letter) return false;
        }
      }
    }
    return true;
  });
}

/**
 * معالج الـ HTML الخارق - يقرأ كود اللعبة ويفكك الحروف والألوان بدقة 100%
 */
function parseGameHtml(html) {
  const regex = /<div class="wolfdlebot-mp-game__content__container__item\s+([^"]+)"[^>]*>(.*?)<\/div>/g;
  let match;
  const items = [];

  while ((match = regex.exec(html)) !== null) {
    items.push({ className: match[1], letter: match[2].trim() });
  }

  const rows = [];
  for (let i = 0; i < items.length; i += 5) {
    const rowItems = items.slice(i, i + 5);
    if (!rowItems[0] || rowItems[0].className.includes('border-only')) break;

    const word = rowItems.map(item => item.letter).join('');
    const feedback = rowItems.map(item => {
      if (item.className.includes('invalid')) return 'gray';
      if (item.className.includes('incorrect')) return 'yellow';
      return 'green'; // أي كلاس يحتوي على حرف وليس رمادي أو أصفر فهو أخضر صح 100%
    });

    rows.push({ word, feedback });
  }
  return rows;
}

// ==================== 🚀 تشغيل البوت والاتصال ====================
function startBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = Number(message.targetGroupId || message.groupId || 0);

      // الفلترة الصارمة: منع استقبال أي بيانات خارج الروم وبوت اللعبة المحدد
      if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

      // التفاعل فقط مع رسائل الـ HTML التي تحتوي على لوحة اللعبة
      if (message.type !== 'text/html') return;

      const htmlContent = message.body;
      const history = parseGameHtml(htmlContent);
      
      console.log(`\n📊 تم تحليل اللوحة الحالية. المحاولات المستهلكة حتى الآن: ${history.length}`);

      // التحقق من الفوز
      if (history.length > 0 && history[history.length - 1].feedback.every(f => f === 'green')) {
        console.log(`🎉 كفو! تم الفوز بالكلمة: "${history[history.length - 1].word}"`);
        return;
      }

      // إذا وصلنا للمحاولة السادسة ولم نفز
      if (history.length >= 6) {
        console.log('💀 للأسف انتهت المحاولات الست دون فوز.');
        return;
      }

      let nextGuess = '';
      let currentPool = [...ALL_WORDS];

      if (history.length === 0) {
        // اللعبة بدأت للتو واللوحة بيضاء
        nextGuess = FIRST_WORD;
        console.log(`🎯 خطوة 1: إرسال الكلمة الافتتاحية الثابتة: [ ${nextGuess} ]`);
      } 
      else if (history.length === 1) {
        // المحاولة الثانية: تطبيق استراتيجيتك واختيار حروف مختلفة كلياً
        nextGuess = getOptimalSecondWord(currentPool, history[0].word);
        console.log(`🔍 خطوة 2: جمع المعلومات بكلمة ذات حروف جديدة: [ ${nextGuess} ]`);
      } 
      else {
        // المحاولات من 3 إلى 6: التصفية والقنص الذكي
        currentPool = filterDictionary(currentPool, history);
        nextGuess = currentPool[0];
        console.log(`🚀 خطوة ${history.length + 1}: قنص ذكي. الكلمات المتبقية في الاحتمالات: ${currentPool.length}`);
        console.log(`👉 الكلمة المختارة: [ ${nextGuess} ]`);
      }

      if (!nextGuess) {
        console.log('⚠️ خطأ صارم: لم يتبق أي كلمة مطابقة للشروط في المكتبة!');
        return;
      }

      // إرسال التخمين الذكي فوراً إلى الغرفة
      await new Promise(resolve => setTimeout(resolve, 1500)); // ركود بسيط لمنع الحظر
      await service.messaging.sendGroupMessage(ROOM_ID, nextGuess);

    } catch (err) {
      console.error('❌ حدث خطأ داخلي أثناء معالجة اللعبة:', err.message);
    }
  });

  service.on('ready', () => {
    console.log('✅ البوت متصل وجاهز تماماً ومقيد بالروم وبوت اللعبة بنسبة خطأ 0%!');
  });

  service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(err => {
    console.error('❌ فشل تسجيل الدخول إلى وولف:', err.message);
  });
}

startBot();
