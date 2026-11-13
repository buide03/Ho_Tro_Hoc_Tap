const main = document.querySelector('#main');
const tutor = document.querySelector('#tutor');
const chatToggle = document.querySelector('.chat-toggle');
const chatForm = document.querySelector('#chat-form');
const messages = document.querySelector('#messages');
const history = [];
let learning;

const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const practice = lesson => '#practice/' + lesson.id;
const library = lesson => '#library/' + lesson.id;

async function api(path, payload) {
  const response = await fetch('/api/' + path, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu.');
  return data;
}

function cards(tab, heading = 'h2') {
  return '<div class="lesson-grid">' + learning.lessons.map(lesson => {
    const topic = learning.progress.topics.find(item => item.id === lesson.id);
    const detail = tab === 'library' ? lesson.slides.length + ' slide · Bài giảng tóm tắt'
      : topic.answered + '/' + topic.total + ' câu đã làm' + (topic.score === null ? '' : ' · ' + topic.score + '% đúng');
    return `<article class="lesson-card">
      <span class="topic-icon ${lesson.color}" aria-hidden="true">${escape(lesson.icon)}</span>
      <${heading}>${escape(lesson.title)}</${heading}>
      <p>${escape(lesson.summary)}<br>${detail}</p>
      <a href="${tab === 'library' ? library(lesson) : practice(lesson)}">${tab === 'library' ? 'Xem bài giảng' : 'Luyện tập'} →</a>
    </article>`;
  }).join('') + '</div>';
}

function home() {
  const { answered, correct, score, recommendation, nextTopicId, topics } = learning.progress;
  const total = topics.reduce((sum, topic) => sum + topic.total, 0);
  return `<section class="hero">
      <span class="hero-symbol" aria-hidden="true">∑</span>
      <h1>Luyện Toán theo nhịp của bạn</h1>
      <p>Làm bài, xem lời giải từng bước và biết mình nên ôn phần nào tiếp theo.</p>
      <div class="actions"><a class="primary" href="#practice">Làm bài tập →</a><a class="secondary" href="#library">Xem bài giảng</a></div>
    </section>
    <h2 class="section-title">Tiến độ của bạn</h2>
    <div class="stats">
      <div class="stat"><span>Đã làm</span><strong>${answered}/${total}</strong></div>
      <div class="stat"><span>Trả lời đúng</span><strong>${correct}</strong></div>
      <div class="stat"><span>Điểm hiện tại</span><strong>${score === null ? '—' : score + '%'}</strong></div>
    </div>
    <div class="recommendation"><p><strong>Gợi ý ôn tập</strong><br>${escape(recommendation)}</p>${nextTopicId ? '<a href="#library/' + nextTopicId + '">Xem tài liệu →</a>' : ''}</div>
    <h2 class="section-title">Chủ đề luyện tập</h2>${cards('practice', 'h3')}`;
}

function feedback(result) {
  return `<div class="feedback ${result.correct ? 'correct' : 'wrong'}">
    <strong>${result.correct ? '✓ Chính xác' : 'Chưa chính xác'} · Đáp án ${result.expected.toLocaleString('vi-VN')}</strong>
    <p>${escape(result.explanation)}</p></div>`;
}

function exercise(lesson) {
  const topic = learning.progress.topics.find(item => item.id === lesson.id);
  return `<a class="back" href="#practice">← Tất cả bài tập</a>
    <h1 class="page-title">${escape(lesson.title)}</h1>
    <p class="page-intro" id="topic-score">${scoreText(topic)}</p>
    <div class="question-list">${lesson.questions.map((question, index) => {
      const previous = learning.answers[lesson.id + ':' + question.id];
      return `<article class="question-card">
        <p class="muted">Câu ${index + 1}</p>
        <h2>${escape(question.prompt)}</h2>
        <form class="answer-form" data-lesson="${lesson.id}" data-question="${question.id}">
          <label class="sr-only" for="answer-${index}">Đáp án câu ${index + 1}</label>
          <input id="answer-${index}" name="answer" autocomplete="off" maxlength="80" required placeholder="Nhập đáp án" value="${escape(previous?.answer || '')}">
          <button class="primary" type="submit">Chấm điểm</button>
        </form>
        <div class="answer-feedback" aria-live="polite">${previous ? feedback(previous) : ''}</div>
      </article>`;
    }).join('')}</div>`;
}

function scoreText(topic) {
  return topic.answered + '/' + topic.total + ' câu đã làm · ' + topic.correct + ' câu đúng'
    + (topic.score === null ? '' : ' · ' + topic.score + '%');
}

function material(lesson, slideNumber) {
  const index = Math.max(0, Math.min(lesson.slides.length - 1, (Number(slideNumber) || 1) - 1));
  const [heading, text] = lesson.slides[Math.floor(index)];
  return `<a class="back" href="#library">← Tất cả tài liệu</a>
    <h1 class="page-title">${escape(lesson.title)}</h1>
    <p class="page-intro">${escape(lesson.summary)}</p>
    <section class="slide-card" aria-label="Slide bài học">
      <div class="slide"><h2>${escape(heading)}</h2><p>${escape(text)}</p></div>
      <div class="actions slide-actions">
        <button class="secondary" data-slide="${Math.floor(index)}" ${index < 1 ? 'disabled' : ''}>← Trước</button>
        <span class="muted">Slide ${Math.floor(index) + 1}/${lesson.slides.length}</span>
        <button class="secondary" data-slide="${Math.floor(index) + 2}" ${index >= lesson.slides.length - 1 ? 'disabled' : ''}>Sau →</button>
      </div>
    </section>
    <section class="slide-card">
      <h2>Bài giảng tóm tắt</h2>
      <div class="lecture">${lesson.slides.map(([title, content]) =>
        `<div><h3>${escape(title)}</h3><p>${escape(content)}</p></div>`).join('')}</div>
    </section>
    <a class="primary" href="${practice(lesson)}">Làm bài chủ đề này →</a>`;
}

function render() {
  if (!learning) return;
  const [route, lessonId, slide] = location.hash.slice(1).split('/');
  const tab = ['practice', 'library'].includes(route) ? route : 'home';
  for (const link of document.querySelectorAll('[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const lesson = learning.lessons.find(item => item.id === lessonId);
  if (tab === 'home') main.innerHTML = home();
  else if (lesson && tab === 'practice') main.innerHTML = exercise(lesson);
  else if (lesson) main.innerHTML = material(lesson, slide);
  else main.innerHTML = tab === 'practice'
    ? '<h1 class="page-title">Làm bài tập</h1><p class="page-intro">Chọn một chủ đề để làm bài và xem lời giải sau mỗi câu.</p>' + cards(tab)
    : '<h1 class="page-title">Tài liệu &amp; bài giảng</h1><p class="page-intro">Xem slide và đọc phần tóm tắt theo chủ đề.</p>' + cards(tab);
}

window.addEventListener('hashchange', () => {
  const activeSlide = document.activeElement?.dataset.slide;
  render();
  if (activeSlide) main.querySelector('.slide-actions button:not(:disabled)')?.focus();
  else window.scrollTo(0, 0);
});

main.addEventListener('click', event => {
  const button = event.target.closest('[data-slide]');
  if (!button) return;
  location.hash = location.hash.split('/').slice(0, 2).join('/') + '/' + button.dataset.slide;
});

let grading = Promise.resolve();
main.addEventListener('submit', event => {
  const form = event.target;
  if (!form.matches('.answer-form')) return;
  event.preventDefault();
  const button = form.querySelector('button');
  const resultBox = form.nextElementSibling;
  const { lesson: lessonId, question } = form.dataset;
  const payload = { lessonId, questionId: Number(question), answer: form.elements.answer.value };
  button.disabled = true;
  grading = grading.then(async () => {
    try {
      const { result, progress } = await api('answer', payload);
      learning.progress = progress;
      learning.answers[lessonId + ':' + question] = result;
      if (!form.isConnected) {
        render();
        return;
      }
      resultBox.innerHTML = feedback(result);
      document.querySelector('#topic-score').textContent = scoreText(progress.topics.find(topic => topic.id === lessonId));
    } catch (error) {
      resultBox.innerHTML = '<p class="feedback wrong">' + escape(error.message) + '</p>';
    } finally {
      button.disabled = false;
    }
  });
});

function appendMessage(role, content, sources = []) {
  const bubble = document.createElement('div');
  bubble.className = 'message ' + role;
  bubble.textContent = content;
  for (const source of sources) {
    const link = document.createElement('a');
    link.href = '#library/' + source.lessonId + '/' + source.slide;
    link.textContent = source.title + ' · Slide ' + source.slide;
    link.addEventListener('click', () => {
      tutor.classList.remove('open');
      chatToggle.setAttribute('aria-expanded', 'false');
    });
    bubble.append(link);
  }
  messages.append(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

chatForm.addEventListener('submit', async event => {
  event.preventDefault();
  const input = chatForm.elements.question;
  const button = chatForm.querySelector('button');
  const question = input.value.trim();
  if (!question || button.disabled || !learning) return;
  appendMessage('user', question);
  const waiting = appendMessage('assistant', 'Đang trả lời…');
  input.value = '';
  button.disabled = true;
  try {
    await grading;
    const result = await api('chat', { question, history: history.map(({ role, content }) => ({ role, content: content.slice(0, 1500) })) });
    waiting.remove();
    appendMessage('assistant', result.answer, result.sources);
    history.push({ role: 'user', content: question }, { role: 'assistant', content: result.answer });
    if (history.length > 8) history.splice(0, history.length - 8);
    document.querySelector('#tutor-mode').textContent = {
      local: 'Kho kiến thức', ai: 'Đã kết nối AI', fallback: 'Kho kiến thức · AI tạm gián đoạn'
    }[result.mode];
  } catch (error) {
    waiting.textContent = error.message;
    if (!input.value) input.value = question;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('.suggestions').addEventListener('click', event => {
  if (!event.target.dataset.prompt || chatForm.querySelector('button').disabled) return;
  chatForm.elements.question.value = event.target.dataset.prompt;
  chatForm.requestSubmit();
});

chatToggle.addEventListener('click', () => {
  const open = tutor.classList.toggle('open');
  chatToggle.setAttribute('aria-expanded', String(open));
  if (open) chatForm.elements.question.focus();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && tutor.classList.contains('open')) {
    tutor.classList.remove('open');
    chatToggle.setAttribute('aria-expanded', 'false');
    chatToggle.focus();
  }
});

try {
  learning = await api('learning');
  render();
} catch (error) {
  main.textContent = 'Không tải được bài học. Hãy tải lại trang. ' + error.message;
}
