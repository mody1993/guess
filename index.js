import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs;

// ================== الإعدادات ==================
const ROOM_ID = 81971125;
const TARGET_USER_ID = 82641759; // ⚠️ ضع هنا ID بوت الكلمات (WOLFdle Bot) الرسمي

let service = null;

function startTestBot() {
  service = new WOLF();

  service.on('message', async (message) => {
    try {
      const senderId = Number(message.sourceSubscriberId);
      const roomId = Number(message.targetGroupId || message.groupId || 0);

      // الاستماع فقط لرسائل بوت اللعبة داخل الغرفة المحددة
      if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

      console.log('\n================ 📥 رسالة جديدة من بوت اللعبة ================');
      console.log(`🆔 نوع الرسالة (Type): ${message.type}`);
      console.log(`📝 نص الرسالة (Body): "${message.body || 'لا يوجد نص'}"`);
      console.log(`🖼️ نوع الميديا (MimeType): ${message.mimeType || 'لا يوجد'}`);
      
      // طباعة الـ Embeds لو كانت الصورة مرسلة كبطاقة
      if (message.embeds) {
        console.log('🔗 الـ Embeds المرفقة:', JSON.stringify(message.embeds, null, 2));
      }

      // طباعة الكائن (Message Object) بالكامل لرؤية كل الخصائص الخفية
      console.log('⚙️ تفاصيل كائن الرسالة الكاملة:');
      console.dir(message, { depth: null });
      console.log('============================================================\n');

    } catch (err) {
      console.log('❌ خطأ أثناء فحص الرسالة:', err.message);
    }
  });

  service.on('ready', async () => {
    console.log('✅ بوت الفحص جاهز ويعمل الآن... في انتظار رسالة من بوت اللعبة.');
    
    // إرسال أمر البدء لتنشيط اللعبة ورؤية الرد فوراً
    await service.messaging.sendGroupMessage(ROOM_ID, '!كلمات');
  });

  service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(err => {
    console.log('❌ فشل تسجيل الدخول:', err.message);
  });
}

startTestBot();
