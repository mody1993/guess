import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs;

// ================== الإعدادات الصارمة ==================
const ROOM_ID = 81971125;
const TARGET_USER_ID = 82641759; // ⚠️ ضع هنا ID بوت الكلمات (WOLFdle Bot) الرسمي

let service = null;

function startTestBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = Number(message.targetGroupId || message.groupId || 0);

      // 🛑 حارس البوابة: لو الرسالة مو من البوت المطلوب أو مو في غرفتك، يقفل فوراً بدون ما يطبع حرف واحد
      if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) {
        return;
      }

      // إذا مرّت الرسالة من الفلتر (يعني تخص اللعبة فقط)، يطبع الأسطر البسيطة هذه فقط:
      console.log('\n================ 📥 رسالة مستهدفة من بوت اللعبة ================');
      console.log(`📝 النص (Body): "${message.body || 'لا يوجد نص'}"`);
      console.log(`🆔 النوع (Type): ${message.type}`);
      
      // فحص إذا كانت الصورة مدمجة كبطاقة (Embed)
      if (message.embeds && message.embeds.length > 0) {
        console.log('🔗 بيانات الـ Embeds المرفقة:');
        console.log(JSON.stringify(message.embeds, null, 2));
      }

      // فحص إذا كانت رسالة صورة عادية
      if (message.isImage || message.mimeType?.includes('image')) {
        console.log(`🖼️ تم رصد صورة! الـ ID الخاص بها هو: ${message.id}`);
      }
      
      console.log('============================================================\n');

    } catch (err) {
      // تجاهل الأخطاء الجانبية لتبقى الشاشة نظيفة
    }
  });

  service.on('ready', async () => {
    console.log('🎯 تم تشغيل البوت بنجاح وهو الآن يراقب الغرفة وبوت اللعبة فقط.');
    
    // إرسال أمر البدء
    await service.messaging.sendGroupMessage(ROOM_ID, '!كلمات');
  });

  service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(() => {});
}

startTestBot();
