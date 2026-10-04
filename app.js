'use strict';
const KEY = 'orbit.tasks.v1';
const $ = id => document.getElementById(id);
let tasks = [];
let filter = 'all';
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid task data');
  tasks = saved.filter(t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean');
} catch {
  $('notice').textContent = '无法读取本地数据，本次可以继续使用；旧数据不会自动覆盖。';
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(tasks)); }
  catch { $('notice').textContent = '浏览器无法保存数据，刷新后可能丢失。'; }
}
function render() {
  $('tasks').replaceChildren();
  const visible = tasks.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done));
  for (const task of visible) {
    const li = document.createElement('li');
    li.className = task.done ? 'done' : '';
    const check = document.createElement('button');
    check.className = 'check';
    check.textContent = task.done ? '✓' : '';
    check.setAttribute('aria-label', `${task.done ? '取消完成' : '完成'}：${task.text}`);
    check.setAttribute('aria-pressed', String(task.done));
    check.onclick = () => { task.done = !task.done; save(); render(); };
    const label = document.createElement('span');
    label.className = 'task-text';
    label.textContent = task.text;
    const remove = document.createElement('button');
    remove.className = 'delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `删除：${task.text}`);
    remove.onclick = () => { tasks = tasks.filter(t => t.id !== task.id); save(); render(); };
    li.append(check, label, remove);
    $('tasks').append(li);
  }
  $('empty').hidden = visible.length > 0;
  $('empty').textContent = tasks.length === 0 ? '宇宙很大，从一个小任务开始。' : '这个轨道暂时没有任务。';
  $('count').textContent = `${tasks.filter(t => !t.done).length} 项待出发`;
  const energy = tasks.filter(t => t.done).length * 10;
  const level = Math.floor(energy / 50);
  $('energy').textContent = energy;
  $('level').textContent = ['初航者', '星际旅人', '轨道探索家', '银河领航员'][Math.min(level, 3)];
  $('progress').style.width = `${energy % 50 / 50 * 100}%`;
  $('next-level').textContent = `距离下一个里程碑还需 ${50 - energy % 50} 能量`;
}
$('task-form').onsubmit = event => {
  event.preventDefault();
  const text = $('task-input').value.trim();
  if (!text) return;
  tasks.push({ id: crypto.randomUUID(), text: text.slice(0, 120), done: false });
  $('task-input').value = '';
  save(); render(); $('task-input').focus();
};
document.querySelectorAll('[data-filter]').forEach(button => {
  button.onclick = () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    render();
  };
});
$('clear').onclick = () => {
  if (!tasks.some(t => t.done)) return;
  if (!confirm('清理已完成任务？对应能量也会移除。')) return;
  tasks = tasks.filter(t => !t.done); save(); render();
};
let remaining = Number($('duration').value) * 60;
let deadline = null;
let interval = null;
function displayTime() {
  $('time').textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
}
function pause() {
  clearInterval(interval); interval = null; deadline = null;
  $('toggle-timer').textContent = '继续专注';
  $('duration').disabled = false;
}
function tick() {
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  displayTime();
  if (remaining === 0) {
    pause(); $('toggle-timer').textContent = '再来一轮';
    $('timer-status').textContent = '探索完成！休息一下，看看窗外。';
    $('timer-announcement').textContent = '本轮专注已完成。';
  }
}
$('toggle-timer').onclick = () => {
  if (interval !== null) { tick(); pause(); $('timer-status').textContent = '已暂停，准备好再继续'; return; }
  if (remaining === 0) remaining = Number($('duration').value) * 60;
  deadline = Date.now() + remaining * 1000;
  interval = setInterval(tick, 250);
  $('toggle-timer').textContent = '暂停';
  $('timer-status').textContent = '正在专注，宇宙可以等一会儿';
  $('timer-announcement').textContent = '';
  $('duration').disabled = true;
  displayTime();
};
function resetTimer() {
  pause(); remaining = Number($('duration').value) * 60;
  $('toggle-timer').textContent = '开始专注';
  $('timer-status').textContent = '一次只探索一件事';
  $('timer-announcement').textContent = '';
  displayTime();
}
$('reset-timer').onclick = resetTimer;
$('duration').onchange = resetTimer;
render(); displayTime();
