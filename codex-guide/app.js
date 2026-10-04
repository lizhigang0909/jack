'use strict';
const {steps, faqs, glossary} = window.GUIDE;
const $ = id => document.getElementById(id);
const KEY = 'codex-guide.progress.v1';
let completed = new Set();
let current = 0;
let category = '全部';
let messageTimeout;
function announce(text) {
  clearTimeout(messageTimeout);
  $('message').textContent = text;
  messageTimeout = setTimeout(() => { $('message').textContent = ''; }, 6000);
}
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) completed = new Set(saved.filter(n => Number.isInteger(n) && n >= 0 && n < steps.length));
} catch { announce('无法读取本地进度，仍可继续阅读。'); }
function saveProgress() {
  try { localStorage.setItem(KEY, JSON.stringify([...completed])); }
  catch { announce('本机无法保存进度；关闭网页后可能丢失勾选记录。'); }
}
function updateProgress() {
  $('progress-text').textContent = `已确认 ${completed.size} / ${steps.length} 步`;
  $('progress').value = completed.size;
  document.querySelectorAll('.step-link').forEach((button, i) => {
    button.classList.toggle('active', i === current);
    button.classList.toggle('completed', completed.has(i));
    if (i === current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    button.querySelector('.number').textContent = completed.has(i) ? '✓' : String(i + 1).padStart(2,'0');
    button.setAttribute('aria-label', `第 ${i+1} 步：${steps[i].title}${completed.has(i) ? '，已确认' : ''}`);
  });
}
function showStep(index, focus = false) {
  current = index;
  const step = steps[index];
  $('step-number').textContent = `STEP ${String(index+1).padStart(2,'0')} / 08`;
  $('step-title').textContent = step.title;
  $('step-subtitle').textContent = step.subtitle;
  $('step-intro').textContent = step.intro;
  $('step-actions').replaceChildren(...step.actions.map(text => {
    const li = document.createElement('li'); li.textContent = text; return li;
  }));
  $('step-prompt').textContent = step.prompt;
  $('step-pitfall').textContent = step.pitfall;
  $('step-check').textContent = `我已确认：${step.check}`;
  $('step-output').textContent = step.time;
  $('complete-step').checked = completed.has(index);
  $('copy-prompt').textContent = '复制模板';
  $('next-step').textContent = index === steps.length - 1 ? '去看常见问题 ↓' : '下一步 →';
  updateProgress();
  if (focus) { $('step-title').tabIndex = -1; $('step-title').focus({preventScroll:true}); $('step-panel').scrollIntoView({block:'start'}); }
}
steps.forEach((step, index) => {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'step-link';
  const number = document.createElement('span'); number.className = 'number';
  const content = document.createElement('span');
  const title = document.createElement('strong'); title.textContent = step.title;
  const caption = document.createElement('span'); caption.className = 'caption'; caption.textContent = step.time;
  content.append(title, caption); button.append(number, content);
  button.onclick = () => showStep(index, true);
  $('step-nav').append(button);
});
$('complete-step').onchange = event => {
  if (event.target.checked) completed.add(current); else completed.delete(current);
  saveProgress(); updateProgress();
};
$('next-step').onclick = () => {
  if (current < steps.length - 1) showStep(current + 1, true);
  else { location.hash = 'qa'; $('search').focus({preventScroll:true}); }
};
$('copy-prompt').onclick = async () => {
  const text = steps[current].prompt;
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    announce('模板已复制。记得替换 [方括号] 中的内容。');
  } catch {
    const range = document.createRange(); range.selectNodeContents($('step-prompt'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    $('step-prompt').focus();
    announce('自动复制不可用，已选中模板。请用系统的复制菜单或 Ctrl+C / ⌘C 复制。');
  }
};
function renderFaqs() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const visible = faqs.filter(([group, question, answer]) => (category === '全部' || group === category) && `${group} ${question} ${answer}`.toLocaleLowerCase().includes(query));
  $('faq-list').replaceChildren(...visible.map(([group, question, answer]) => {
    const details = document.createElement('details'); details.className = 'faq';
    const summary = document.createElement('summary');
    const text = document.createElement('div');
    const label = document.createElement('span'); label.textContent = group;
    text.append(label, document.createTextNode(question)); summary.append(text);
    const p = document.createElement('p'); p.textContent = answer;
    details.append(summary, p); return details;
  }));
  $('result-count').textContent = `${visible.length} 条问答${query ? ` · 关键词「${$('search').value.trim()}」` : ''}`;
  $('no-results').hidden = visible.length > 0;
}
['全部', ...new Set(faqs.map(f => f[0]))].forEach(group => {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = group;
  button.classList.toggle('active', group === category); button.setAttribute('aria-pressed', String(group === category));
  button.onclick = () => {
    category = group;
    $('categories').querySelectorAll('button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    renderFaqs();
  };
  $('categories').append(button);
});
$('search').oninput = renderFaqs;
glossary.forEach(([word, meaning]) => {
  const article = document.createElement('article'); article.className = 'word';
  const h3 = document.createElement('h3'); h3.textContent = word;
  const p = document.createElement('p'); p.textContent = meaning;
  article.append(h3,p); $('glossary').append(article);
});
$('reset-progress').onclick = () => {
  if (!confirm('只重置本指南的阅读进度？这不会删除任何项目文件。')) return;
  completed.clear(); saveProgress(); $('complete-step').checked = false; updateProgress(); announce('阅读进度已重置。');
};
showStep(0); renderFaqs();
