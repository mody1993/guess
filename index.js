import 'dotenv/config';
import wolfjs from 'wolf.js';
import fetch from 'node-fetch';

const { WOLF } = wolfjs;

const ROOM_ID = 70505;
const TARGET_USER_ID = 26491704;
const START_COMMAND = '!ج';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const service = new WOLF();

async function guessImage(base64Image) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "أجب باسم الشيء بكلمة واحدة فقط بالعربية." },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }],
                // إعدادات الأمان للسماح بجميع أنواع الصور
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ]
            })
        });
        
        const data = await response.json();
        console.log('🔍 رد Gemini الكامل:', JSON.stringify(data, null, 2));

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim().replace(/[.\\/]/g, '');
        } else {
            return null;
        }
    } catch (err) {
        console.error('❌ خطأ في الاتصال:', err.message);
        return null;
    }
}

service.on('message', async (message) => {
    const senderId = Number(message.sourceSubscriberId);
    const roomId = Number(message.targetGroupId || message.groupId || 0);

    if (roomId !== ROOM_ID || senderId !== TARGET_USER_ID) return;

    if (message.body && message.body.startsWith('http') && (message.body.includes('.jpeg') || message.body.includes('.jpg'))) {
        console.log('📸 اكتشفت صورة، جاري التحليل...');
        
        try {
            const res = await fetch(message.body);
            const buffer = await res.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');
            
            const answer = await guessImage(base64Image);
            
            if (answer) {
                console.log(`💡 الإجابة المستخرجة: ${answer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, answer);
                console.log(`✅ تم الإرسال بنجاح!`);
            } else {
                console.log('⚠️ لم يستطع Gemini تحليل الصورة (راجع الرد الكامل أعلاه).');
            }
        } catch (e) {
            console.log('❌ خطأ في المعالجة:', e.message);
        }
    }
});

service.on('ready', async () => {
    console.log('✅ البوت متصل!');
    await service.messaging.sendGroupMessage(ROOM_ID, START_COMMAND);
});

service.login(process.env.U_MAIL_1, process.env.U_PASS_1);
