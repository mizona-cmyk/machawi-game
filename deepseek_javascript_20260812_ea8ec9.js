// ============================================
// 🔐 التواصل مع الخادم بدلاً من localStorage
// ============================================

// دالة للحصول على معرف فريد للمستخدم
function getUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
}

// دالة للتواصل مع الخادم
async function playOnServer(accuracy, won, prize) {
  const userId = getUserId();
  
  try {
    const response = await fetch('/api/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        accuracy,
        won,
        prize
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // عرض رسالة الخطأ للمستخدم
      statusEl.textContent = data.message || 'حدث خطأ، حاول مرة أخرى';
      startBtn.disabled = false;
      return null;
    }
    
    // تحديث الإحصائيات من الخادم
    updateStatsFromServer(data.stats);
    
    return data;
    
  } catch (error) {
    console.error('خطأ في الاتصال بالخادم:', error);
    statusEl.textContent = '⚠️ لا يمكن الاتصال بالخادم. تأكد من الاتصال بالإنترنت.';
    startBtn.disabled = false;
    return null;
  }
}

// دالة لتحديث الإحصائيات من الخادم
function updateStatsFromServer(stats) {
  if (!stats) return;
  
  const statsEl = document.getElementById('statsDisplay');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-item">
        <span>🎯 المحاولات</span>
        <span>${stats.attempts || 0}</span>
      </div>
      <div class="stat-item">
        <span>🏆 مرات الفوز</span>
        <span>${stats.wins || 0}</span>
      </div>
      <div class="stat-item">
        <span>📊 أفضل دقة</span>
        <span>${stats.bestAccuracy || 0}%</span>
      </div>
      <div class="stat-item">
        <span>📈 نسبة الفوز</span>
        <span>${stats.attempts ? Math.round((stats.wins / stats.attempts) * 100) : 0}%</span>
      </div>
    `;
  }
}

// ============================================
// 📝 تعديل دالة showResult لاستخدام الخادم
// ============================================

// استبدل دالة showResult الحالية بهذه:
async function showResult(isWin) {
  played = true;
  const center = x + chickenWidth / 2;
  const zoneCenter = zoneStart + zoneWidth / 2;
  const distance = Math.abs(center - zoneCenter);
  const maxDistance = Math.max(1, zoneWidth / 2);
  const finalAccuracy = Math.max(0, Math.round((1 - distance / maxDistance) * 100));
  
  accuracyEl.textContent = finalAccuracy + '%';
  
  // الاتصال بالخادم
  const result = await playOnServer(finalAccuracy, isWin, isWin ? 'فريت' : null);
  
  if (!result) {
    // فشل الاتصال بالخادم
    overlay.classList.add('show');
    card.className = 'prize-card lose';
    resultIcon.textContent = '⚠️';
    tag.textContent = 'خطأ';
    resultTitle.textContent = 'فشل الاتصال';
    resultText.textContent = 'تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.';
    return;
  }
  
  // عرض النتيجة من الخادم
  card.className = 'prize-card ' + (result.won ? 'win' : 'lose');
  resultIcon.textContent = result.won ? (result.accuracy >= 95 ? '🌟' : '🏆') : '🐔';
  
  if (result.won) {
    tag.textContent = result.accuracy >= 95 ? 'دقة ممتازة! 🌟' : 'مبروك!';
    resultTitle.textContent = result.prize || 'جائزة';
    resultText.textContent = `أوقفت الدجاجة بدقة ${result.accuracy}%. احتفظ بالكود وأظهره للنادل.`;
    prizeCodeEl.style.display = 'block';
    prizeCodeEl.textContent = result.code || 'MD-XXXX';
    copyBtn.style.display = 'block';
    prizeMeta.textContent = `تم اللعب في: ${new Date().toLocaleString('ar-MA')} • الصلاحية: 24 ساعة`;
    securityNote.textContent = '🔐 كود فريد لهذه الجولة. التحقق النهائي يتم عند ربط اللعبة بنظام المطعم.';
  } else {
    tag.textContent = 'قريب!';
    resultTitle.textContent = 'هربت منك 🐔';
    resultText.textContent = `دقتك ${result.accuracy}%. حاول مرة أخرى عندما تصبح المحاولة متاحة.`;
    prizeCodeEl.style.display = 'none';
    copyBtn.style.display = 'none';
    prizeMeta.textContent = 'هذه الجولة احتُسبت كمحاولة واحدة.';
    securityNote.textContent = '⏳ الانتظار يحمي اللعبة من المحاولات المتكررة.';
  }
  
  overlay.classList.add('show');
}