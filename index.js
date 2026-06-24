import 'dotenv/config';
import fetch from 'node-fetch';

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('📋 الموديلات المتاحة في حسابك:', JSON.stringify(data, null, 2));
}

listModels();
