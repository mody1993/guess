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
                        { text: "أجب باسم الشيء فقط بكلمة واحدة بالعربية. لا تكتب أي شيء آخر." },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }]
            })
        });
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim().replace(/[.\\/]/g, '');
    } catch (err) {
        console.error('❌ خطأ في الاتصال المباشر بـ Gemini:', err.message);
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
                console.log(`💡 الإجابة: ${answer}`);
                await service.messaging.sendGroupMessage(ROOM_ID, answer);
                console.log(`✅ تم الإرسال بنجاح!`);
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
