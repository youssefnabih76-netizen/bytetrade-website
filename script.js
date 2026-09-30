/* ============================================================
   Byte Trade International — Main JavaScript
   ملف الجافاسكريبت الرئيسي — تم فصله من ملف index.html الأصلي
   يحتوي على: قائمة المنتجات، الفلترة، البحث، القوائم المتحركة،
   عداد الإحصائيات، تأثيرات الحركة، وجدول الأسعار.
   ============================================================ */
/* ========== حماية من العناصر الناقصة في الصفحات المولّدة ========== */
function safeQuery(selector, callback) {
    const el = document.querySelector(selector);
    if (el && typeof callback === 'function') callback(el);
    return el;
}
/* ========== أدوات الأداء ========== */
function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

function highlightMatch(text, query) {
    if (!text) return '';
    let safeText = escapeHTML(text);
    if (!query) return safeText;
    const terms = query.split(' ').filter(t => t.trim() !== '');
    if (!terms.length) return safeText;
    let highlighted = safeText;
    terms.forEach(term => {
        const safeTerm = escapeHTML(term);
        const regex = new RegExp(`(${safeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="bg-blue-100 text-blue-900 font-bold px-0.5 rounded">$1</mark>');
    });
    return highlighted;
}

   const baseProducts = window.baseProducts || [];

        // Unifies messy status variants ("Stock" / "Order" / "ORDER" /
        // "Lead Time 2-4 Weeks" / ...) into exactly 3 canonical states.
        // See status-utils.js — the same function runs at build time for
        // the generated product pages, so the label is always consistent.
       const statusUtils = (typeof StatusUtils !== 'undefined' && StatusUtils) ? StatusUtils : {
    normalizeStatus: (s) => ({
        label: s || 'متوفر',
        badgeClass: 'bg-emerald-100 text-emerald-700',
        schemaAvailability: 'https://schema.org/InStock'
    })
};

const products = baseProducts.map(product => {
    const status = statusUtils.normalizeStatus(product.status);
    return {
        ...product,
        price: isNaN(Number(product.price)) ? null : Number(product.price),
        stockLabel: status.label,
        statusBadgeClass: status.badgeClass
    };
});

                function formatPrice(price) {
            if (!price && price !== 0) return 'Contact Price';
            return `EGP ${Number(price).toLocaleString('en-EG')}`;
        }

        function renderCategoryCounts() {
            const counts = products.reduce((acc, p) => {
                acc[p.group] = (acc[p.group] || 0) + 1;
                return acc;
            }, {});
            document.querySelectorAll('.service-card[data-category]').forEach(card => {
                const count = counts[card.dataset.category] || 0;
                if (!count || card.querySelector('.cat-count-badge')) return;
                const badge = document.createElement('span');
                badge.className = 'cat-count-badge absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] md:text-xs font-bold px-2 py-1 rounded-full shadow-md';
                badge.textContent = `${count} منتج`;
                card.appendChild(badge);
            });
        }
      function toggleSearchBar() {
    const searchBar = document.getElementById('searchBarHeader');
    // لو مش موجود (صفحة منتج مولّدة) → روح للصفحة الرئيسية
    if (!searchBar) {
        window.location.href = '/#products';
        return;
    }
    const searchInput = document.getElementById('productSearch');
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden') && searchInput) {
        searchInput.focus();
    }

}

        let currentCategoryFilter = 'all';
        let currentBrandFilter = null;
        let currentSearchQuery = '';
        let productsPerPage = 8;
        let currentPage = 1;
        // ============ سلة المشتريات (Shopping Cart) ============
        let cart = [];
        try {
            cart = JSON.parse(localStorage.getItem('bt_cart') || '[]');
        } catch (e) {
            cart = [];
        }

        function saveCart() {
            try {
                localStorage.setItem('bt_cart', JSON.stringify(cart));
            } catch (e) {
                console.warn('تعذر حفظ السلة محلياً:', e);
            }
        }

        function getCartItem(code) {
            return cart.find(item => item.code === code);
        }

        function addToCart(code, sourceEl) {
            const product = products.find(p => p.code === code);
            if (!product) return;

            const existing = getCartItem(code);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({
                    code: product.code,
                    name: product.name,
                    brand: product.brand,
                    model: product.model,
                    image: product.image,
                    price: product.price,
                    qty: 1
                });
            }
            try {
                if (window.fbq) fbq('track', 'AddToCart', {
                    content_ids: [product.code],
                    content_name: product.name,
                    content_type: 'product',
                    value: Number(product.price) || 0,
                    currency: 'EGP'
                });
            } catch (e) {}
                        saveCart();
            updateCartBadge();
            renderCart();
            if (sourceEl) {
                flyToCart(sourceEl);
            }
        }

        function updateCartQty(code, delta) {
            const item = getCartItem(code);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                removeFromCart(code);
                return;
            }
            saveCart();
            updateCartBadge();
            renderCart();
        }

        function removeFromCart(code) {
            cart = cart.filter(item => item.code !== code);
            saveCart();
            updateCartBadge();
            renderCart();
        }

        function clearCart() {
            cart = [];
            saveCart();
            updateCartBadge();
            renderCart();
        }

        function getCartTotal() {
            return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        }

        function getCartCount() {
            return cart.reduce((sum, item) => sum + item.qty, 0);
        }

        function updateCartBadge() {
            const badge = document.getElementById('cartCountBadge');
            if (!badge) return;
            const count = getCartCount();
            badge.textContent = count;
            badge.classList.toggle('hidden', count === 0);
        }
        function flyToCart(sourceEl) {

            // عنصر الوجهة: أيقونة/عداد السلة في الهيدر
    const cartTarget = document.getElementById('cartCountBadge');
    if (!cartTarget) return;

    const productCard = sourceEl.closest('.product-card');
    const productImg = productCard ? productCard.querySelector('.product-card-media img') : null;

    const startRect = (productImg || sourceEl).getBoundingClientRect();
    const endRect = cartTarget.getBoundingClientRect();

    const flyEl = document.createElement('div');
    flyEl.className = 'fly-to-cart-item';
    if (productImg) {
        flyEl.style.backgroundImage = `url('${productImg.src}')`;
    }

    flyEl.style.left = `${startRect.left + startRect.width / 2 - 20}px`;
    flyEl.style.top = `${startRect.top + startRect.height / 2 - 20}px`;

    document.body.appendChild(flyEl);

    const deltaX = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const deltaY = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);

    requestAnimationFrame(() => {
        flyEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.15) rotate(15deg)`;
        flyEl.style.opacity = '0.2';
        flyEl.style.transition = 'transform 0.75s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.7s ease-in';
    });

    flyEl.addEventListener('transitionend', () => {
        flyEl.remove();
        cartTarget.classList.add('cart-badge-pulse');
        setTimeout(() => cartTarget.classList.remove('cart-badge-pulse'), 400);
    });
}

        function openCart() {
            const panel = document.getElementById('cartPanel');
            const overlay = document.getElementById('cartOverlay');
            if (!panel || !overlay) return;
            overlay.classList.remove('hidden');
            requestAnimationFrame(() => {
                overlay.classList.add('opacity-100');
                panel.classList.remove('translate-x-full');
            });
            document.body.classList.add('overflow-hidden');
        }

        function closeCart() {
            const panel = document.getElementById('cartPanel');
            const overlay = document.getElementById('cartOverlay');
            if (!panel || !overlay) return;
            panel.classList.add('translate-x-full');
            overlay.classList.remove('opacity-100');
            document.body.classList.remove('overflow-hidden');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }

        function renderCart() {
            const cartItemsEl = document.getElementById('cartItems');
            const cartEmptyEl = document.getElementById('cartEmpty');
            const cartFooterEl = document.getElementById('cartFooter');
            const cartTotalEl = document.getElementById('cartTotal');
            if (!cartItemsEl) return;

            if (cart.length === 0) {
                cartItemsEl.innerHTML = '';
                if (cartEmptyEl) cartEmptyEl.classList.remove('hidden');
                if (cartFooterEl) cartFooterEl.classList.add('hidden');
                return;
            }

            if (cartEmptyEl) cartEmptyEl.classList.add('hidden');
            if (cartFooterEl) cartFooterEl.classList.remove('hidden');

            cartItemsEl.innerHTML = cart.map(item => `
                <div class="flex items-center gap-3 border-b border-slate-100 py-4 px-1">
                    <img src="${item.image}" loading="lazy" decoding="async" alt="${escapeHTML(item.name)}" class="w-16 h-16 object-contain bg-white border border-slate-100 rounded-lg p-1 flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-slate-800 truncate">${escapeHTML(item.name)}</div>
                        <div class="text-xs text-slate-400">${escapeHTML(item.brand)} | ${escapeHTML(item.model)}</div>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center gap-2 border border-slate-200 rounded-full px-1">
                                <button data-action="decrease" data-code="${escapeHTML(item.code)}" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-black" aria-label="إنقاص الكمية">−</button>
                                <span class="text-sm font-semibold w-5 text-center">${item.qty}</span>
                                <button data-action="increase" data-code="${escapeHTML(item.code)}" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-black" aria-label="زيادة الكمية">+</button>
                            </div>
                            <span class="text-sm font-black text-slate-900 dir-ltr">${item.price == null ? formatPrice(null) : formatPrice(item.price * item.qty)}</span>
                        </div>
                    </div>
                    <button data-action="remove" data-code="${escapeHTML(item.code)}" class="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0" aria-label="حذف المنتج">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `).join('');

            if (cartTotalEl) cartTotalEl.textContent = formatPrice(getCartTotal());
        }

        function checkoutViaWhatsApp() {
            if (cart.length === 0) return;
            let message = 'مرحباً، أرغب في طلب المنتجات التالية:\n\n';
            cart.forEach((item, i) => {
                message += `${i + 1}. ${item.name} (${item.model}) - الكمية: ${item.qty}\n`;
            });
            message += `\nالإجمالي التقديري: ${getCartTotal().toLocaleString('en-EG')} EGP`;
            window.open(`https://wa.me/201060555979?text=${encodeURIComponent(message)}`, '_blank');
        }

function sendContactForm() {
    const name = document.getElementById('contactName')?.value.trim() || '';
    const organization = document.getElementById('contactOrganization')?.value.trim() || '';
    const email = document.getElementById('contactEmail')?.value.trim() || '';
    const product = document.getElementById('contactProduct')?.value.trim() || '';
    const quantity = document.getElementById('contactQuantity')?.value.trim() || '';
    const msg = document.getElementById('contactMessage')?.value.trim() || '';

    // A quote needs a product name at minimum; a general message needs at
    // least a name + message. Either path is valid, but not neither.
    const isQuoteRequest = !!product;
    if (!name) {
        alert('من فضلك اكتب الاسم قبل الإرسال');
        return;
    }
    if (!isQuoteRequest && !msg) {
        alert('من فضلك اكتب اسم المنتج المطلوب أو رسالتك قبل الإرسال');
        return;
    }

    const lines = [isQuoteRequest ? 'طلب عرض سعر جديد من الموقع:' : 'رسالة تواصل جديدة من الموقع:'];
    lines.push(`الاسم: ${name}`);
    if (organization) lines.push(`اسم الجهة/الشركة: ${organization}`);
    lines.push(`البريد: ${email || 'غير مذكور'}`);
    if (product) lines.push(`المنتج: ${product}`);
    if (quantity) lines.push(`الكمية: ${quantity}`);
    if (msg) lines.push(`ملاحظات: ${msg}`);

    window.open(`https://wa.me/201060555979?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

// دالة عرض المنتجات المحدثة بالبحث الذكي

// دالة إخفاء القائمة المنسدلة
function hideSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

        function updateActiveBrandCards() {
            document.querySelectorAll('.brand-card').forEach(card => {
                const isActive = currentBrandFilter && card.dataset.brand === currentBrandFilter;
                card.classList.toggle('active', isActive);
            });
        }

        // Filter Function
        function filterProducts(category, btn) {
            const targetButton = btn || document.querySelector(`.category-btn[data-category="${category}"]`) || document.getElementById('allProductsFilter');

    // 1. تحديث شكل الزر النشط
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    if (targetButton) targetButton.classList.add('active');

    currentCategoryFilter = category;
    if (category === 'all') {
        currentBrandFilter = null;
        updateActiveBrandCards();
    }

    // 2. إعادة عرض المنتجات المفلترة
    renderProducts(category, currentBrandFilter, currentSearchQuery);
}

        function resetBrandFilter() {
            currentBrandFilter = null;
            currentCategoryFilter = 'all';
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            const allButton = document.getElementById('allProductsFilter');
            if (allButton) allButton.classList.add('active');
            updateActiveBrandCards();
            renderProducts('all', null, currentSearchQuery);
        }

        // Smart Ribbon Finder: cascading Brand -> Model
        // Brand casing is inconsistent in the data ("Evolis" vs "EVOLIS"), so we
        // dedupe case-insensitively but keep the first-seen casing for display.
        function uniqueByCaseInsensitive(values) {
            const seen = new Map();
            values.forEach(v => {
                const key = String(v || '').trim().toLowerCase();
                if (key && !seen.has(key)) seen.set(key, v.trim());
            });
            return [...seen.values()].sort((a, b) => a.localeCompare(b));
        }

        function populateFinderBrands() {
            const select = document.getElementById('finderBrandSelect');
            if (!select) return;
            const brands = uniqueByCaseInsensitive(
                products.filter(p => p.group === 'ribbons').map(p => p.brand)
            );
            brands.forEach(brand => {
                const opt = document.createElement('option');
                opt.value = brand;
                opt.textContent = brand;
                select.appendChild(opt);
            });
        }

        function onFinderBrandChange() {
            const brand = document.getElementById('finderBrandSelect').value;
            const modelSelect = document.getElementById('finderModelSelect');
            if (!brand) {
                modelSelect.disabled = true;
                modelSelect.innerHTML = '<option value="">اختر البراند أولاً</option>';
                return;
            }
            const models = uniqueByCaseInsensitive(
                products
                    .filter(p => p.group === 'ribbons' && p.brand.trim().toLowerCase() === brand.trim().toLowerCase())
                    .map(p => p.model)
            );
            modelSelect.innerHTML = '<option value="">اختر الموديل...</option>' +
                models.map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join('');
            modelSelect.disabled = false;
        }

        function onFinderModelChange() {
            const model = document.getElementById('finderModelSelect').value;
            if (!model) return;
            // Reuses the existing search pathway — renderProducts already
            // matches against the `model` field, so no new filter logic needed.
            const searchInput = document.getElementById('productSearch');
            if (searchInput) searchInput.value = model;
            filterProducts('ribbons');
            renderProducts('ribbons', null, model);
            document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Request Quote — scrolls to the contact form and prefills the
        // Product field so the visitor only has to add name/quantity.
        function requestQuote(productName) {
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                const productField = document.getElementById('contactProduct');
                if (productField) productField.value = productName;
                document.getElementById('contactName')?.focus();
            }, 800);
        }

        // Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartBadge();
    renderCart();
    populateFinderBrands();

    // إتاحة الوصول عبر الكيبورد (Accessibility): العناصر التالية كانت تُفعَّل
    // بالماوس فقط (onclick على div بدون tabindex)، فأصبحت الآن قابلة للتركيز
    // (Tab) ويمكن تفعيلها بمفتاحي Enter أو Space لمستخدمي لوحة المفاتيح وقارئ الشاشة.
    document.querySelectorAll('.service-card[data-category], .brand-card[data-brand]').forEach(card => {
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
        if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
    document.querySelectorAll('.brand-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e) e.preventDefault(); // احتياطي: البطاقة div وليست رابط، لكن للأمان

            const selectedBrand = card.dataset.brand;
            currentBrandFilter = (currentBrandFilter === selectedBrand) ? null : selectedBrand;

            // إعادة ضبط فلتر الفئة إلى "All Products" بغض النظر عن الفئة المختارة سابقاً
            currentCategoryFilter = 'all';
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            const allButton = document.getElementById('allProductsFilter');
            if (allButton) allButton.classList.add('active');

            updateActiveBrandCards();
            renderProducts(currentCategoryFilter, currentBrandFilter, currentSearchQuery);

            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    // تفويض أحداث السلة والمنتجات (Event Delegation)
    const productsGridEl = document.getElementById('productsGrid');
        if (productsGridEl) {
        productsGridEl.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-to-cart-btn');
            if (addBtn) addToCart(addBtn.dataset.code, addBtn);

            const pageBtn = e.target.closest('.pagination-btn');
            if (pageBtn && !pageBtn.disabled) {
                const page = parseInt(pageBtn.dataset.page, 10);
                if (!isNaN(page) && page > 0) {
                    window.__pageTarget = page;
                    renderProducts(currentCategoryFilter, currentBrandFilter, currentSearchQuery, true);
                    const productsSection = document.getElementById('products');
                    if (productsSection) {
                        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        });
    }

    const cartItemsEl = document.getElementById('cartItems');
    if (cartItemsEl) {
        cartItemsEl.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            const { action, code } = actionBtn.dataset;
            if (action === 'increase') updateCartQty(code, 1);
            else if (action === 'decrease') updateCartQty(code, -1);
            else if (action === 'remove') removeFromCart(code);
        });
    }

    // IntersectionObserver واحد فقط لجميع العناصر
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach(el => revealObserver.observe(el));

    // البحث مع Debounce (لا يعيد الرسم مع كل حرف)
    const searchInput = document.getElementById('productSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchDropdown = document.getElementById('searchDropdown');
    const dropdownResults = document.getElementById('dropdownResults');

    const debouncedRender = debounce((val) => {
        currentSearchQuery = val;
        renderProducts(currentCategoryFilter, currentBrandFilter, currentSearchQuery);
    }, 300);

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const val = event.target.value;
            if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', val.length === 0);
            debouncedRender(val);

            // Dropdown سريع (محدود لـ 3 نتائج فقط)
            if (val.trim().length > 1 && dropdownResults) {
                const terms = val.toLowerCase().split(' ').filter(t => t.length > 0);
                const matches = products.filter(p => {
                    const txt = `${p.name} ${p.model} ${p.code} ${p.brand}`.toLowerCase();
                    return terms.every(term => txt.includes(term));
                }).slice(0, 3);

                if (matches.length > 0) {
                    // ملاحظة أمان: تم استبدال onclick المضمّن (inline) الذي كان يحقن
                    // اسم المنتج مباشرة داخل الكود بسمة data-product-name المهرّبة (escaped)
                    // مع معالج نقر واحد مفوَّض (delegated) بالأسفل. هذا يمنع أي احتمال
                    // لكسر سمة الـ HTML أو حقن أكواد لو تغيّر مصدر بيانات المنتجات مستقبلاً.
                    dropdownResults.innerHTML = matches.map(p => `
                        <div class="dropdown-result-item flex items-center justify-between p-3 hover:bg-blue-50/60 rounded-2xl cursor-pointer transition-colors"
                             data-code="${escapeHTML(p.code)}">
                            <div class="flex items-center gap-3">
                                <img src="${escapeHTML(p.image)}" alt="" class="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-100" loading="lazy" decoding="async">
                                <div class="text-right">
                                    <div class="text-sm font-bold text-slate-800">${highlightMatch(p.name, val)}</div>
                                    <div class="text-xs text-slate-400">${escapeHTML(p.brand)} | ${escapeHTML(p.model)}</div>
                                </div>
                            </div>
                            <span class="text-xs font-bold text-blue-600 dir-ltr bg-blue-50 px-2.5 py-1 rounded-full">${formatPrice(p.price)}</span>
                        </div>`).join('');
                    searchDropdown.classList.remove('hidden');
                } else {
                    hideSearchDropdown();
                }
            } else {
                hideSearchDropdown();
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown?.contains(e.target)) {
                hideSearchDropdown();
            }
        });
    }

    // معالج نقر مفوَّض (delegated) لعناصر نتائج القائمة المنسدلة للبحث
    if (dropdownResults) {
        dropdownResults.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-result-item');
            if (!item) return;
            const code = item.dataset.code || '';
            const product = products.find(p => p.code === code);
            if (!product) return;
            // مسار مطلق (بيبدأ بـ /) عشان يشتغل صح من أي صفحة —
            // سواء الرئيسية أو صفحة منتج مولّدة تانية (products/xxx.html)
            window.location.href = `/products/${byteProductSlug(product)}.html`;
        });
    }

    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchQuery = '';
            clearSearchBtn.classList.add('hidden');
            hideSearchDropdown();
            renderProducts(currentCategoryFilter, currentBrandFilter, '');
            searchInput.focus();
        });
    }

    // الأقسام
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category || 'all';
            const relatedButton = document.querySelector(`.category-btn[data-category="${category}"]`) || document.getElementById('allProductsFilter');
            if (relatedButton) filterProducts(category, relatedButton);
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    });

    const showAllProductsButton = document.getElementById('showAllProducts');
    if (showAllProductsButton) {
        showAllProductsButton.addEventListener('click', () => {
            resetBrandFilter();
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Scroll مع Throttle + Passive
 let lastScrollY = window.scrollY;
const header = document.getElementById('main-header');
let ticking = false;

if (!header) {
    // صفحة المنتج: مفيش scroll behavior مطلوب، نوقف هنا
    return;
}

    let isMobileView = window.innerWidth < 1024;
    window.addEventListener('resize', () => isMobileView = window.innerWidth < 1024, { passive: true });

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                if (currentScrollY > 50) header.classList.add('shadow-lg');
                else header.classList.remove('shadow-lg');

                if (isMobileView) {
                    if (currentScrollY > lastScrollY && currentScrollY > 100) {
                        header.classList.add('-translate-y-full');
                    } else {
                        header.classList.remove('-translate-y-full');
                    }
                } else {
                    header.classList.remove('-translate-y-full');
                }
                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

});
// ============================================
// Helper: build the same slug used by generate-static-pages.js
// ============================================
function byteSlugify(str) {
    return String(str || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function byteProductSlug(p) {
    return byteSlugify(`${p.brand}-${p.model}-${p.code}`);
}
function renderProducts(category = currentCategoryFilter, brand = currentBrandFilter, search = currentSearchQuery, append = false) {
    currentCategoryFilter = category;
    currentBrandFilter = brand;
    currentSearchQuery = (search || '').trim().toLowerCase();
    if (append && typeof window.__pageTarget === 'number') {
        currentPage = window.__pageTarget;
        window.__pageTarget = null;
    } else if (!append) {
        currentPage = 1;
    }

    const grid = document.getElementById('productsGrid');
    const badge = document.getElementById('searchResultBadge');
    if (!grid) return;

    const searchTerms = currentSearchQuery.split(' ').filter(term => term.length > 0);

    const filtered = products.filter(product => {
        const matchesCategory = category === 'all' || product.group === category;
       const productBrand = (product.brand || '').toLowerCase();
        const matchesBrand = !brand ||
            productBrand.includes(brand.toLowerCase()) ||
            brand.toLowerCase().includes(productBrand);        const searchText = `${product.name} ${product.model} ${product.code} ${product.brand} ${product.category} ${product.group}`.toLowerCase();
        const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => searchText.includes(term));
        return matchesCategory && matchesBrand && matchesSearch;
    });

    if (badge) {
        badge.textContent = currentSearchQuery.length > 0 ? `${filtered.length} منتج` : '0';
        badge.classList.toggle('hidden', currentSearchQuery.length === 0);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl">
                    <i class="fas fa-search-minus"></i>
                </div>
                <div class="text-2xl font-bold text-slate-800 mb-2">لا توجد نتائج مطابقة</div>
                <p class="text-slate-500 max-w-md">لم نتمكن من العثور على ما تطابق مع "${escapeHTML(currentSearchQuery)}". تأكد من صحة الكلمات أو جرّب فلتر آخر.</p>
            </div>`;
        return;
    }
    const startIdx = (currentPage - 1) * productsPerPage;
    const visibleProducts = filtered.slice(startIdx, startIdx + productsPerPage);    const remainingCount = filtered.length - visibleProducts.length;

    const html = visibleProducts.map((product, index) => {
        const statusClass = product.statusBadgeClass;
        const moqBadge = product.moq ? `<div class="text-[11px] text-red-500 font-bold mt-1 bg-red-50 px-2 py-1 rounded-md inline-block">أقل كمية للطلب: ${product.moq}</div>` : '';
        const priceUnit = product.group === 'cards' ? '<span class="text-sm font-normal text-slate-500"> / للكارت</span>' : '';
        const displayName = highlightMatch(product.name, currentSearchQuery);
        const displayBrand = highlightMatch(product.brand, currentSearchQuery);
        const displayModel = highlightMatch(product.model, currentSearchQuery);
        const displayCode = highlightMatch(product.code, currentSearchQuery);

        return `
    <div class="product-card glass-card h-full flex flex-col rounded-3xl overflow-hidden border border-slate-200 shadow-sm product-card-enter transform-gpu" style="animation-delay:${Math.min(index, 12) * 40}ms">    <div class="product-card-media relative w-full aspect-[4/3] overflow-hidden bg-white shrink-0">
        <img src="${product.image}" loading="lazy" decoding="async" fetchpriority="low" alt="${escapeHTML(product.name)}" class="absolute inset-0 w-full h-full object-contain p-3 md:p-4 transition-transform duration-300 md:hover:scale-105" />    </div>
            <div class="p-3 md:p-5 flex flex-col justify-between flex-1">

                <div class="flex items-center justify-between gap-1 mb-2">
                        <span class="text-[10px] md:text-[11px] font-semibold text-slate-500 truncate max-w-[50%]">${product.category}</span>
                        <span class="px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[11px] font-semibold whitespace-nowrap ${statusClass}">${product.stockLabel}</span>
                    </div>
                        <h4 class="product-card-title text-xs sm:text-sm md:text-xl font-bold text-slate-900 leading-snug mb-2 line-clamp-2">${displayName}</h4>
                        <div class="space-y-1 md:space-y-2 text-[10px] md:text-sm text-slate-600">
                        <div class="flex items-center justify-between"><span>Brand</span><span class="font-semibold text-slate-800">${displayBrand}</span></div>
                        <div class="flex items-center justify-between"><span>Model</span><span class="font-semibold text-slate-800 truncate max-w-[60%]">${displayModel}</span></div>
                        <div class="flex items-center justify-between"><span>Code</span><span class="font-semibold text-slate-800 truncate max-w-[60%]">${displayCode}</span></div>

                </div>
                <div class="mt-auto pt-2 md:pt-3 border-t border-slate-200">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] md:text-[12px] text-slate-500">Price</span>
                        <span class="text-xs sm:text-sm md:text-lg font-black text-slate-900 dir-ltr">${formatPrice(product.price)}${priceUnit}</span>
                    </div>
                    ${moqBadge}
                    <button type="button" class="add-to-cart-btn mt-3 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-white text-[11px] md:text-sm font-bold py-2 md:py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]" data-code="${escapeHTML(product.code)}">
                        <i class="fas fa-cart-plus"></i><span>أضف للسلة</span>
                    </button>
                </div>
            </div>
                </div>`;
    }).join('');

        // Pagination بالأرقام
    const totalPages = Math.ceil(filtered.length / productsPerPage);

    let paginationHtml = '';
    if (totalPages > 1) {
        // ========== Sliding Window Pagination ==========
        // 5 أرقام ثابتة، بتزحلق حسب الصفحة الحالية
        function buildPageRange(current, total) {
            // عدد أرقام أكتر على الديسكتوب، أقل على الموبايل
const windowSize = window.innerWidth < 768 ? 3 : 5;

            if (total <= windowSize) {
                return Array.from({ length: total }, (_, i) => i + 1);
            }

            const result = [];
            const half = Math.floor(windowSize / 2);

            let start = Math.max(1, current - half);
            let end = Math.min(total, start + windowSize - 1);

            if (end - start + 1 < windowSize) {
                start = Math.max(1, end - windowSize + 1);
            }

            if (start > 1) {
                result.push(1);
                if (start > 2) result.push('...');
            }

            for (let i = start; i <= end; i++) {
                result.push(i);
            }

            if (end < total) {
                if (end < total - 1) result.push('...');
                result.push(total);
            }

            return result;
        }

        let pagesHtml = '';
        const pageItems = buildPageRange(currentPage, totalPages);

        pageItems.forEach(function(item) {
            if (item === '...') {
                pagesHtml += `
                    <span class="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-slate-400 font-bold select-none">
                        &hellip;
                    </span>`;
                return;
            }
            const isActive = item === currentPage;
            pagesHtml += `
                <button type="button" data-page="${item}"
                    class="pagination-btn w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg border font-bold text-sm transition-all ${
                        isActive
                            ? 'bg-accent text-white border-accent shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent'
                    }">
                    ${item}
                </button>`;
        });

        const prevDisabled = currentPage === 1;
        const nextDisabled = currentPage === totalPages;

       paginationHtml = `
        <div class="col-span-full flex items-center justify-center gap-2 mt-6 md:mt-8 flex-wrap" dir="ltr">
            <button type="button" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''}
                class="pagination-btn w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg border font-bold text-sm transition-all ${
                    prevDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent'
                }">
                                <i class="fas fa-chevron-left text-xs"></i>
            </button>
            ${pagesHtml}
            <button type="button" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''}
                class="pagination-btn w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg border font-bold text-sm transition-all ${
                    nextDisabled
                        ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent'
                }">
                                <i class="fas fa-chevron-right text-xs"></i>
            </button>
        </div>`;
    }

    grid.style.opacity = '0';
    grid.style.transform = 'translateY(10px)';
    grid.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    grid.style.transition = 'opacity 0.2s ease';
    grid.style.opacity = '0';

    requestAnimationFrame(() => {
        grid.innerHTML = html + paginationHtml;
        requestAnimationFrame(() => { grid.style.opacity = '1'; });

        // ✅ اجعل كل كارت منتج قابل للضغط → يفتح صفحة المنتج
        grid.querySelectorAll('.product-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                // لو داس على زرار "أضف للسلة"، متروحش للصفحة
                if (e.target.closest('.add-to-cart-btn')) return;

                const code = card.querySelector('.add-to-cart-btn')?.dataset.code;
                if (!code) return;

                const product = products.find(p => p.code === code);
                if (!product) return;

                window.location.href = `products/${byteProductSlug(product)}.html`;
            });
        });
    });
}
// ============================================
// 2. تأثير الظهور عند التمرير (Reveal)
// ============================================
(function() {
    var els = document.querySelectorAll('#byte-about .reveal');
    if (!('IntersectionObserver' in window)) {
        els.forEach(function(el) { el.classList.add('in-view'); });
        return;
    }
    var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px 0px 0px' });
    els.forEach(function(el) { io.observe(el); });
})();