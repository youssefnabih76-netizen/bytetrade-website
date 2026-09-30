/* Google Analytics 4 — يعمل بجانب Vercel Analytics.
 * استبدل القيمة التالية بـ Measurement ID الخاص بك (GA4 ← Admin ← Data streams ← Web).
 * طالما القيمة ما زالت G-XXXXXXXXXX لن يُرسل أي شيء لجوجل. */
(function () {
  var GA_ID = 'G-XXXXXXXXXX';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  if (GA_ID === 'G-XXXXXXXXXX') return;

  gtag('js', new Date());
  gtag('config', GA_ID);

  // تحميل مكتبة gtag بعد اكتمال تحميل الصفحة ووقت خمول المتصفح حتى لا تؤثر على سرعة الصفحة
  function load() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }
  function schedule() {
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 1500);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();
/* =========================================================
   Byte Trade International — تتبع الضغطات المهمة (Custom Events)
   حط الكود ده في آخر ملف analytics.js بتاعك (بعد أي كود موجود فيه).
   لازم index.html/clients.html يكونوا محمّلين قبله:
     window.va shim  +  /_vercel/insights/script.js
   (موجودين عندك بالفعل قبل analytics.js).
   ========================================================= */
document.addEventListener('click', function (e) {
  const el = e.target.closest('a[href], button, [onclick]');
  if (!el) return;

  const track = (name) => {
    if (window.va) window.va('event', { name: name });
  };

  const href = (el.getAttribute('href') || '').toLowerCase();
  const onclickAttr = el.getAttribute('onclick') || '';

  if (href.includes('wa.me') || href.includes('api.whatsapp.com') || onclickAttr.includes('checkoutViaWhatsApp')) {
    track('whatsapp_click');
  } else if (href.includes('m.me') || href.includes('messenger.com')) {
    track('messenger_click');
  } else if (href.startsWith('tel:')) {
    track('phone_click');
  } else if (el.id === 'cartToggleBtn') {
    track('cart_open');
  } else if (el.id === 'searchToggleBtn') {
    track('search_open');
  } else if (el.id === 'mobile-menu-toggle-btn') {
    track('menu_open');
  } else if (href.includes('.pdf')) {
    track('pdf_download');
  }
});