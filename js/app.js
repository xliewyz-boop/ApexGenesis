document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const allowedTabs = new Set(['dashboard', 'teams', 'players', 'tournaments', 'news', 'training', 'shop', 'profile', 'settings', 'admin']);
    let loadSequence = 0;

    contentDiv.setAttribute('aria-live', 'polite');

    async function loadTab(tabId) {
        if (!allowedTabs.has(tabId)) return;
        const sequence = ++loadSequence;
        tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
        contentDiv.setAttribute('aria-busy', 'true');
        contentDiv.innerHTML = '<div class="app-loading"><span class="loading-orbit"></span><p>İçerik hazırlanıyor…</p></div>';

        try {
            const response = await fetch(`${tabId}.html`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`${tabId}.html yüklenemedi (HTTP ${response.status})`);
            const htmlText = await response.text();
            if (sequence !== loadSequence) return;

            const parsed = new DOMParser().parseFromString(htmlText, 'text/html');
            const styleText = Array.from(parsed.querySelectorAll('style')).map(style => style.textContent).join('\n');
            const scriptSources = Array.from(parsed.querySelectorAll('script')).map(script => ({
                src: script.getAttribute('src'),
                text: script.textContent
            }));
            parsed.querySelectorAll('style, script').forEach(element => element.remove());
            contentDiv.innerHTML = parsed.body.innerHTML;
            window.apexI18n?.apply(contentDiv);

            const previousStyle = document.getElementById('active-tab-style');
            if (previousStyle) previousStyle.remove();
            if (styleText.trim()) {
                const styleElement = document.createElement('style');
                styleElement.id = 'active-tab-style';
                styleElement.textContent = styleText;
                document.head.appendChild(styleElement);
            }

            for (const source of scriptSources) {
                if (sequence !== loadSequence) return;
                const script = document.createElement('script');
                if (source.src) {
                    script.src = new URL(source.src, new URL(`${tabId}.html`, window.location.href)).href;
                    script.async = false;
                    document.head.appendChild(script);
                } else if (source.text.trim()) {
                    // Isolate each tab's lexical scope so revisiting a tab cannot redeclare top-level consts.
                    script.textContent = `(function () {\n${source.text}\n}).call(window);`;
                    document.head.appendChild(script);
                    script.remove();
                }
            }
        } catch (error) {
            console.error('Tab load failed:', tabId, error);
            if (sequence === loadSequence) {
                contentDiv.innerHTML = `<section class="tab-load-error"><h2>Bu bölüm açılamadı</h2><p>${window.escapeHTML(error.message)}</p><button type="button" id="retry-tab">Tekrar dene</button></section>`;
                document.getElementById('retry-tab')?.addEventListener('click', () => loadTab(tabId));
            }
        } finally {
            if (sequence === loadSequence) contentDiv.setAttribute('aria-busy', 'false');
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => loadTab(button.dataset.tab));
    });

    loadTab('dashboard');
});
