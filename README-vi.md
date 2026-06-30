# AetherCloud (Bản Tiếng Việt)

[English Version](./README.md)

Một ứng dụng đám mây cá nhân (Private Cloud) tự lưu trữ dùng để upload, quản lý và trình chiếu ảnh, video, và tài liệu văn bản với giao diện và trải nghiệm mượt mà.

Hệ thống được thiết kế để chạy tối ưu trên các thiết bị máy chủ cá nhân (như Home Server, NAS) kết hợp với ổ cứng gắn ngoài (HDD) và định tuyến an toàn qua Cloudflare Tunnel.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. Trải nghiệm Ảnh & Video dạng Apple Photos
*   **Trình chiếu mượt mà**: Gallery dạng lưới (Grid) tối ưu hóa hiển thị, có chế độ cuộn ảo (virtual scroll) và viewer chất lượng cao.
*   **Hỗ trợ Media dọc**: Fix khoảng trống màn hình và làm mờ nền (blur effect) thông minh cho ảnh/video chụp dọc.
*   **Chế độ chọn nhiều (Selection Mode)**: Hỗ trợ nhấn giữ (long-press), chọn nhiều mục để thực hiện các thao tác hàng loạt.

### 2. Quản lý Album & Dự án tài liệu (Project Docs)
*   **Albums**: Gom nhóm ảnh/video thủ công, một file media có thể thuộc nhiều album khác nhau.
*   **Document Projects**: Sidebar chuyên biệt dành cho tài liệu (PDF, Docs) giúp phân nhóm dự án và lọc theo loại file.
*   **Thùng rác (Trash)**: Hỗ trợ xóa mềm (Soft delete), khôi phục (Restore), hoặc xóa vĩnh viễn (Purge).

### 3. Pipeline Xử lý Media Hiệu năng cao
*   **Tải lên tệp lớn**: Tự động chuyển đổi sang cơ chế **Chunk Upload** (Tải lên phân đoạn) khi tệp > 90MB để tránh đứt gãy kết nối.
*   **Hình ảnh**: Tự động tối ưu dung lượng và tạo các biến thể xem nhanh (`thumb.webp`, `preview.avif`).
*   **Video streaming**: Stream video phân đoạn thông qua cơ chế Range Requests hoặc chuẩn hóa HLS VOD giúp xem mượt mà trên mọi thiết bị và giảm tải băng thông.

### 4. Quản lý Dung lượng (Storage Dashboard)
*   **Báo cáo trực quan**: Hiển thị tổng dung lượng, đã dùng, còn trống và biểu đồ phân tách (Originals, Derived, Trash).
*   **Đóng băng chỉ số (Usage Freeze)**: Tạm dừng cập nhật chỉ số dung lượng khi worker đang xử lý video để tránh hiện tượng nhiễu giao diện (UI flickering).

---

## 🏗️ Kiến Trúc Hệ Thống

Hệ thống được Container hóa hoàn toàn thông qua Docker với cấu trúc các dịch vụ như sau:

*   **`aethercloud-fe`**: Frontend Next.js (App Router) chạy trên port `45173`.
*   **`aethercloud-be`**: RESTful API Backend viết bằng Node.js / Express chạy trên port `45174`.
*   **`aethercloud-worker`**: Worker xử lý tác vụ nền (trích xuất EXIF, sinh preview bằng Sharp, transcode video bằng FFmpeg).
*   **`aethercloud-db`**: Cơ sở dữ liệu PostgreSQL lưu trữ siêu dữ liệu (metadata).
*   **`aethercloud-redis`**: Redis instance quản lý các hàng đợi tác vụ xử lý (job queue).
*   **`cloudflared`**: Kết nối và định tuyến trực tiếp các dịch vụ ra Internet thông qua Cloudflare Tunnel bảo mật (không cần dùng Nginx).

---

## 🛠️ Hướng Dẫn Cài Đặt (Local Development)

### 1. Chuẩn bị biến môi trường
Sao chép cấu hình môi trường mẫu và thiết lập các tham số cần thiết (đặc biệt là email quản trị, mật khẩu, JWT secret và đường dẫn mount ổ cứng vật lý):
```bash
cp .env.example .env
# Chỉnh sửa các giá trị cấu hình bên trong tệp .env phù hợp với môi trường của bạn
```

### 2. Chạy ứng dụng bằng Docker Compose
Khởi chạy toàn bộ hệ thống ở chế độ chạy ngầm (detached mode):
```bash
docker compose up -d --build
```

### 3. Địa chỉ kiểm tra nhanh (Endpoints)
*   **Frontend**: `http://localhost:45173` (Tự động điều hướng đến trang `/login` hoặc `/dashboard`).
*   **Backend Health Check**: `http://localhost:45174/api/health`
*   **Storage Usage API**: `http://localhost:45174/api/storage/usage` (Yêu cầu đăng nhập).

---

## 🌐 Cấu hình Cloudflare Tunnel (Môi trường Product)
Khi triển khai thực tế trên tên miền (domain) riêng của bạn:
1.  Định cấu hình tệp cấu hình tunnel tại: `infra/cloudflared/config.yml` (tham khảo cấu hình mẫu tại `infra/cloudflared/config.example.yml`).
2.  Trỏ tên miền Frontend và API Backend về các container tương ứng trong mạng nội bộ Docker.
