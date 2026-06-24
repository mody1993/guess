import 'dotenv/config';
import wolfjs from 'wolf.js';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

// إعدادات الغرفة والبوت
const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const service = new WOLF();

async function guessImage(base64Image, mimeType) {
    try {
        // استخدام الموديل المتوافق مع API الإصدار الحالي
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [
                { text: "أجب باسم الشيء فقط بكلمة واحدة بالعربية. لا تكتب أي شيء آخر." },
                { inlineData: { mimeType: mimeType, data: base64Image } }
            ]}],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        });
        return response.text?.trim().replace(/[.\\/]/g, '');
    } catch (err) {
        console.error('❌ خطأ Gemini:', err.message);
        return null;
    }
}

service.on('message', async (message) => {
    const senderId = Number(message.sourceSubscriberId);
    const roomId = Number(message.targetGroupId || message.groupId || 0);

    if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

    // التحقق من أن الرسالة تحتوي على رابط صورة
    if (message.body && message.body.startsWith('http') && (message.body.includes('.jpeg') || message.body.includes('.jpg'))) {
        console.log('📸 اكتشفت صورة، جاري التحليل...');
        
        try {
            const res = await fetch(message.body);
            const buffer = Buffer.from(await res.arrayBuffer());
            
            // تأخير بسيط لضمان استقرار الاتصال قبل الإرسال
            await new Promise(r => setTimeout(r, 1500));
            
            const answer = await guessImage(buffer.toString('base64'), 'image/jpeg');
            
            if (answer) {
                console.log(`💡 الإجابة المستخرجة: ${answer}`);
                const sent = await service.messaging.sendGroupMessage(ROOM_ID, answer);
                if (sent) {
                    console.log(`✅ تم إرسال الإجابة بنجاح!`);
                } else {
                    console.log(`⚠️ فشل الإرسال من السيرفر.`);
                }
            } else {
                console.log('⚠️ لم يتمكن Gemini من استخراج إجابة.');
            }
        } catch (e) {
            console.log('❌ خطأ في المعالجة:', e.message);
        }
    }
});

service.on('ready', async () => {
    console.log('✅ البوت جاهز ويراقب الغرفة...');
    // إرسال أمر البدء فوراً عند الاتصال
    await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
    console.log('🚀 تم إرسال أمر البدء (!ج)');
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1).catch(err => {
    console.error('❌ فشل تسجيل الدخول:', err);
});
