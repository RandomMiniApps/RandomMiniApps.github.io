(() => {
  // Keep previously shared language URLs usable while the new copy is English.
  const language = new URLSearchParams(window.location.search).get('lang');
  const translatedEditions = {
    '/': '/international/', '/index.html': '/international/',
    '/apps/dyslexia-reading-lens/': '/international/dyslexia-reading-lens/',
    '/apps/dyslexia-reading-lens/index.html': '/international/dyslexia-reading-lens/',
    '/logiq-labs/dyslexia-reading-lens/': '/international/dyslexia-reading-lens/',
    '/scamlens/': '/international/scamlens/', '/scamlens/index.html': '/international/scamlens/',
    '/logiq-labs/scamlens/': '/international/scamlens/'
  };
  if (['es', 'pt', 'de', 'fr'].includes(language) && translatedEditions[window.location.pathname]) {
    window.location.replace(translatedEditions[window.location.pathname] + '?lang=' + language);
    return;
  }

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (toggle && nav) {
    const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
    toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); } });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  }
  document.querySelectorAll('[data-catalogue]').forEach(catalogue => {
    const cards = [...catalogue.querySelectorAll('[data-category]')];
    catalogue.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      catalogue.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
      catalogue.querySelector('[role=status]').textContent = `${cards.filter(c => !c.hidden).length} apps shown`;
    }));
  });
  document.querySelectorAll('[data-reader]').forEach(demo => {
    const text = demo.querySelector('.reader-text');
    const font = demo.querySelector('[name=font]');
    const spacing = demo.querySelector('[name=spacing]');
    const tint = demo.querySelector('[name=tint]');
    const apply = () => { text.style.fontFamily = font.value; text.style.lineHeight = spacing.value; text.style.letterSpacing = spacing.value === '2.1' ? '.06em' : '.02em'; text.style.backgroundColor = tint.value; };
    [font, spacing, tint].forEach(control => control.addEventListener('change', apply));
    demo.querySelector('[data-reset]').addEventListener('click', () => { [font, spacing, tint].forEach(control => control.selectedIndex = 0); apply(); });
    apply();
  });
  document.querySelectorAll('[data-samples]').forEach(group => {
    group.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => {
      group.querySelectorAll('[data-sample]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      group.querySelectorAll('[data-sample-panel]').forEach(panel => panel.hidden = panel.dataset.samplePanel !== button.dataset.sample);
    }));
  });
})();
