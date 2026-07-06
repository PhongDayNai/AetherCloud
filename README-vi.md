# AetherCloud (Bản Tiếng Việt)

[English Version](./README.md)

AetherCloud là một nền tảng lưu trữ đám mây cá nhân (Private Cloud) tự lưu trữ dùng để sao lưu, sắp xếp và cộng tác trên mọi loại tệp tin của cá nhân và đội ngũ—bao gồm tài liệu, mã nguồn, hình ảnh, video và các tệp tin chung khác. Được xây dựng với giao diện kính mờ (glassmorphism) responsive cao cấp, hệ màu sắc và theme tùy chỉnh, cùng hệ thống bảo mật đa người dùng mạnh mẽ, AetherCloud tích hợp một bộ ứng dụng soạn thảo và quản lý tài liệu chuẩn doanh nghiệp cùng với một trung tâm đa phương tiện hiệu năng cao.

Hệ thống được tối ưu hóa cho máy chủ gia đình hoặc các thiết bị NAS kết hợp với ổ cứng ngoài và định tuyến an toàn ra internet qua Cloudflare Tunnel.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. Quản lý File & Thư viện Đa phương tiện Cá nhân (Personal Cloud)
Không gian lưu trữ và sắp xếp tệp tin cá nhân hiện đại:
*   **Thư viện ảnh hiệu năng cao**: Bố cục dạng lưới (Grid) mượt mà kết hợp chế độ cuộn ảo (virtual scrolling) và trình xem Lightbox chất lượng cao.
*   **Làm mờ nền thông minh**: Tự động nhận diện và làm mờ nền (blur effect) cho các ảnh/video dọc để hiển thị tối ưu trên màn hình ngang.
*   **Chế độ Chọn nhiều (Selection Mode)**: Hỗ trợ nhấn giữ hoặc click chọn nhiều mục để thực hiện thao tác hàng loạt (tải về, xóa tạm thời, gắn nhãn, thêm vào album/dự án tài liệu, hoặc chia sẻ vào nhóm).
*   **Album & Tập tài liệu (Doc Projects)**: Gom nhóm thủ công ảnh/video thành Album và phân loại tài liệu vào các Binder dự án.
*   **Thùng rác**: Hỗ trợ xóa tạm thời (soft delete), khôi phục, hoặc xóa vĩnh viễn (purge).

### 2. Nhóm chia sẻ & Không gian cộng tác nhóm
*   **Workspace Switcher**: Chuyển đổi linh hoạt giữa "Không gian cá nhân" và các "Nhóm chia sẻ" trực tiếp tại Sidebar.
*   **Quản lý thành viên nhóm**: Tạo nhóm chia sẻ, mời thành viên bằng email, quản lý vai trò (`owner`, `admin`, `member`), nhượng quyền sở hữu nhóm, thăng/hạ cấp hoặc trục xuất thành viên.
*   **Không gian con cộng tác (Sub-Spaces)**: Tạo không gian trong nhóm theo các loại:
    *   `journal` (nhật ký): Viết nhật ký, ghi chép câu chuyện kèm tệp đính kèm theo trình tự thời gian.
    *   `collection` (bộ sưu tập): Lưu trữ thư viện đa phương tiện và file tài liệu chung.
    *   `project` (dự án): Quản lý file tài liệu dự án trực quan theo cấu trúc thư mục.
*   **Soạn thảo & Dòng thời gian (Timeline)**: Đăng bài viết trong không gian con, đính kèm file mới hoặc file có sẵn, hỗ trợ tùy chọn "Đồng thời lưu vào Không gian cá nhân" để tạo bản sao lưu riêng.
*   **Mô hình sao chép Metadata**: File chia sẻ vào nhóm sử dụng bản ghi siêu dữ liệu độc lập. Xóa file cá nhân không ảnh hưởng đến file của nhóm. File vật lý chỉ bị xóa khỏi ổ cứng khi không còn bản ghi database nào tham chiếu đến đường dẫn file.

### 3. Trình xem tài liệu hợp nhất & Biên tập cộng tác (DocViewer)
AetherCloud tích hợp một bộ ứng dụng **DocViewer** mạnh mẽ giúp đọc, chỉnh sửa và quản lý tài liệu trực tiếp trong hệ thống:
*   **Hỗ trợ định dạng phong phú**:
    *   `pdf`: Xem tài liệu trực tiếp trong iframe sử dụng trình đọc PDF gốc của trình duyệt.
    *   `markdown`: Soạn thảo và xem trước Markdown Live Preview chia đôi màn hình.
    *   `code`/`config`/`text`: Xem code với số dòng và tô màu cú pháp tự động.
    *   `binary fallbacks`: Hiển thị thẻ thông tin định dạng cao cấp (Word, Excel, PowerPoint, zip, db...) kèm nút tải xuống file gốc.
*   **Markdown Live Preview**: Trình soạn thảo bên trái và xem trước HTML bên phải (biên dịch bằng `marked`, lọc XSS bằng `isomorphic-dompurify`). Tích hợp:
    *   **Sơ đồ Mermaid**: Tự động vẽ đồ thị SVG trực tiếp từ các block code Mermaid.
    *   **Xuất PDF**: Tự động căn chỉnh trang in PDF thông qua custom print CSS (ẩn các thanh điều hướng và editor).
    *   **Đồng bộ cuộn**: Cuộn đồng bộ tỷ lệ giữa editor và preview.
*   **Trình xem Code & Cơ chế tối ưu hóa hiệu năng**:
    *   Xử lý file văn bản lên đến 10MB và phân đoạn hiển thị 1.000 dòng để tránh đơ trình duyệt.
    *   Đo vận tốc cuộn chuột; khi cuộn nhanh, tạm dừng tô màu cú pháp và hiển thị khung xương giả lập (Skeleton lines) để duy trì tốc độ 60 FPS mượt mà.
*   **Lịch sử phiên bản & Khôi phục**: Xem lịch sử chỉnh sửa, xem thử phiên bản cũ (chỉ đọc), và khôi phục tệp về phiên bản cũ (bản nháp hiện tại sẽ tự động lưu thành phiên bản mới trong lịch sử).
*   **Bộ trộn mã 3 bên (3-Way Merge Editor)**: Giải quyết xung đột trực quan khi lưu tệp được chỉnh sửa đồng thời bởi nhiều người (hiển thị bản Server, bản Local và bản kết quả gộp).
*   **Tối ưu hóa đọc**: Bật chế độ căn đều văn bản (Justify Text) cho tài liệu Markdown.
*   **Sandbox Mode mặc định**: Tùy chọn chỉ đọc bảo vệ trong cài đặt để tránh chỉnh sửa nhầm.

### 4. Bảo mật tài khoản & Bảng quản trị
*   **Quản lý phiên làm việc bảo mật**: Xác thực an toàn bằng mã hóa băm mật khẩu PBKDF2 kết hợp salt ngẫu nhiên, lưu trữ JWT (Access/Refresh) trong `httpOnly` secure cookies.
*   **Kiểm soát phiên đăng nhập**: Cho phép xem các thiết bị đang đăng nhập, đổi mật khẩu và đăng xuất chủ động khỏi toàn bộ các thiết bị khác.
*   **Bắt buộc đổi mật khẩu**: Yêu cầu người dùng đổi mật khẩu tạm thời ngay trong lần đầu đăng nhập để kích hoạt tài khoản.
*   **Hộp cài đặt tùy biến (Settings)**:
    *   **Tổng quan**: Chọn ngôn ngữ hiển thị (Anh/Việt), giao diện (Sáng, Tối, Hệ thống), chế độ gom nhóm theo thời gian (Tháng, Năm, Tắt), và Sandbox mode mặc định.
    *   **Hồ sơ**: Đổi tên hiển thị, xem email bảo mật (khóa), đổi mật khẩu và quản lý đăng xuất các thiết bị khác.
    *   **Mã mời (Admin)**: Quản lý mã mời đăng ký của Admin, giới hạn lượt dùng và ngày hết hạn, copy nhanh và vô hiệu hóa mã mời chủ động.

### 5. Pipeline Xử lý Media & Stream Video VOD
*   **Tải lên phân đoạn (Chunk Upload)**: Tự động chuyển đổi sang cơ chế Chunk Upload khi tệp > 90MB để tránh đứt gãy kết nối do timeout mạng.
*   **Xử lý ảnh**: Tự động nén và sinh phiên bản xem nhanh (`thumb.webp`, `preview.avif`) bằng thư viện Sharp ở chế độ chạy nền.
*   **HLS Video Streaming**: Chuyển đổi định dạng và phân đoạn video thành HTTP Live Streaming (HLS VOD) giúp phát video mượt mà không bị buffer và tiết kiệm băng thông.
*   **Báo cáo dung lượng trực quan**: Hiển thị tổng dung lượng, đã dùng, còn trống và biểu đồ phân tách (Tệp gốc, Tệp tối ưu preview, Thùng rác). Đóng băng chỉ số (Usage Freeze) khi worker đang xử lý video để tránh hiện tượng nhiễu giao diện (UI flickering).

### 6. Dọn dẹp tệp mồ côi tự động (Orphaned Files Cleaner)
*   **Quét khởi động**: Quét các thư mục gốc originals, trash, derived, versions khi khởi động backend.
*   **Giải phóng ổ cứng**: Phát hiện và xóa các tệp vật lý không còn được tham chiếu trong DB (bỏ qua tệp mới upload dưới 3 tiếng để tránh ảnh hưởng phiên upload hiện tại), tự động dọn dẹp các thư mục rỗng.

---

## 🏗️ Kiến Trúc Hệ Thống & Công Nghệ

Hệ thống được container hóa hoàn toàn thông qua Docker với cấu trúc các dịch vụ như sau:

*   **`aethercloud-fe`**: Frontend Next.js 14 (App Router) chạy trên port `45173`.
*   **`aethercloud-be`**: RESTful API Backend viết bằng Node.js / Express chạy trên port `45174`.
*   **`aethercloud-worker`**: Worker xử lý tác vụ nền (trích xuất EXIF, sinh preview bằng Sharp, transcode video bằng FFmpeg).
*   **`aethercloud-db`**: Cơ sở dữ liệu PostgreSQL 16 lưu trữ siêu dữ liệu (metadata).
*   **`aethercloud-redis`**: Redis 7 instance quản lý các hàng đợi tác vụ xử lý (job queue).
*   **`cloudflared`**: Kết nối và định tuyến dịch vụ qua Cloudflare Tunnel bảo mật.

### Công nghệ sử dụng
*   **Frontend**: Next.js 14, React 18, Vanilla CSS (hệ thống giao diện sáng/tối/hệ thống, màu chủ đạo: Indigo, Emerald, Rose), marked (GFM Markdown), highlight.js, mermaid.js, isomorphic-dompurify, hls.js.
*   **Backend**: Node.js, Express, TypeScript, Multer (upload tệp), pg (PostgreSQL client), exifr (trích xuất EXIF), jsonwebtoken.
*   **Database**: PostgreSQL 16 (Bảng quan hệ, indexes tối ưu phân trang, cột mảng, lịch sử phiên bản), Redis 7.

---

## 🛠️ Hướng Dẫn Cài Đặt (Local Development)

### 1. Chuẩn bị biến môi trường
Sao chép cấu hình môi trường mẫu và thiết lập các tham số cần thiết (đặc biệt là tài khoản quản trị Admin, mật khóa, JWT secret và đường dẫn mount ổ cứng vật lý):
```bash
cp .env.example .env
# Chỉnh sửa các giá trị cấu hình bên trong tệp .env phù hợp với môi trường của bạn
```

### 2. Các script tiện ích (chạy trong thư mục `apps/backend`)
*   **Seed tài khoản Admin**: Đồng bộ hoặc tạo tài khoản Admin cấu hình từ `.env`.
    ```bash
    npm run set-admin
    ```
*   **Tạo mã mời đăng ký**: Sinh mã mời đăng ký tài khoản dài 6 ký tự.
    ```bash
    npm run create-invite
    ```
*   **Dọn dẹp tệp mồ côi**: Chạy thủ công việc quét và dọn dẹp các tệp mồ côi trên ổ đĩa.
    ```bash
    npm run clean-orphaned-files
    ```

### 3. Khởi chạy toàn bộ ứng dụng
Khởi chạy toàn bộ các dịch vụ ở chế độ chạy ngầm (detached mode) thông qua Docker Compose:
```bash
docker compose up -d --build
```

### 4. Các địa chỉ kiểm tra nhanh (Endpoints)
*   **Frontend**: `http://localhost:45173` (Tự động điều hướng đến trang `/login` hoặc `/dashboard`)
*   **Backend Health Check**: `http://localhost:45174/api/health`
*   **Storage Usage API**: `http://localhost:45174/api/storage/usage` (Yêu cầu đăng nhập)

---

## 🌐 Cấu hình Cloudflare Tunnel (Môi trường Product)
1.  Định cấu hình tệp cấu hình tunnel tại: `infra/cloudflared/config.yml` (tham khảo cấu hình mẫu tại `infra/cloudflared/config.example.yml`).
2.  Trỏ tên miền Frontend và API Backend về các container tương ứng trong mạng nội bộ Docker.
