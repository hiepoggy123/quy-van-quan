# Quy Vân Quán (归云观) — Học Tiếng Trung

> **Phiên bản tùy biến chuyên sâu**: Học **Hán tự ➔ Pinyin ➔ Nghĩa tiếng Việt**, hỗ trợ **tải file văn bản `.txt`** để tự động phân tích tần suất và gợi ý ưu tiên học các từ xuất hiện nhiều nhất.

---

## 🌟 Tính năng nổi bật

1. **Học Tiếng Trung Hiện Đại (Pinyin ➔ Nghĩa Việt)**:
   - **Gõ Pinyin linh hoạt**:
     - Gõ số thanh điệu: `ren2` ➔ tính đúng tuyệt đối (`rén`).
     - Gõ có dấu trực tiếp: `rén` ➔ tính đúng tuyệt đối.
     - Gõ không dấu thanh: `ren` ➔ tính đúng phiên âm và hệ thống gợi ý thanh điệu tương ứng.
     - *(Vẫn hỗ trợ gõ âm Hán Việt dự phòng: `nhân`).*
   - **Phiên âm Pinyin trên đầu chữ (Ruby annotation)**: Mọi lời thoại, thẻ chữ và câu chuyện đều hiển thị Pinyin chuẩn thay vì chỉ âm Hán Việt.
   - **Thẻ chữ trực quan**: Nhìn chữ Hán lớn, Pinyin nổi bật, nghĩa tiếng Việt rõ ràng, xem thứ tự nét viết chữ (Make Me a Hanzi).
   - **Đã tắt hoàn toàn yêu cầu phát âm bên ngoài**: Chạy 100% độc lập, không báo lỗi mạng hay thiếu server.

2. **Học theo văn bản `.txt` do bạn tải lên**:
   - Bấm nút **`📄 Học file .txt`** ngay trên thanh công cụ trên cùng (hoặc trong thư phòng Thư Trai).
   - Chọn bất kỳ tệp `.txt` nào (tiểu thuyết tiên hiệp, kiếm hiệp, bài báo, đề thi HSK...).
   - **Phân tích tần suất tức thì**:
     - Đếm tổng số chữ Hán trong văn bản.
     - Tính tỷ lệ đọc hiểu hiện tại (% chữ bạn đã học trong văn bản này).
     - Liệt kê bảng xếp hạng các chữ xuất hiện nhiều nhất mà bạn chưa học.
   - **Tự động tối ưu hóa lộ trình**: Khi bật tính năng này, các cuộn học kế tiếp (`Cuộn 1`, `Cuộn 2`...) sẽ tự động ưu tiên nạp 5 chữ có tần suất xuất hiện cao nhất từ văn bản đó!

3. **Chạy Offline 100% & Hỗ trợ PWA**:
   - Tích hợp `manifest.json` và `sw.js` (Service Worker).
   - Khi mở trên điện thoại (Chrome/Safari), bạn có thể bấm **"Thêm vào màn hình chính"** (Add to Home Screen) để dùng như một ứng dụng độc lập toàn màn hình mà không cần mạng.

---

## 🚀 Hướng dẫn đưa lên GitHub Pages (3 bước đơn giản)

Dự án này đã được cấu hình sẵn dạng Static Web để chạy trực tiếp trên GitHub Pages:

### Bước 1: Khởi tạo Git và Commit
Mở terminal (PowerShell hoặc Git Bash) tại thư mục này và chạy:

```bash
git init
git add .
git commit -m "Khoi tao Quy Van Quan - Hoc Tieng Trung Pinyin"
git branch -M main
```

### Bước 2: Đẩy lên GitHub
1. Vào [GitHub](https://github.com/new) tạo một Repository mới (ví dụ đặt tên là `hoc-tieng-trung` hoặc `quy-van-quan`).
2. Chạy lệnh liên kết và đẩy code lên:

```bash
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
git push -u origin main
```

### Bước 3: Kích hoạt GitHub Pages
1. Trên trang Repository GitHub của bạn, vào **Settings** ➔ **Pages** (cột menu bên trái).
2. Tại mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn `main`, thư mục `/ (root)`.
   - Bấm **Save**.
3. Đợi khoảng 1 - 2 phút, GitHub sẽ cung cấp cho bạn một đường link trang web dạng:
   `https://<tai-khoan-cua-ban>.github.io/<ten-repo>/`

Bây giờ bạn có thể mở đường link trên bất kỳ thiết bị nào (máy tính, iPhone, Android) để học mọi lúc mọi nơi!

---

## 💻 Cách chạy thử nghiệm trên máy tính (Local)

Nếu bạn muốn mở chơi thử ngay trên máy tính mà chưa cần đẩy lên mạng:

1. Chạy lệnh mở server bằng Python:
   ```bash
   python -m http.server 8080
   ```
2. Mở trình duyệt truy cập:
   [http://localhost:8080](http://localhost:8080)

---

## 📁 Cấu trúc tệp

- `index.html`: Giao diện chính của game, tối ưu hóa font chữ Google Fonts.
- `quy-van-core.js`: Lõi logic game, thuật toán chấm điểm Pinyin đa dạng và bộ đếm tần suất văn bản.
- `quy-van-app.js`: Quản lý DOM, giao diện thẻ học, giao diện tải file `.txt` và lưu tiến trình (`localStorage`).
- `quy-van-deck.js`: Kho 1.546 chữ Hán thông dụng kèm Pinyin, nghĩa tiếng Việt, từ ghép và mẹo nhớ.
- `quy-van-audio.js`: Bộ phát âm thanh Web Audio API (nhạc ngũ cung, tiếng chuông chùa, gõ mõ).
- `sample_text.txt`: Tệp văn bản mẫu để bạn thử tính năng phân tích và học theo file `.txt`.
- `manifest.json` & `sw.js`: Cấu hình PWA để cài đặt lên điện thoại.
