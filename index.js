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
            model: 'models/gemini-1.5-flash',
            contents: [{ role: 'user', parts: [
                { text: "أجب باسم الشيء بكلمة واحدة فقط بالعربية. لا تشرح، لا تضع علامات." },
                { inlineData: { mimeType: mimeType, data: base64Image } }
            ]}],
            generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        });
        return response.text?.trim().replace(/[.\\/]/g, '');
    } catch (err) {
        return null;
    }
}

service.on('message', async (message) => {
    const senderId = Number(message.sourceSubscriberId);
    const roomId = Number(message.targetGroupId || message.groupId || 0);

    if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

    // فحص إذا كان محتوى الرسالة رابط صورة
    if (message.body && message.body.startsWith('http') && message.body.includes('.jpeg')) {
        console.log('📸 اكتشفت صورة، جاري التحليل...');
        try {
            const res = await fetch(message.body);
            const buffer = Buffer.from(await res.arrayBuffer());
            const answer = await guessImage(buffer.toString('base64'), 'image/jpeg');
            
            if (answer) {
                await service.messaging.sendGroupMessage(ROOM_ID, answer);
                console.log(`✅ تم الإرسال: ${answer}`);
            }
        } catch (e) {
            console.log('❌ خطأ في تحميل الصورة');
        }
    }
});

service.on('ready', async () => {
    console.log('✅ البوت جاهز، يرسل أمر البدء...');
    // يرسل !ج مرة واحدة فقط عند الاتصال
    await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1);
