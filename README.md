# AetherCloud

[Bản Tiếng Việt](./README-vi.md)

A self-hosted, private cloud web application for backing up, organizing, and viewing photos, videos, and documents with a smooth interface and experience.

The system is designed to run optimally on home servers or NAS devices integrated with external hard drives (HDD) and is securely routed via Cloudflare Tunnel.

---

## 🚀 Key Features

### 1. Apple Photos-like Media Experience
*   **Smooth gallery grid**: High-performance grid display with virtual scrolling and a beautiful lightbox media viewer.
*   **Vertical media support**: Smart layout fit and background blur (blur effect) to seamlessly display vertical photos and videos.
*   **Multi-selection mode**: Support for long-press and multi-item actions for bulk operations.

### 2. Albums & Document Projects
*   **Albums**: Manually group photos/videos. A single media asset can belong to multiple albums.
*   **Document Projects**: A dedicated sidebar for documents (PDF, Docs) with project grouping and file type filtering.
*   **Trash management**: Supports soft delete, restore, and permanent purge actions.

### 3. High-Performance Media Pipeline
*   **Chunk uploads**: Large files (>90MB) are automatically uploaded in chunks to prevent network timeout issues.
*   **Image optimization**: Automatic compression and generation of lightweight variants (`thumb.webp`, `preview.avif`).
*   **Video streaming**: Dynamic video streaming via Range Requests or standard HLS VOD for buffer-free playback on all devices and reduced bandwidth.

### 4. Disk Space Dashboard
*   **Visual breakdown**: Displays total, used, and free disk space, showing exact usage for originals, derived files, and trash.
*   **Usage update freeze**: Temporarily freezes dashboard usage updates while transcoding jobs are running to avoid UI flickering.

---

## 🏗️ System Architecture

The application is fully containerized using Docker and comprises the following services:

*   **`aethercloud-fe`**: Next.js frontend (App Router) running on port `45173`.
*   **`aethercloud-be`**: RESTful API Backend built with Node.js / Express running on port `45174`.
*   **`aethercloud-worker`**: Worker processing background tasks (EXIF extraction, thumbnail generation via Sharp, video transcoding via FFmpeg).
*   **`aethercloud-db`**: PostgreSQL database for metadata storage.
*   **`aethercloud-redis`**: Redis instance managing the background job queues.
*   **`cloudflared`**: Connects and routes your local services directly to the internet securely via Cloudflare Tunnel (no Nginx required).

---

## 🛠️ Getting Started (Local Development)

### 1. Set Up Environment Variables
Copy the template configuration file and configure the required parameters (especially administrator credentials, JWT secrets, and the HDD mount path):
```bash
cp .env.example .env
# Edit the configurations inside the .env file to match your local setup
```

### 2. Run the Application
Launch all services in detached mode using Docker Compose:
```bash
docker compose up -d --build
```

### 3. Verifying Endpoints
*   **Frontend**: `http://localhost:45173` (Automatically redirects to `/login` or `/dashboard`).
*   **Backend Health Check**: `http://localhost:45174/api/health`
*   **Storage Usage API**: `http://localhost:45174/api/storage/usage` (Requires authentication).

---

## 🌐 Production Deployment & Cloudflare Tunnel
When deploying for production under your own domain name:
1.  Configure the tunnel config in `infra/cloudflared/config.yml` (refer to the sample at `infra/cloudflared/config.example.yml`).
2.  Route your Frontend domain and API Backend domain to their respective docker containers.
