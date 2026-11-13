export const lessons = [
  {
    id: 'equations', title: 'Phương trình bậc nhất', tag: 'Đại số', icon: 'ƒx', color: 'violet',
    summary: 'Tìm ẩn số bằng phép biến đổi tương đương.',
    slides: [
      ['Dạng tổng quát', 'Phương trình bậc nhất một ẩn có dạng ax + b = 0, với a ≠ 0. Nghiệm duy nhất là x = −b/a.'],
      ['Các bước giải', 'Thu gọn hai vế, chuyển các hạng tử chứa x về một vế, rồi chia cả hai vế cho hệ số của x. Khi chuyển vế, nhớ đổi dấu.'],
      ['Ví dụ', 'Với 3x − 7 = 8, cộng 7 vào hai vế để được 3x = 15, sau đó chia cho 3. Thử lại: 3 × 5 − 7 = 8.']
    ],
    questions: [
      ['Giải phương trình 3x − 7 = 8. Nhập giá trị của x.', 5, 'Cộng 7 vào hai vế: 3x = 15. Chia cả hai vế cho 3: x = 5.'],
      ['Tìm x biết 4x + 12 = 0.', -3, 'Trừ 12 ở hai vế: 4x = −12. Chia cho 4: x = −3.'],
      ['Giải phương trình 2(x + 3) = 16.', 5, 'Chia hai vế cho 2 để được x + 3 = 8. Trừ 3 ở hai vế: x = 5.'],
      ['Tìm x biết 5x − 2 = 3x + 7.', 4.5, 'Trừ 3x và cộng 2 ở hai vế: 2x = 9. Vậy x = 9/2 = 4,5.']
    ]
  },
  {
    id: 'geometry', title: 'Định lý Pythagore', tag: 'Hình học', icon: '△', color: 'teal',
    summary: 'Tính độ dài cạnh trong tam giác vuông.',
    slides: [
      ['Định lý Pythagore', 'Trong tam giác vuông, nếu c là cạnh huyền và a, b là hai cạnh góc vuông thì a² + b² = c². Cạnh huyền đối diện góc vuông.'],
      ['Tìm cạnh còn thiếu', 'Để tìm cạnh huyền, lấy căn bậc hai của a² + b². Để tìm cạnh góc vuông, lấy căn bậc hai của c² trừ bình phương cạnh góc vuông đã biết.'],
      ['Ví dụ', 'Với hai cạnh góc vuông 3 cm và 4 cm, bình phương cạnh huyền bằng 9 + 16 = 25. Vậy cạnh huyền dài 5 cm.']
    ],
    questions: [
      ['Hai cạnh góc vuông dài 6 cm và 8 cm. Cạnh huyền dài bao nhiêu cm?', 10, 'Áp dụng Pythagore: c² = 36 + 64 = 100. Suy ra c = 10 cm.'],
      ['Cạnh huyền dài 13 cm và một cạnh góc vuông dài 5 cm. Cạnh còn lại dài bao nhiêu cm?', 12, 'Bình phương cạnh cần tìm là 169 − 25 = 144. Lấy căn bậc hai được 12 cm.'],
      ['Hình chữ nhật có hai cạnh 9 cm và 12 cm. Đường chéo dài bao nhiêu cm?', 15, 'Đường chéo là cạnh huyền: √(81 + 144) = √225 = 15 cm.'],
      ['Cạnh huyền dài 17 cm, một cạnh góc vuông dài 15 cm. Cạnh góc vuông còn lại dài bao nhiêu cm?', 8, 'Lấy căn bậc hai của 289 − 225 = 64, ta được 8 cm.']
    ]
  },
  {
    id: 'percent', title: 'Tỉ số phần trăm', tag: 'Số học', icon: '%', color: 'gold',
    summary: 'Áp dụng phần trăm vào bài toán thực tế.',
    slides: [
      ['Đổi phần trăm sang số thập phân', 'p% nghĩa là p/100. Ví dụ 15% = 0,15. Để tính p% của một số, nhân số đó với p/100.'],
      ['Tìm tỉ số phần trăm', 'Lấy giá trị thành phần chia cho giá trị tổng, nhân với 100 và viết thêm ký hiệu %.'],
      ['Tăng và giảm theo phần trăm', 'Tăng p% thì nhân giá trị ban đầu với 1 + p/100. Giảm p% thì nhân với 1 − p/100.']
    ],
    questions: [
      ['15% của 240 bằng bao nhiêu?', 36, 'Đổi 15% thành 0,15. Tính 240 × 0,15 = 36.'],
      ['Có 12 trong 30 học sinh chọn bóng đá. Nhập tỉ lệ phần trăm dưới dạng số.', 40, 'Tính 12 ÷ 30 × 100 = 40. Vậy tỉ lệ là 40%.'],
      ['Một cuốn sách giá 80 nghìn đồng giảm 25%. Giá sau giảm là bao nhiêu nghìn đồng?', 60, 'Sau khi giảm, giá bằng 75% giá gốc. Tính 80 × 0,75 = 60.'],
      ['Một số sau khi tăng 20% có giá trị là 144. Số ban đầu bằng bao nhiêu?', 120, 'Giá trị mới bằng 1,2 lần giá trị ban đầu. Chia 144 cho 1,2 được 120.']
    ]
  }
];

export function publicLessons() {
  return lessons.map(({ questions, ...lesson }) => ({
    ...lesson,
    questions: questions.map(([prompt], index) => ({ id: index, prompt }))
  }));
}

export function checkAnswer(input, expected) {
  const number = '[+-]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
  const match = input.trim().replaceAll('−', '-').match(new RegExp('^(' + number + ')(?:\\s*/\\s*(' + number + '))?$'));
  if (!match) return null;
  const numerator = Number(match[1].replace(',', '.'));
  const denominator = match[2] ? Number(match[2].replace(',', '.')) : 1;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return Math.abs(numerator / denominator - expected) < 1e-9;
}
