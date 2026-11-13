import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { lessons, publicLessons, checkAnswer } from './curriculum.mjs';
import { answerTutor, summarize } from './tutor.mjs';

const dataDirectory = new URL('./data/', import.meta.url);
const database = new URL('progress.json', dataDirectory);
const temporary = new URL('progress.tmp', dataDirectory);
let students = {};
try {
  students = JSON.parse(readFileSync(database, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']]
].map(([path, [file, type]]) => [path, [readFileSync(new URL('./public/' + file, import.meta.url)), type]]));

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw new RequestError(415, 'Yêu cầu cần dùng JSON.');
  }
  let data = '';
  request.setEncoding('utf8');
  for await (const chunk of request) {
    data += chunk;
    if (Buffer.byteLength(data) > 52000) {
      request.resume();
      throw new RequestError(413, 'Nội dung gửi lên quá dài.');
    }
  }
  try {
    const payload = JSON.parse(data);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    throw new RequestError(400, 'Dữ liệu JSON không hợp lệ.');
  }
}

const activeChats = new Set();

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  const json = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
  };
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method === 'GET' && assets.has(path)) {
      const [asset, type] = assets.get(path);
      response.writeHead(200, { 'Content-Type': type });
      response.end(asset);
      return;
    }
    if (request.method === 'POST' && request.headers.origin
      && request.headers.origin !== 'http://' + request.headers.host
      && request.headers.origin !== 'https://' + request.headers.host) {
      throw new RequestError(403, 'Nguồn gửi yêu cầu không hợp lệ.');
    }
    let studentId = request.headers.cookie?.match(/(?:^|;\s*)study_id=([0-9a-f-]{36})(?:;|$)/)?.[1];
    if (!studentId) {
      studentId = randomUUID();
      const secure = request.socket.encrypted ? '; Secure' : '';
      response.setHeader('Set-Cookie', 'study_id=' + studentId + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000' + secure);
    }
    const student = students[studentId] ?? { answers: {} };
    if (request.method === 'GET' && path === '/api/learning') {
      return json(200, { lessons: publicLessons(), progress: summarize(student), answers: student.answers });
    }
    if (request.method === 'POST' && path === '/api/answer') {
      const { lessonId, questionId, answer } = await readBody(request);
      const lesson = lessons.find(item => item.id === lessonId);
      const question = Number.isInteger(questionId) ? lesson?.questions[questionId] : null;
      if (!question) throw new RequestError(404, 'Không tìm thấy câu hỏi.');
      if (typeof answer !== 'string' || answer.length > 80) throw new RequestError(400, 'Hãy nhập một số hoặc phân số.');
      const [, expected, explanation] = question;
      const correct = checkAnswer(answer, expected);
      if (correct === null) throw new RequestError(400, 'Hãy nhập một số hoặc phân số, ví dụ 4,5 hoặc 9/2.');
      const result = { answer: answer.trim(), correct, expected, explanation };
      const latest = students[studentId] ?? { answers: {} };
      const updated = { answers: { ...latest.answers, [lessonId + ':' + questionId]: result } };
      const snapshot = { ...students, [studentId]: updated };
      mkdirSync(dataDirectory, { recursive: true });
      writeFileSync(temporary, JSON.stringify(snapshot), 'utf8');
      renameSync(temporary, database);
      students = snapshot;
      return json(200, { result, progress: summarize(updated) });
    }
    if (request.method === 'POST' && path === '/api/chat') {
      const { question, history } = await readBody(request);
      if (typeof question !== 'string' || !question.trim() || question.length > 1200) {
        throw new RequestError(400, 'Hãy nhập câu hỏi dài từ 1 đến 1.200 ký tự.');
      }
      const context = Array.isArray(history) ? history.slice(-8).filter(item =>
        (item?.role === 'user' || item?.role === 'assistant') && typeof item.content === 'string'
      ).map(({ role, content }) => ({ role, content: content.slice(0, 1500) })) : [];
      if (activeChats.has(studentId)) throw new RequestError(429, 'Hãy đợi câu trả lời trước đó.');
      activeChats.add(studentId);
      try {
        return json(200, await answerTutor(question.trim(), context, students[studentId] ?? student));
      } finally {
        activeChats.delete(studentId);
      }
    }
    return json(404, { error: 'Không tìm thấy trang.' });
  } catch (error) {
    if (error instanceof RequestError) return json(error.status, { error: error.message });
    console.error(error);
    return json(500, { error: 'Máy chủ gặp lỗi. Vui lòng thử lại.' });
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log('Local: http://' + host + ':' + server.address().port));
