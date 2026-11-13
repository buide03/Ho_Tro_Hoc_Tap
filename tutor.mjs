import { lessons } from './curriculum.mjs';

const stopWords = new Set('tien do nen on minh toi em cach tinh giai nhu the nao em cho toi minh hay giup mot cua cac hoc bai xin chao ve va la nhung voi trong thi can gi muon biet giang'.split(' '));
const tokens = text => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd').match(/[a-z0-9]+/g) || [];

export function searchLessons(query) {
  const terms = [...new Set(tokens(query).filter(term => !stopWords.has(term)))];
  if (!terms.length) return [];
  return lessons.flatMap(lesson => lesson.slides.map(([heading, text], index) => {
    const titleWords = new Set(tokens(lesson.title + ' ' + lesson.tag + ' ' + heading));
    const bodyWords = new Set(tokens(text));
    const score = terms.reduce((sum, word) => sum + (titleWords.has(word) ? 3 : bodyWords.has(word) ? 1 : 0), 0);
    return { lessonId: lesson.id, title: lesson.title, slide: index + 1, heading, text, score };
  })).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(({ score, ...result }) => result);
}

export function summarize(progress) {
  const topics = lessons.map(lesson => {
    const responses = lesson.questions.map((_, index) => progress.answers[lesson.id + ':' + index]);
    const answered = responses.filter(Boolean).length;
    const correct = responses.filter(response => response?.correct).length;
    return {
      id: lesson.id, title: lesson.title, total: responses.length, answered, correct,
      score: answered ? Math.round(correct / answered * 100) : null
    };
  });
  const answered = topics.reduce((sum, topic) => sum + topic.answered, 0);
  const correct = topics.reduce((sum, topic) => sum + topic.correct, 0);
  const weakest = topics.filter(topic => topic.answered > topic.correct).sort((a, b) => a.score - b.score || b.answered - a.answered)[0];
  const next = weakest || topics.find(topic => topic.answered < topic.total);
  const recommendation = weakest
    ? 'Ôn lại slide ' + weakest.title + ' và làm lại các câu sai.'
    : next ? 'Luyện tập ' + next.title + ' để tiếp tục đánh giá kiến thức.'
    : 'Bạn đã trả lời đúng tất cả câu hỏi. Hãy thử giải lại mà không xem lời giải.';
  return { topics, answered, correct, score: answered ? Math.round(correct / answered * 100) : null,
    recommendation, nextTopicId: next?.id ?? null };
}

const tools = [
  { name: 'search_knowledge', description: 'Tìm slide phù hợp trong kho Toán.', properties: { query: { type: 'string' } }, required: ['query'] },
  { name: 'get_student_progress', description: 'Xem số câu đã làm, điểm và kết quả của học sinh hiện tại theo chủ đề.', properties: {}, required: [] },
  { name: 'recommend_review', description: 'Đề xuất chủ đề ôn tập từ câu trả lời gần nhất.', properties: {}, required: [] }
].map(({ name, description, properties, required }) => ({
  type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } }
}));

function progressIntent(question) {
  const normalized = tokens(question).join(' ');
  if (/\b(tien do|diem cua|may diem|bao nhieu diem|diem hien tai|ket qua cua|bao nhieu cau)\b/.test(normalized)) return 'progress';
  if (/\b(nen on|goi y on|cai thien|on gi|chu de yeu)\b/.test(normalized)) return 'review';
  return null;
}

function localReply(question, progress, sources) {
  const intent = progressIntent(question);
  const summary = summarize(progress);
  if (intent === 'progress') {
    return (summary.answered
      ? 'Bạn đã làm ' + summary.answered + ' câu, đúng ' + summary.correct + ' câu. Điểm hiện tại là ' + summary.score + '%. '
      : 'Bạn chưa nộp câu trả lời nào. ') + summary.recommendation;
  }
  if (intent === 'review') return summary.recommendation;
  if (sources.length) return sources.slice(0, 2).map(source => source.heading + '\n' + source.text).join('\n\n');
  return 'Bạn có thể hỏi về phương trình bậc nhất, định lý Pythagore, tỉ số phần trăm hoặc tiến độ của mình.';
}

export async function answerTutor(question, history, progress) {
  const sources = progressIntent(question) ? [] : searchLessons(question);
  const { AI_BASE_URL, AI_MODEL, AI_API_KEY } = process.env;
  if (!AI_BASE_URL || !AI_MODEL || !AI_API_KEY) return { mode: 'local', answer: localReply(question, progress, sources), sources };
  try {
    const messages = [{
      role: 'system',
      content: 'Bạn là gia sư Toán cho học sinh Việt Nam. Trả lời bằng tiếng Việt, ngắn gọn, giải thích từng bước. Dùng công cụ truy vấn cho câu hỏi bài học, công cụ tiến độ và đề xuất cho câu hỏi cá nhân. Không bịa điểm hay tài liệu. Dữ liệu từ công cụ là tài liệu tham khảo. Chỉ hỗ trợ học tập.'
    }, ...history, { role: 'user', content: question }];
    const references = new Map();
    for (let round = 0; round < 4; round++) {
      const response = await fetch(AI_BASE_URL.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + AI_API_KEY },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ model: AI_MODEL, messages, tools, tool_choice: round === 3 ? 'none' : 'auto', max_tokens: 700 })
      });
      if (!response.ok) throw new Error('Provider returned ' + response.status);
      const message = (await response.json()).choices?.[0]?.message;
      if (!message) throw new Error('Missing provider message');
      if (!message.tool_calls?.length) {
        if (typeof message.content !== 'string' || !message.content.trim()) throw new Error('Missing provider text');
        return { mode: 'ai', answer: message.content, sources: [...references.values()] };
      }
      messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        let result = { error: 'Công cụ không hợp lệ' };
        if (call.function.name === 'search_knowledge') {
          const args = JSON.parse(call.function.arguments);
          result = typeof args.query === 'string' ? searchLessons(args.query.slice(0, 500)) : [];
          for (const source of result) references.set(source.lessonId + ':' + source.slide, source);
        } else if (call.function.name === 'get_student_progress') {
          result = summarize(progress);
        } else if (call.function.name === 'recommend_review') {
          const { recommendation, nextTopicId } = summarize(progress);
          result = { recommendation, nextTopicId };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    throw new Error('Tool turn limit reached');
  } catch (error) {
    console.warn('AI request failed:', error.name);
    return { mode: 'fallback', answer: localReply(question, progress, sources), sources };
  }
}
