// Helpers DOM : éléments, toasts, modales, texte flottant.

export const RARITY = {
  rare: { label: 'Rare', color: '#5aa9e6' },
  epic: { label: 'Épique', color: '#b06bff' },
  legendary: { label: 'Légendaire', color: '#f5b942' },
};

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'className' || k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (['checked', 'disabled', 'selected'].includes(k)) el[k] = !!v;
    else el.setAttribute(k, v);
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export class UI {
  constructor() {
    this.h = h;
    this.RARITY = RARITY;
    this.tabs = [];
    this.onTabs = null;
    this.toasts = h('div', { className: 'toasts' });
    this.modalRoot = h('div', { className: 'modal-root' });
    document.body.append(this.toasts, this.modalRoot);
  }

  addTab(tab) {
    if (!tab?.id || !tab.render) throw new Error('Onglet invalide');
    if (this.tabs.some((t) => t.id === tab.id)) return tab;
    this.tabs.push({ icon: '🧩', label: 'Mod', ...tab });
    this.onTabs?.(this.tabs);
    return tab;
  }

  toast(msg, kind = 'info', ms = 2400) {
    const el = h('div', { className: `toast ${kind}`, text: msg });
    this.toasts.append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
    return el;
  }

  modal({ title = '', content = null, actions = [], wide = false, onClose = null } = {}) {
    const root = h('div', { className: 'modal-backdrop' });
    const close = () => {
      root.classList.add('out');
      setTimeout(() => root.remove(), 200);
      document.removeEventListener('keydown', onKey);
      onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const body = h('div', { className: 'modal-body' });
    if (typeof content === 'string') body.innerHTML = content;
    else if (content) body.append(content);
    root.append(h('div', { className: `modal ${wide ? 'wide' : ''}` }, [
      h('div', { className: 'modal-head' }, [
        h('h3', { text: title }),
        h('button', { className: 'icon-btn', text: '✕', onClick: close }),
      ]),
      body,
      actions.length ? h('div', { className: 'modal-actions' }, actions.map((a) =>
        h('button', {
          className: `btn ${a.kind ?? ''}`,
          text: a.label,
          onClick: () => { a.onClick?.(close); if (a.close !== false) close(); },
        }))) : null,
    ]));
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    document.addEventListener('keydown', onKey);
    this.modalRoot.append(root);
    return close;
  }

  float(container, target, text, cls = '') {
    if (!container || !target?.isConnected) return;
    const c = container.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (!r.width) return;
    const n = h('span', {
      className: `float ${cls}`,
      text,
      style: { left: `${r.left - c.left + r.width / 2 + (Math.random() * 22 - 11)}px`, top: `${r.top - c.top + r.height * 0.25}px` },
    });
    container.append(n);
    setTimeout(() => n.remove(), 900);
  }
}
