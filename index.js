import 'dotenv/config';
import wolfjs from 'wolf.js';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const service = new WOLF();

async function guessImage(base64Image, mimeType) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [
                { text: "أجب باسم الشيء فقط في الصورة بكلمة واحدة (مثال: تزلج). لا تشرح، لا تضع علامات." },
                { inlineData: { mimeType: mimeType, data: base64Image } }
            ]}],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        });
        return response.text?.trim().replace(/[.\\/]/g, '');
    } catch (err) {
        console.error('❌ خطأ في تحليل Gemini:', err.message);
        return null;
    }
}

service.on('message', async (message) => {
    // مراقبة الرسائل
    if (message.sourceSubscriberId == TARGET_USER_ID) {
        console.log('📬 وصلت رسالة من البوت، نوع الميتا:', message.mimeType);
    }

    const senderId = Number(message.sourceSubscriberId);
    const roomId = Number(message.targetGroupId || message.groupId || 0);

    if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

    let imageBuffer = null;
    if (message.body && Buffer.isBuffer(message.body)) {
        imageBuffer = message.body;
    } else if (message.imageUrl) {
        console.log('🔗 جارٍ تحميل الصورة من الرابط...');
        const res = await fetch(message.imageUrl);
        imageBuffer = Buffer.from(await res.arrayBuffer());
    }

    if (imageBuffer) {
        console.log('📸 تم استلام الصورة، جاري التحليل عبر Gemini...');
        const answer = await guessImage(imageBuffer.toString('base64'), 'image/jpeg');
        if (answer) {
            await service.messaging.sendGroupMessage(ROOM_ID, answer);
            console.log(`🚀 تم إرسال الإجابة بنجاح: ${answer}`);
        } else {
            console.log('⚠️ Gemini لم يرجع أي إجابة!');
        }
    } else {
        console.log('⚠️ لم أستطع استخراج بافر الصورة من الرسالة.');
    }
});

service.on('ready', () => {
    console.log('✅ البوت متصل ومستعد!');
    service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1);
