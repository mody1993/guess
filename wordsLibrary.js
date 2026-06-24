const fs = require('fs');
const path = require('path');

// تحديد مسار ملف الكلمات الخارجي
const filePath = path.join(__dirname, 'words.txt');

let UNIQUE_WORDS = [];

try {
  // قراءة محتوى الملف وتحويله إلى مصفوفة كلمات
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  UNIQUE_WORDS = [...new Set(fileContent.split(/[\n,]+/))]
    .map(w => w.trim())
    .filter(w => w.length === 5); // شرط البوت: 5 أحرف فقط

  console.log(`📚 تم تحميل قاموس بوت كلمات WOLF بنجاح!`);
  console.log(`📊 إجمالي عدد الكلمات الخماسية الجاهزة للعب: ${UNIQUE_WORDS.length} كلمة.`);

} catch (error) {
  console.error("❌ خطأ: تأكد من إنشاء ملف words.txt بجانب ملف الكود!", error.message);
}

module.exports = {
  ALL_WORDS: UNIQUE_WORDS
};
