# Góc Học Tập

Website tiếng Việt để học sinh luyện Toán, xem slide, theo dõi tiến độ và hỏi trợ giảng.

## Chạy cục bộ

Yêu cầu Node.js 22 trở lên. Từ thư mục dự án, chạy:

```powershell
npm start
```

Mở [http://127.0.0.1:3000](http://127.0.0.1:3000). Dự án dùng mô-đun chuẩn của Node.js, không cần cài gói.

## Kết nối mô hình AI

Sao chép `.env.example` thành `.env` rồi điền `AI_BASE_URL`, `AI_MODEL` và `AI_API_KEY`. Khởi động lại máy chủ. Nhà cung cấp cần hỗ trợ API tương thích Chat Completions và function calling. Ví dụ nếu URL cơ sở của nhà cung cấp kết thúc bằng `/v1`, máy chủ sẽ gửi yêu cầu đến `/v1/chat/completions`. Khóa chỉ được đọc trên máy chủ.

Agent có ba công cụ: `search_knowledge` tìm slide bằng từ khóa tiếng Việt có dấu hoặc không dấu, `get_student_progress` tổng hợp kết quả và `recommend_review` chọn chủ đề cần ôn. Khi chưa cấu hình AI hoặc API tạm gián đoạn, trợ giảng trả lời bằng kho kiến thức và dữ liệu tiến độ cục bộ. Khi dùng AI, câu hỏi, lịch sử gần đây và dữ liệu từ công cụ được gọi có thể được gửi đến nhà cung cấp.

## Nội dung và cách tính điểm

- `curriculum.mjs` chứa ba chủ đề Toán mẫu, mỗi chủ đề có bốn câu hỏi, lời giải và ba slide.
- Đáp án có thể là số nguyên, số thập phân dùng dấu phẩy hoặc dấu chấm, hoặc phân số như `9/2`. Máy chủ chấm điểm và trả lời giải ngay sau khi nộp.
- Tiến độ được lưu trên máy chủ trong `data/progress.json` theo mã ngẫu nhiên trong cookie trình duyệt. Điểm là phần trăm câu đúng trên số câu đã trả lời, lấy lần nộp mới nhất của mỗi câu.
- Phiên bản này chạy một tiến trình Node.js, dùng dữ liệu mẫu và theo dõi theo trình duyệt. Chưa có tài khoản học sinh, phân quyền giáo viên hay đồng bộ đa thiết bị.
