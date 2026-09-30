/* Meta (Facebook) Pixel — Byte Trade International
 * حط الـ Pixel ID الحقيقي مكان القيمة اللي تحت. طالما فيها YOUR_PIXEL_ID مش هيتبعت أي حاجة لفيسبوك. */
(function () {
  var PIXEL_ID = '1422447686490387';
  if (!PIXEL_ID || PIXEL_ID === 'YOUR_PIXEL_ID') return;
  if (window.__btPixelLoaded) return; // حماية من التحميل المزدوج
  window.__btPixelLoaded = true;

  try {
    // كود البكسل الرسمي
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');

    if (location.pathname.indexOf('/products/') === 0) {
      fbq('track', 'ViewContent', { content_name: document.title, content_type: 'product' });
    }
  } catch (e) {}

  // منع تكرار نفس الحدث في نفس الثانية
  var last = {};
  function track(name, params) {
    try {
      var now = Date.now();
      if (last[name] && now - last[name] < 1000) return;
      last[name] = now;
      if (window.fbq) fbq('track', name, params || {});
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    try {
      var el = e.target.closest('a[href], button, [onclick]');
      if (!el) return;
      var href = (el.getAttribute('href') || '').toLowerCase();
      var onclickAttr = el.getAttribute('onclick') || '';

      if (onclickAttr.indexOf('checkoutViaWhatsApp') !== -1) {
        track('InitiateCheckout');
      } else if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
        track('Contact', { method: 'whatsapp' });
      } else if (href.indexOf('m.me') !== -1 || href.indexOf('messenger.com') !== -1) {
        track('Contact', { method: 'messenger' });
      } else if (href.indexOf('tel:') === 0) {
        track('Contact', { method: 'phone' });
      }
    } catch (err) {}
  }, true);
})();