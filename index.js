import 'dotenv/config';
import wolfjs from 'wolf.js';
import { GoogleGenAI } from '@google/genai';

const { WOLF } = wolfjs;

// ================== الإعدادات ==================
const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704; // الـ ID الخاص بـ Guess What Bot
const START_COMMAND = '!ج';

// تهيئة ذكاء Google المجاني باستخدام المتغير البيئي الجديد
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let service = null;
let reconnecting = false;
let isBotReady = false;

function getRoomId(message) {
  return Number(message.targetGroupId || message.groupId || message.channelId || message.recipientGroupId || message.group?.id || 0);
}

async function send(roomId, text) {
  try {
    if (!service || !isBotReady) return false;
    await service.messaging.sendGroupMessage(roomId, text);
    console.log(`🚀 تم إرسال الإجابة: ${text}`);
    return true;
  } catch (err) {
    console.log('❌ فشل الإرسال:', err.message);
    return false;
  }
}

// ================== دالة التخمين المجانية عبر Gemini ==================
async function guessImage(base64Image, mimeType) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // الموديل فائق السرعة والمجاني لقراءة وتحليل الصور
      contents: [
        {
          role: 'user',
          parts: [
            { text: "ما هذا الشيء الموجود في الصورة؟ أجب بكلمة واحدة أو كلمتين فقط باللغة العربية (مثال مباشر: أسد، بيانو، برج إيفل، ناروتو، بيتزا، كرة القدم، فيسبوك). لا تكتب أي مقدمات، شرح، أو علامات ترقيم، فقط الاسم المباشر والصحيح للشيء للفوز بالمسابقة." },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 15,
        temperature: 0.1
      }
    });

    const answer = response.text?.trim();
    return answer ? answer.replace(/[.\\/]/g, '') : null;

  } catch (error) {
    console.error('❌ خطأ أثناء التخمين عبر Gemini:', error.message);
    return null;
  }
}

// ================== تشغيل البوت والربط مع وولف ==================
function startBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = getRoomId(message);

      // الفلاتر والشروط الأساسية للغرفة وبوت الفعاليات
      if (!message.isGroup || roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

      // فحص إذا كانت الرسالة القادمة عبارة عن صورة
      const isImage = message.mimeType?.startsWith('image/') || message.isImage || Buffer.isBuffer(message.body);
      if (!isImage) return;

      console.log('--------------------');
      console.log('📸 تم استلام صورة من بوت الفعاليات، جاري معالجتها مجاناً...');

      let imageBuffer = message.body;
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        console.log('⚠️ لم يتم العثور على بافر الصورة داخل الرسالة.');
        return;
      }

      const mimeType = message.mimeType || 'image/jpeg';
      const base64Image = imageBuffer.toString('base64');

      const startTime = Date.now();
      const answer = await guessImage(base64Image, mimeType);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (answer) {
        console.log(`💡 التخمين الذكي (Gemini): "${answer}" (استغرق ${duration} ثانية)`);
        await send(roomId, answer);
      }

    } catch (err) {
      console.log('❌ Message Error:', err.message);
    }
  });

  service.on('ready', async () => {
    console.log('✅ الحساب جاهز ومستعد لتخمين الصور مجاناً بالكامل عبر Gemini!');
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

async function restartBot(reason) {
  if (reconnecting) return;
  reconnecting = true;
  isBotReady = false;
  console.log('🔄 إعادة تشغيل البوت بسبب:', reason);
  try { if (service) { service.removeAllListeners(); await service.logout().catch(() => {}); } } catch {}
  await sleep(5000);
  startBot();
}

startBot();
