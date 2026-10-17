document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('content');
  const buttons = [...document.querySelectorAll('.tab-btn')];
  const allowed = new Set(['dashboard','teams','players','tournaments','news','training','shop','profile','settings','admin','support']);
  const templates = new Map();
  let sequence = 0;
  let activeTab = '';
  let revealObserver = null;
  content.setAttribute('aria-live', 'polite');

  function cleanupActiveTab() {
    if (typeof window.apexTabCleanup === 'function') {
      try { window.apexTabCleanup(); } catch (error) { console.warn('Tab cleanup failed', error); }
    }
    window.apexTabCleanup = null;
    if (revealObserver) revealObserver.disconnect();
    revealObserver = null;
    activeTab = '';
  }

  function revealPage(tab) {
    if (!['dashboard','teams','players','tournaments','news','training','shop'].includes(tab)) return;
    if (document.body.classList.contains('animations-off') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = content.querySelectorAll('.tab-content > section, .tab-content article, .shop-item, .news-card, .team-card, .player-card, .tournament-card, .mechanic-card');
    if (!nodes.length || !('IntersectionObserver' in window)) {
      content.classList.add('tab-enter');
      return;
    }
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    nodes.forEach((node, index) => {
      node.classList.add('scroll-reveal');
      node.style.setProperty('--reveal-delay', Math.min(index % 6, 5) * 35 + 'ms');
      revealObserver.observe(node);
    });
  }

  async function getTemplate(tab) {
    if (templates.has(tab)) return templates.get(tab);
    const promise = fetch(tab + '.html', { cache: 'force-cache', signal: AbortSignal.timeout(8000) }).then(response => {
      if (!response.ok) throw new Error(tab + '.html yüklenemedi (HTTP ' + response.status + ')');
      return response.text();
    });
    templates.set(tab, promise);
    try { return await promise; } catch (error) { templates.delete(tab); throw error; }
  }

  async function loadTab(tab) {
    if (!allowed.has(tab)) return;
    if (tab === activeTab && content.dataset.loadedTab === tab) return;
    const current = ++sequence;
    cleanupActiveTab();
    buttons.forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    content.setAttribute('aria-busy', 'true');
    content.classList.remove('tab-enter');
    content.innerHTML = '<div class="app-loading"><span class="loading-orbit"></span><p>İçerik hazırlanıyor…</p></div>';
    try {
      if (tab === 'admin') {
        const role = await window.apexCloud.getRole();
        if (role === 'member') {
          content.innerHTML = '<section class="tab-load-error"><h2>Yönetici erişimi gerekli</h2><p>Bu bölüm yalnızca Admin ve Owner hesaplarına açıktır.</p></section>';
          content.dataset.loadedTab = tab; activeTab = tab; return;
        }
      }
      const html = await getTemplate(tab);
      if (current !== sequence) return;
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const styles = [...parsed.querySelectorAll('style')].map(style => style.textContent).join('\n');
      const scripts = [...parsed.querySelectorAll('script')].map(script => ({ src: script.getAttribute('src'), text: script.textContent }));
      parsed.querySelectorAll('style,script').forEach(element => element.remove());
      content.innerHTML = parsed.body.innerHTML;
      content.dataset.loadedTab = tab;
      window.apexI18n?.apply(content);
      document.getElementById('active-tab-style')?.remove();
      if (styles.trim()) {
        const style = document.createElement('style');
        style.id = 'active-tab-style';
        style.textContent = styles;
        document.head.appendChild(style);
      }
      activeTab = tab;
      for (const source of scripts) {
        if (current !== sequence) return;
        if (source.src) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            let settled = false;
            const finish = error => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              script.onload = null;
              script.onerror = null;
              script.remove();
              error ? reject(error) : resolve();
            };
            const timeout = setTimeout(() => finish(new Error('Sekme betiği zaman aşımına uğradı.')), 8000);
            script.src = new URL(source.src, new URL(tab + '.html', location.href)).href;
            script.onload = () => finish();
            script.onerror = () => finish(new Error('Sekme betiği yüklenemedi.'));
            document.head.appendChild(script);
          });
        } else if (source.text.trim()) {
          const script = document.createElement('script');
          script.textContent = '(function () {\n' + source.text + '\n}).call(window);';
          document.head.appendChild(script);
          script.remove();
        }
      }
      if (current === sequence) revealPage(tab);
    } catch (error) {
      console.error('Tab load failed:', tab, error);
      if (current === sequence) {
        delete content.dataset.loadedTab;
        activeTab = '';
        content.innerHTML = '<section class="tab-load-error"><h2>Bu bölüm açılamadı</h2><p>' + window.escapeHTML(error.message) + '</p><button type="button" id="retry-tab">Tekrar dene</button></section>';
        document.getElementById('retry-tab')?.addEventListener('click', () => { templates.delete(tab); loadTab(tab); });
      }
    } finally {
      if (current === sequence) content.setAttribute('aria-busy', 'false');
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => loadTab(button.dataset.tab)));
  content.addEventListener('click', event => {
    const target = event.target.closest('[data-go-tab]');
    if (target) loadTab(target.dataset.goTab);
  });
  loadTab('dashboard');
});