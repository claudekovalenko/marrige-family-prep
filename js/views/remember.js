import { PROMISES } from '../data.js';
import * as store from '../store.js';
import { html, raw, el, on, arm, esc, shortDate, toast } from '../ui.js';

// Which card is open for editing, and whether the "add" form is showing.
let editingId = null;
let adding = false;
// The same, for links.
let editingLinkId = null;
let addingLink = false;

function linkForm(l, cls) {
  return `<form class="enc-form ${cls}">
    <input type="text" name="url" value="${esc(l ? l.url : '')}" inputmode="url" autocomplete="off" required placeholder="Paste a link — e.g. a YouTube video" />
    <input type="text" name="title" value="${esc(l ? l.title : '')}" maxlength="80" placeholder="What it is — e.g. A sermon on headship" />
    <textarea name="note" rows="3" placeholder="Why it matters to you (optional)">${esc(l ? l.note : '')}</textarea>
    <div class="row row-end">
      <button type="button" class="link-btn ${l ? 'cancel-link-edit' : 'cancel-link-add'}">Cancel</button>
      <button type="submit" class="btn btn-primary">Save</button>
    </div>
  </form>`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./, '');
  } catch (e) {
    return '';
  }
}

function linkItem(l) {
  if (l.id === editingLinkId) {
    return `<li class="ref is-editing" data-id="${l.id}">${linkForm(l, 'edit-link')}</li>`;
  }
  return `<li class="ref" data-id="${l.id}">
    <a class="ref-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
      <span class="ref-title">${esc(l.title)}</span>
      <span class="ref-host">${esc(hostOf(l.url))} &nearr;</span>
    </a>
    ${l.note ? `<p class="ref-note">${esc(l.note)}</p>` : ''}
    <div class="entry-actions">
      <button class="link-btn" data-edit-link="${l.id}">Edit</button>
      <button class="link-btn danger" data-delete-link="${l.id}">Delete</button>
    </div>
  </li>`;
}

function card(e) {
  if (e.id === editingId) {
    return `<li class="enc is-editing" data-id="${e.id}">
      <form class="enc-form">
        <input type="text" name="title" data-fk="edit-title" value="${esc(e.title)}" maxlength="60" placeholder="Title" />
        <textarea name="text" rows="8" placeholder="What He showed you…">${esc(e.text)}</textarea>
        <input type="text" name="source" value="${esc(e.source || '')}" maxlength="60" placeholder="Where it came from (optional)" />
        <div class="row row-end">
          <button type="button" class="link-btn cancel-edit">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </li>`;
  }
  return `<li class="enc ${e.pinned ? 'is-pinned' : ''}" data-id="${e.id}">
    <div class="enc-head">
      <h3>${esc(e.title)}</h3>
      ${e.pinned ? '<span class="badge badge-ongoing">On Today</span>' : ''}
    </div>
    ${e.source ? `<p class="enc-source">${esc(e.source)}</p>` : ''}
    <p class="enc-text">${esc(e.text)}</p>
    <div class="entry-actions">
      ${e.pinned ? '' : `<button class="link-btn" data-pin="${e.id}">Show on Today</button>`}
      <button class="link-btn" data-edit="${e.id}">Edit</button>
      <button class="link-btn danger" data-delete="${e.id}">Delete</button>
      ${e.at ? `<span class="entry-date">${shortDate(e.at)}</span>` : ''}
    </div>
  </li>`;
}

export function rememberView() {
  const list = store.encouragements();
  const refs = store.links();

  const root = el(html`
    <div class="stack">
      <section class="card">
        <h2 class="card-title">Remember</h2>
        <p class="muted">
          What He has already shown you. Read it on the days the waiting is long,
          and on the days you are tempted to look to the right or to the left.
        </p>
      </section>

      <ul class="enc-list">${raw(list.map(card).join('') || '<li class="empty">Nothing saved yet. Write down the first thing He gave you.</li>')}</ul>

      ${raw(
        adding
          ? `<section class="card">
              <h3 class="card-title">Something new to hold onto</h3>
              <form class="enc-form add-enc">
                <input type="text" name="title" data-fk="new-title" maxlength="60" placeholder="Title — e.g. The aisle" />
                <textarea name="text" rows="7" required placeholder="A vision, a word, a promise, something someone said…"></textarea>
                <input type="text" name="source" maxlength="60" placeholder="Where it came from (optional)" />
                <div class="row row-end">
                  <button type="button" class="link-btn cancel-add">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save</button>
                </div>
              </form>
            </section>`
          : '<button class="btn add-enc-btn">Add an encouragement</button>'
      )}

      <section class="card">
        <h2 class="card-title">Worth returning to</h2>
        <p class="muted">Videos, sermons, and articles that show what you value in a marriage.</p>
        <ul class="refs">${raw(refs.map(linkItem).join('') || '<li class="empty">No links yet.</li>')}</ul>
        ${raw(addingLink ? linkForm(null, 'add-link') : '<button class="btn add-link-btn">Add a link</button>')}
      </section>

      <section class="card">
        <h2 class="card-title">For the hard days</h2>
        <ul class="promises">
          ${raw(
            PROMISES.map(
              (p) => `<li><blockquote class="verse verse-sm">${esc(p.text)}</blockquote><cite class="verse-ref">${esc(p.ref)}</cite></li>`
            ).join('')
          )}
        </ul>
      </section>
    </div>
  `);

  on(root, '[data-pin]', 'click', (e) => {
    store.pinEncouragement(e.currentTarget.dataset.pin);
    toast('It will meet you on Today.');
  });

  on(root, '[data-edit]', 'click', (e) => {
    editingId = e.currentTarget.dataset.edit;
    adding = false;
    store.update(() => {});
  });

  on(root, '.cancel-edit', 'click', () => {
    editingId = null;
    store.update(() => {});
  });

  on(root, '.enc.is-editing .enc-form', 'submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const id = f.closest('.enc').dataset.id;
    editingId = null;
    store.editEncouragement(id, {
      title: f.elements.title.value,
      text: f.elements.text.value,
      source: f.elements.source.value
    });
    toast('Saved.');
  });

  on(root, '[data-delete]', 'click', (e) => {
    const btn = e.currentTarget;
    arm(btn, 'Tap again to delete', () => store.removeEncouragement(btn.dataset.delete));
  });

  on(root, '.add-enc-btn', 'click', () => {
    adding = true;
    editingId = null;
    store.update(() => {});
  });

  on(root, '.cancel-add', 'click', () => {
    adding = false;
    store.update(() => {});
  });

  on(root, '.add-enc', 'submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (store.addEncouragement({ title: f.elements.title.value, text: f.elements.text.value, source: f.elements.source.value })) {
      adding = false;
      toast('Written down.');
    }
  });

  on(root, '[data-edit-link]', 'click', (e) => {
    editingLinkId = e.currentTarget.dataset.editLink;
    addingLink = false;
    store.update(() => {});
  });

  on(root, '.cancel-link-edit', 'click', () => {
    editingLinkId = null;
    store.update(() => {});
  });

  on(root, '.edit-link', 'submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const id = f.closest('.ref').dataset.id;
    editingLinkId = null;
    if (store.editLink(id, { title: f.elements.title.value, url: f.elements.url.value, note: f.elements.note.value })) {
      toast('Saved.');
    } else {
      editingLinkId = id;
      toast('That does not look like a web link.');
    }
  });

  on(root, '[data-delete-link]', 'click', (e) => {
    const btn = e.currentTarget;
    arm(btn, 'Tap again to delete', () => store.removeLink(btn.dataset.deleteLink));
  });

  on(root, '.add-link-btn', 'click', () => {
    addingLink = true;
    editingLinkId = null;
    store.update(() => {});
  });

  on(root, '.cancel-link-add', 'click', () => {
    addingLink = false;
    store.update(() => {});
  });

  on(root, '.add-link', 'submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    addingLink = false;
    if (store.addLink({ title: f.elements.title.value, url: f.elements.url.value, note: f.elements.note.value })) {
      toast('Link saved.');
    } else {
      addingLink = true;
      toast('That does not look like a web link.');
    }
  });

  return root;
}
