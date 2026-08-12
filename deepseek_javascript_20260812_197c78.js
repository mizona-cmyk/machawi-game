// netlify/functions/api.js
// هذا الكود يُنفذ على خادم Netlify، وليس في متصفح المستخدم

// تخزين مؤقت في الذاكرة (للتجربة فقط)
// في الإنتاج الحقيقي، استخدم قاعدة بيانات
const store = new Map();

exports.handler = async (event, context) => {
  // السماح بالطلبات من أي مصدر (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // رد على طلب OPTIONS (ما قبل الطلب)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { userId } = JSON.parse(event.body || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'معرف المستخدم مطلوب',
          success: false 
        })
      };
    }

    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 ساعة

    // جلب بيانات المستخدم أو إنشاؤها
    let userData = store.get(userId);
    if (!userData) {
      userData = {
        lastPlay: 0,
        attempts: 0,
        wins: 0,
        totalAccuracy: 0,
        bestAccuracy: 0
      };
    }

    // التحقق من فترة التهدئة
    if (now - userData.lastPlay < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - userData.lastPlay)) / 3600000);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          success: false,
          allowed: false,
          message: `يمكنك اللعب مرة أخرى بعد ${remaining} ساعة`,
          remainingHours: remaining,
          stats: {
            attempts: userData.attempts,
            wins: userData.wins,
            bestAccuracy: userData.bestAccuracy
          }
        })
      };
    }

    // تحديث وقت آخر محاولة
    userData.lastPlay = now;
    userData.attempts++;

    // محاكاة نتيجة اللعبة (هذا يحدث على الخادم)
    const winChance = 0.6; // 60% فرصة فوز
    const won = Math.random() < winChance;
    const accuracy = 60 + Math.floor(Math.random() * 40); // 60-100%
    
    let prize = null;
    let code = null;

    if (won) {
      userData.wins++;
      if (accuracy > userData.bestAccuracy) {
        userData.bestAccuracy = accuracy;
      }
      
      // اختيار جائزة عشوائية
      const prizes = ['فريت', 'عصير', 'وجبة دجاج', 'تركي'];
      const weights = [50, 25, 15, 10];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          prize = prizes[i];
          break;
        }
      }
      
      // توليد كود فريد
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      code = 'MD-';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    // حفظ البيانات
    store.set(userId, userData);

    // إرجاع النتيجة
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allowed: true,
        won,
        accuracy,
        prize,
        code,
        stats: {
          attempts: userData.attempts,
          wins: userData.wins,
          bestAccuracy: userData.bestAccuracy
        },
        message: won ? '🎉 مبروك! لقد فزت بجائزة!' : '😢 للأسف، لم تفز هذه المرة. حاول مرة أخرى غداً!'
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'حدث خطأ في الخادم'
      })
    };
  }
};