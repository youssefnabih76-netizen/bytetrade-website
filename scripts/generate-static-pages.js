const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');const SITE_URL = 'https://www.bytetradeinternational.com';

const { normalizeStatus } = require(path.join(ROOT, 'status-utils.js'));

global.window = global.window || {};
require(path.join(ROOT, 'products-data.js'));
const products = global.window.baseProducts || [];

if (!products.length) {
    console.error('generate-static-pages: no products found in products-data.js — aborting.');
    process.exit(1);
}

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractBetween(html, openTagRegex, closeTag) {
    const openMatch = html.match(openTagRegex);
    if (!openMatch) return '';
    const start = openMatch.index;
    const end = html.indexOf(closeTag, start) + closeTag.length;
    return html.slice(start, end);
}

const HEADER_HTML = extractBetween(indexHtml, /<header[^>]*id="main-header"[\s\S]*?>/, '</header>')
    .replace(/href="#/g, 'href="/#')
    .replace(/href="clients\.html"/g, 'href="/clients.html"')
    // حوّل onclick روابط الفلاتر عشان تروح للصفحة الرئيسية مع الهاش
    .replace(/onclick="filterProducts\('([^']+)'\);"/g, 'onclick="window.location.href=\'/#products\';"');
// ---- قائمة الهامبرجر (موبايل) + الأزرار العائمة ----
// الاتنين في index.html "برّه" الـ <header>، عشان كده extractBetween بتاع الهيدر مكانش بيلقطهم.
function extractFromTo(html, startRegex, endMarker, includeEnd) {
    const m = html.match(startRegex);
    if (!m) return '';
    const endIdx = html.indexOf(endMarker, m.index);
    if (endIdx === -1) return '';
    return html.slice(m.index, includeEnd ? endIdx + endMarker.length : endIdx).trim();
}

// الهامبرجر: من div القائمة لحد نهاية سكريبت الإغلاق (أول </script> بعده). ظاهر على الموبايل بس (md:hidden).
const MOBILE_MENU_HTML = extractFromTo(indexHtml, /<div[^>]*id="mobile-menu-dropdown"[^>]*>/, '</script>', true)
    .replace(/href="#/g, 'href="/#')
    .replace(/href="clients\.html"/g, 'href="/clients.html"')
    // روابط الفلاتر: من غير preventDefault/filterProducts، الرابط /#products بيودّي للرئيسية
    .replace(/onclick="event\.preventDefault\(\); filterProducts\('[^']+'\);[^"]*"/g,
        'onclick="document.getElementById(\'mobile-menu-panel\').classList.add(\'hidden\')"')
    // تثبيت الموضع inline (أعلى اليمين) عشان ما يعتمدش على كلاسات Tailwind المترجمة
    .replace('id="mobile-menu-dropdown">', 'id="mobile-menu-dropdown" style="position:fixed;top:0.875rem;right:1rem;z-index:60;">');

// الأزرار العائمة: من div الأزرار لحد قبل سكريبت Vercel Analytics. ظاهرة على كل المقاسات، أسفل اليسار.
// dir="ltr" + left:0 (فيزيائي) عشان اتجاه RTL للصفحة ما يقلبهاش لليمين.
const FLOATING_CONTACT_HTML = extractFromTo(indexHtml, /<div[^>]*class="[^"]*fixed bottom-6 left-0[^"]*"[^>]*>/, '<script>window.va', false)
    .replace(/^<div /, '<div dir="ltr" style="position:fixed;left:0;right:auto;bottom:1.5rem;z-index:100;" ');

const CART_HTML =
    extractBetween(indexHtml, /<div[^>]*id="cartOverlay"[\s\S]*?>/, '</div>') +
    extractBetween(indexHtml, /<aside[^>]*id="cartPanel"[\s\S]*?>/, '</aside>');
const INDEX_FOOTER_HTML = extractBetween(indexHtml, /<footer[\s\S]*?>/, '</footer>');

if (!HEADER_HTML) {
    console.warn('generate-static-pages: could not find <header id="main-header"> in index.html — generated pages will have no nav.');
}
if (!CART_HTML) {
    console.warn('generate-static-pages: could not find the cart drawer (#cartOverlay / #cartPanel) in index.html — the header cart button will not open on generated pages.');
}

if (!MOBILE_MENU_HTML) {
    console.warn('generate-static-pages: could not find #mobile-menu-dropdown in index.html — generated pages will have no hamburger menu.');
}
if (!FLOATING_CONTACT_HTML) {
    console.warn('generate-static-pages: could not find the floating contact buttons in index.html — generated pages will not have them.');
}

const CONTACT = {
    whatsappPrimary: '201060555979',
    whatsappSecondary: '201025069050',
    phone: '0224175237',
    email: 'bytetrade@hotmail.com',
    address: '13 شارع النزهة - مدينة نصر - القاهرة'
};

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function productSlug(p) {
    return slugify(`${p.brand}-${p.model}-${p.code}`);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function whatsappQuoteLink(productName) {
    const text = encodeURIComponent(`أرغب في الحصول على عرض سعر للمنتج: ${productName}`);
    return `https://wa.me/${CONTACT.whatsappPrimary}?text=${text}`;
}

const CATEGORY_COPY = [
    {
        match: /label/i,
        summary: 'شريط طباعة ليبل عالي الجودة يعطي نتائج واضحة ومقاومة للتآكل.',
        uses: ['ملصقات المنتجات والمخازن', 'ترقيم الكابلات وأنظمة الشبكات', 'تنظيم الملفات والأرفف والمعدات']
    },
    {
        match: /printhead|part/i,
        summary: 'قطعة غيار أصلية لاستعادة كفاءة الطباعة وإطالة عمر الطابعة.',
        uses: ['استبدال الأجزاء المتهالكة', 'حل مشاكل الطباعة الباهتة أو المتقطعة', 'صيانة الطابعات بشكل دوري']
    },
    {
        match: /ribbon/i,
        summary: 'ريبون طباعة كروت بجودة ثابتة وألوان حادة يحافظ على وضوح التفاصيل.',
        uses: ['طباعة كروت الموظفين والطلاب', 'كروت العضوية والضيافة', 'طباعة الشعارات والباركود على الكروت']
    },
    {
        match: /printer/i,
        summary: 'طابعة كروت احترافية تناسب الاستخدام اليومي وتعطي طباعة دقيقة وسريعة.',
        uses: ['إصدار كروت الهوية داخل الشركات', 'المدارس والجامعات والمستشفيات', 'كروت الاشتراك والعضوية']
    },
    {
        match: /card/i,
        summary: 'كروت بلاستيكية متينة بمقاسات قياسية متوافقة مع طابعات الكروت.',
        uses: ['كروت الهوية وبطاقات الدخول', 'كروت العضوية والولاء', 'الكروت الذكية وأنظمة الحضور']
    },
    {
        match: /access/i,
        summary: 'حل تحكم في الدخول يساعد على تأمين المداخل وتنظيم حركة الأفراد.',
        uses: ['تأمين المكاتب والمصانع', 'أنظمة الحضور والانصراف', 'التحكم في صلاحيات الدخول']
    }
];

const DEFAULT_COPY = {
    summary: 'منتج أصلي يلبي احتياجات طباعة الكروت والأنظمة المرتبطة بها.',
    uses: ['الاستخدام اليومي في الشركات والمؤسسات', 'تكامل مع أنظمة وطابعات الكروت', 'توفير مستلزمات التشغيل بشكل مستمر']
};

function buildDescription(p) {
    const copy = CATEGORY_COPY.find((c) => c.match.test(p.category || '')) || DEFAULT_COPY;
    const intro = `${p.name} من ${p.brand} (كود ${p.code}) متوافق مع موديل ${p.model}. ${copy.summary}`;
    const outro = 'للاستفسار عن التوافق أو الكميات أو أسعار الجملة، تواصل معنا وسنرد عليك بأقرب وقت.';
    return { intro, uses: copy.uses, outro };
}

function pickSimilar(current, limit = 4) {
    const cat = String(current.category || '').toLowerCase();
    const brand = String(current.brand || '').toLowerCase();
    const others = products.filter((p) => productSlug(p) !== productSlug(current));
    const score = (p) =>
        (String(p.category || '').toLowerCase() === cat ? 2 : 0) +
        (String(p.brand || '').toLowerCase() === brand ? 1 : 0);
    const seen = new Set();
    return others
        .map((p) => ({ p, s: score(p) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .map(({ p }) => p)
        .filter((p) => {
            const slug = productSlug(p);
            if (seen.has(slug)) return false;
            seen.add(slug);
            return true;
        })
        .slice(0, limit);
}

function formatPrice(price) {
    return typeof price === 'number' ? `EGP ${price.toLocaleString('en-US')}` : null;
}

function buildFooter() { return ""; }

const FOOTER_HTML = buildFooter();

function pageShell({ title, description, canonical, ogImage, bodyContent, jsonLd }) {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="Byte Trade International">
    <meta property="og:locale" content="ar_EG">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${ogImage}">
    <meta name="theme-color" content="#ffffff">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>
    <link rel="stylesheet" href="../styles.tailwind.css">
    <link rel="stylesheet" href="../styles.css">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="bg-primary text-slate-800 overflow-x-hidden text-right font-sans">
${HEADER_HTML}
${MOBILE_MENU_HTML}
<main class="max-w-6xl mx-auto px-4 pb-12 pt-6 mt-24">
${bodyContent}
</main>
${FOOTER_HTML}
${CART_HTML}
${FLOATING_CONTACT_HTML}
<script src="../status-utils.js"></script>
<script src="../products-data.js"></script>
<script src="../script.js"></script>
<script defer src="/meta-pixel.js"></script></body>
</html>`;
}

function breadcrumb(items) {
    const last = items.length - 1;
    const parts = items.map((item, i) => {
        if (i === last) {
            return `<li class="font-semibold text-slate-800 truncate max-w-[14rem] sm:max-w-none" aria-current="page">${escapeHtml(item.label)}</li>`;
        }
        return `<li class="flex items-center gap-2"><a href="${item.href}" class="hover:text-accent transition-colors">${escapeHtml(item.label)}</a><i class="fas fa-chevron-left text-[10px] text-slate-300"></i></li>`;
    }).join('');
    return `
    <nav aria-label="Breadcrumb" class="mb-6">
        <ol class="inline-flex flex-wrap items-center gap-2 rounded-full bg-white border border-slate-200 shadow-sm px-4 py-2 text-sm text-slate-500">${parts}</ol>
    </nav>`;
}

function specRow(icon, label, value, index) {
    const bg = index % 2 === 0 ? 'bg-slate-50' : 'bg-white';
    return `
                <div class="flex items-center justify-between gap-4 px-5 py-3.5 ${bg}">
                    <span class="flex items-center gap-3 text-slate-500 text-sm">
                        <span class="w-8 h-8 rounded-lg bg-blue-50 text-accent flex items-center justify-center"><i class="fas ${icon} text-xs"></i></span>
                        ${label}
                    </span>
                    <span class="font-semibold text-slate-900 text-sm" dir="ltr">${escapeHtml(value)}</span>
                </div>`;
}

function similarCard(p) {
    const status = normalizeStatus(p.status);
    const price = formatPrice(p.price);
    return `
        <a href="/products/${productSlug(p)}" class="group block rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-lg hover:border-accent/40 transition-all">
            <div class="rounded-xl bg-slate-50 p-3 mb-3">
                <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="225" class="w-full aspect-[4/3] object-contain group-hover:scale-105 transition-transform duration-300" />
            </div>
            <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mb-2 ${status.badgeClass}">${status.label}</span>
            <div class="font-semibold text-slate-900 text-sm min-h-[2.5rem]">${escapeHtml(p.name)}</div>
            <div class="text-xs text-slate-500 mt-1" dir="ltr">${escapeHtml(p.brand)} · ${escapeHtml(p.model)}</div>
            ${price ? `<div class="text-accent font-bold text-sm mt-2" dir="ltr">${price}</div>` : ''}
        </a>`;
}

function buildProductPage(p) {
    const slug = productSlug(p);
    const canonical = `${SITE_URL}/products/${slug}`;
    const status = normalizeStatus(p.status);
    const title = `${p.name} | ${p.brand} ${p.model} — Byte Trade International`;
    const description = `${p.name} (${p.code}) لطابعة ${p.model} من ${p.brand}. الحالة: ${status.label}. اطلب عرض سعر الآن من Byte Trade International.`;

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name,
            sku: p.code,
            brand: { '@type': 'Brand', name: p.brand },
            image: p.image,
            description,
            offers: {
                '@type': 'Offer',
                priceCurrency: 'EGP',
                price: typeof p.price === 'number' ? p.price : undefined,
                availability: status.schemaAvailability,
                url: canonical
            }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: p.brand, item: `${SITE_URL}/brands/${slugify(p.brand)}` },
                { '@type': 'ListItem', position: 3, name: p.name, item: canonical }
            ]
        }
    ];

    const desc = buildDescription(p);
    const price = formatPrice(p.price);
    const quoteLink = whatsappQuoteLink(p.name);
    const similar = pickSimilar(p);

    const specs = [
        ['fa-copyright', 'البراند', p.brand],
        ['fa-print', 'الموديل', p.model],
        ['fa-barcode', 'كود المنتج', p.code],
        ['fa-layer-group', 'الفئة', p.category]
    ].map(([icon, label, value], i) => specRow(icon, label, value, i)).join('');

    const trust = [
        ['fa-shield-halved', 'منتجات أصلية'],
        ['fa-headset', 'دعم عبر واتساب'],
        ['fa-building', 'توريد للشركات']
    ].map(([icon, label]) => `
                <div class="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                    <i class="fas ${icon} text-accent"></i>${label}
                </div>`).join('');

    const similarSection = similar.length ? `
    <section class="mt-14" aria-labelledby="similar-title">
        <div class="flex items-center justify-between mb-5">
            <h2 id="similar-title" class="text-xl md:text-2xl font-bold text-slate-900">منتجات مشابهة</h2>
            <a href="/categories/${slugify(p.category)}" class="text-sm text-accent hover:text-accentHover font-semibold">عرض المزيد <i class="fas fa-arrow-left text-xs mr-1"></i></a>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">${similar.map(similarCard).join('')}</div>
    </section>` : '';

        const body = `
        <section class="grid md:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div class="rounded-3xl border border-slate-200 bg-white p-4 md:p-8 shadow-sm md:sticky md:top-28">
            <div class="flex items-center justify-center bg-slate-50 rounded-2xl" style="aspect-ratio: 4/3; max-height: 380px;">
                <img src="${p.image}" alt="${escapeHtml(p.name)}" width="600" height="450" fetchpriority="high" class="w-full h-full object-contain p-4" />
            </div>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div class="flex flex-wrap items-center gap-2 mb-4">
                <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${status.badgeClass}">${status.label}</span>
                <a href="/brands/${slugify(p.brand)}" class="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-accent transition-colors" dir="ltr">${escapeHtml(p.brand)}</a>
            </div>
            <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-snug mb-3">${escapeHtml(p.name)}</h1>
            <p class="text-sm text-slate-500 mb-5">كود المنتج: <span class="font-semibold text-slate-700" dir="ltr">${escapeHtml(p.code)}</span></p>
            <div class="mb-6 pb-6 border-b border-slate-100">
                ${price
                    ? `<div class="text-3xl font-black text-accent" dir="ltr">${price}</div>`
                    : `<div class="text-xl font-bold text-slate-700">السعر عند الطلب</div>`}
            </div>
                        <div class="flex flex-col gap-3 mb-6">
                <button type="button" onclick="handleAddToCart()"
                        class="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-colors">
                    <i class="fas fa-cart-plus"></i> أضف للسلة
                </button>
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-2">${trust}
            </div>
        </div>
    </section>

    <div class="grid lg:grid-cols-2 gap-6 mt-8">
        <section class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm" aria-labelledby="specs-title">
            <h2 id="specs-title" class="text-lg font-bold text-slate-900 px-5 py-4 border-b border-slate-100 flex items-center gap-2"><i class="fas fa-list-check text-accent"></i> المواصفات</h2>
            <div>${specs}
            </div>
        </section>
        <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="about-title">
            <h2 id="about-title" class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><i class="fas fa-circle-info text-accent"></i> عن المنتج</h2>
            <p class="text-slate-600 leading-8 mb-4">${escapeHtml(desc.intro)}</p>
            <h3 class="font-semibold text-slate-800 mb-2">الاستخدامات</h3>
            <ul class="space-y-2 mb-4">${desc.uses.map((u) => `
                <li class="flex items-start gap-2 text-slate-600 text-sm"><i class="fas fa-check text-emerald-500 mt-1"></i>${escapeHtml(u)}</li>`).join('')}
            </ul>
            <p class="text-slate-500 text-sm leading-7">${escapeHtml(desc.outro)}</p>
        </section>
    </div>
${similarSection}
    <a href="/#products" class="inline-flex items-center gap-2 mt-10 text-sm text-slate-500 hover:text-accent transition-colors"><i class="fas fa-arrow-right text-xs"></i> الرجوع لكل المنتجات</a>
    <script>
    function handleAddToCart() {
        var code = ${safeJson(p.code)};
        if (typeof window.addToCart === 'function') {
            window.addToCart(code);
            if (typeof window.openCart === 'function') window.openCart();
        } else {
            window.open(${safeJson(quoteLink)}, '_blank', 'noopener');
        }
    }
    </script>`;

    return { slug, html: pageShell({ title, description, canonical, ogImage: p.image, bodyContent: body, jsonLd }) };
}

function buildListingPage({ kind, name, items }) {
    const slug = slugify(name);
    const canonical = `${SITE_URL}/${kind}/${slug}`;
    const kindLabel = kind === 'brands' ? 'أحبار وطابعات' : 'فئة منتجات';
    const title = `${name} — ${kindLabel} | Byte Trade International`;
    const description = `تصفح كل منتجات ${name} المتوفرة لدى Byte Trade International: أحبار، كروت، طابعات وقطع غيار أصلية.`;
    const kindHomeLabel = kind === 'brands' ? 'البراندات' : 'الفئات';

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            description,
            url: canonical
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: kindHomeLabel, item: `${SITE_URL}/#products` },
                { '@type': 'ListItem', position: 3, name, item: canonical }
            ]
        },
        {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: title,
            numberOfItems: items.length,
            itemListElement: items.slice(0, 30).map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/products/${productSlug(p)}`,
                name: p.name
            }))
        }
    ];

    const body = `${breadcrumb([
        { label: 'الرئيسية', href: '/' },
        { label: name }
    ])}
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">${escapeHtml(name)}</h1>
        <p class="text-slate-500 mb-8">${items.length} منتج متاح</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${items.map(similarCard).join('')}</div>`;

    return { slug, html: pageShell({ title, description, canonical, ogImage: items[0].image, bodyContent: body, jsonLd }) };
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writePages() {
    const productsDir = path.join(ROOT, 'products');
    const brandsDir = path.join(ROOT, 'brands');
    const categoriesDir = path.join(ROOT, 'categories');
    [productsDir, brandsDir, categoriesDir].forEach(ensureDir);

    const urls = [`${SITE_URL}/`];
    const seenSlugs = new Set();

    products.forEach((p) => {
        const { slug, html } = buildProductPage(p);
        if (seenSlugs.has(slug)) {
            console.warn(`Duplicate product slug "${slug}" (${p.code}) — skipping, first one wins. Consider a more unique code.`);
            return;
        }
        seenSlugs.add(slug);
        fs.writeFileSync(path.join(productsDir, `${slug}.html`), html);
        urls.push(`${SITE_URL}/products/${slug}`);
    });

    const byBrand = groupBy(products, (p) => p.brand);
    Object.entries(byBrand).forEach(([brand, items]) => {
        const { slug, html } = buildListingPage({ kind: 'brands', name: brand, items });
        fs.writeFileSync(path.join(brandsDir, `${slug}.html`), html);
        urls.push(`${SITE_URL}/brands/${slug}`);
    });

    const byCategory = groupBy(products, (p) => p.category);
    Object.entries(byCategory).forEach(([category, items]) => {
        const { slug, html } = buildListingPage({ kind: 'categories', name: category, items });
        fs.writeFileSync(path.join(categoriesDir, `${slug}.html`), html);
        urls.push(`${SITE_URL}/categories/${slug}`);
    });

    writeSitemap(urls);

    console.log(`Generated ${products.length} product pages, ${Object.keys(byBrand).length} brand pages, ${Object.keys(byCategory).length} category pages.`);
}

function groupBy(arr, keyFn) {
    const groups = {};
    arr.forEach((item) => {
        const raw = (keyFn(item) || 'other').trim();
        if (!raw) return;
        const lower = raw.toLowerCase();
        if (!groups[lower]) groups[lower] = { displayName: raw, items: [] };
        groups[lower].items.push(item);
    });
    const result = {};
    Object.values(groups).forEach(({ displayName, items }) => {
        result[displayName] = items;
    });
    return result;
}

function writeSitemap(urls) {
    const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
}

writePages();