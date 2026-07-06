# AetherCloud

[Bản Tiếng Việt](./README-vi.md)

AetherCloud is a unified, self-hosted private cloud platform for backing up, organizing, and collaborating on all your personal and team assets—including documents, code, photos, videos, and general files. Featuring a premium, responsive glassmorphism user interface, customizable themes, and robust multi-user security, AetherCloud integrates a collaborative, enterprise-grade document editing suite with a high-performance media hub.

The system is optimized for home servers or NAS devices integrated with external storage and can be securely routed to the internet via Cloudflare Tunnel.

---

## 🚀 Key Features

### 1. Personal Cloud Storage & Media Hub
A modern media and file space that offers high-speed browsing and rich presentation:
*   **Smooth Gallery Grid**: High-performance grid display with virtual scrolling and a beautiful lightbox media viewer.
*   **Smart Layout Fit**: Dynamic background blur effect to display vertical photos and videos seamlessly without black bars on widescreen layouts.
*   **Multi-Selection Mode**: Support for long-press or checkboxes to perform bulk actions (download, delete, tag, add to albums/projects, or share to groups).
*   **Albums & Binders**: Create manual photo/video albums and organize documents into custom binders.
*   **Trash Bin**: Supports soft delete, restore, and permanent purge actions.

### 2. Shared Groups & Collaboration Workspaces
*   **Workspace Switcher**: Instantly switch between "Personal Cloud" and "Group Workspaces" in the Sidebar.
*   **Group Management**: Create sharing groups, invite members by email, manage roles (`owner`, `admin`, `member`), transfer ownership, promote/demote members, or expel them.
*   **Collaborative Sub-Spaces**: Create spaces within a group categorized by:
    *   `journal`: A chronological feed for logging stories and notes with file attachments.
    *   `collection`: A structured gallery and document library for sharing assets.
    *   `project`: A directory for organizing project-related assets and documents.
*   **Space Timeline & Composer**: Author posts in spaces, attach new or existing files, and toggle "Save to Personal Copy" to duplicate assets in your private storage.
*   **Shared Metadata Model**: Shared assets use duplicate metadata records. Modifying or deleting personal files does not affect group shares. Physical files are preserved on disk until all database references are removed.

### 3. Unified Document Suite & Collaborative Editing (DocViewer)
AetherCloud features a powerful, built-in **DocViewer** suite designed for viewing, editing, and managing documents directly within the application:
*   **Comprehensive Format Previews**:
    *   `pdf`: Displayed in a full-height iframe using the browser's native PDF engine.
    *   `markdown`: Live split-screen Markdown editor & previewer.
    *   `code`/`config`/`text`: Rendered in a text editor with line numbers and syntax highlighting.
    *   `binary fallbacks`: Premium details cards with format-specific icons (Word, Excel, PowerPoint, archives, databases, installers, etc.) and download options.
*   **Markdown Live Preview**: Split-screen raw code editor (left) and live preview (right) compiled via `marked` and sanitized with `isomorphic-dompurify`. Includes:
    *   **Mermaid Diagrams**: Compiles and renders SVG graphics directly from markdown code blocks.
    *   **PDF Print Export**: Utilizes custom CSS page-cutting print rules for printing Markdown files natively.
    *   **Scroll Synchronization**: Proportional scroll-sync between the editor and preview containers.
*   **Code Viewer & Velocity-Based Throttling**:
    *   Handles text files up to 10MB progressively in 1,000-line slices.
    *   Detects scroll velocity; when scrolling fast, syntax highlighting is suspended, rendering layout skeleton lines instead to maintain a fluid 60 FPS.
*   **Version History & Restoring**: View document history, preview past versions in read-only mode, and restore past versions (saving the active draft as a new version history backup).
*   **3-Way Merge Conflict Resolution**: Shows Server, Local, and Merged states side-by-side to manually resolve concurrent editing conflicts before saving.
*   **Reading Optimization**: Toggle "Justify Text" mode to align markdown text margins cleanly.
*   **Default Sandbox Mode**: Optional read-only protective mode configured in settings.

### 4. Multi-User Security & Session Control
*   **Secured Session Management**: Cryptographically secure authentication utilizing PBKDF2 password hashing, salt generation, and JWT tokens (Access/Refresh) stored in `httpOnly` secure cookies.
*   **Active Session Control**: Revoke active sessions dynamically and log out of all other devices upon password updates.
*   **Force Password Update**: Prompts users to change temporary passwords on their first login.
*   **Custom Settings Panel**:
    *   **General**: Set display language, toggle appearance (System, Dark, Light), toggle "Group by time" (Month, Year, Disabled), and select default Sandbox mode.
    *   **Profile**: Update display name, view locked secure email, change password, and manage active session revocation.
    *   **Invites (Admin Console)**: Manage 6-character registration invitation codes, configure usage limits and expiry dates, copy tokens, and manually deactivate them.

### 5. Media Pipeline & VOD Streaming
*   **Chunk Uploads**: Automatically splits large files (>90MB) into segments to prevent timeouts and connection drops.
*   **Image Optimization**: Automatic compression and generation of optimized preview sizes using Sharp (`thumb.webp`, `preview.avif`).
*   **Video HLS Streaming**: Compresses and transcodes videos into HTTP Live Streaming (HLS VOD) segments for buffer-free playback on all devices.
*   **Visual Storage Dashboard**: Displays total, used, and free disk space, showing exact usage for originals, derived files, and the trash bin. Temporarily freezes dashboard usage updates while transcoding jobs are running to avoid UI flickering.

### 6. Automated Maintenance & Reclaim
*   **Startup Scanner**: Scans physical original, trash, derived, and version folders on backend startup.
*   **Space Reclaimer**: Identifies and deletes physical files that have no database references (ignoring files uploaded in the last 3 hours to protect active uploads), and removes empty directories to clean up disk space.

---

## 🏗️ System Architecture & Tech Stack

AetherCloud is containerized using Docker and comprises the following services:

*   **`aethercloud-fe`**: Next.js 14 (App Router) frontend running on port `45173`.
*   **`aethercloud-be`**: Node.js & Express RESTful API server running on port `45174`.
*   **`aethercloud-worker`**: Worker processing background tasks (EXIF extraction, thumbnail generation, video transcoding).
*   **`aethercloud-db`**: PostgreSQL 16 database for structured relational metadata storage.
*   **`aethercloud-redis`**: Redis 7 instance managing background job queues.
*   **`cloudflared`**: Secure routing tunnel.

### Technologies
*   **Frontend**: Next.js 14, React 18, Vanilla CSS (custom design system with system/dark/light themes, accent colors: Indigo, Emerald, Rose), marked (GFM Markdown), highlight.js, mermaid.js, isomorphic-dompurify, hls.js.
*   **Backend**: Node.js, Express, TypeScript, Multer, pg (Postgres client), exifr (EXIF parsing), jsonwebtoken.
*   **Database**: PostgreSQL 16 (Relational schemas, versioning tables, indexes, array columns), Redis 7.

---

## 🛠️ Getting Started (Local Development)

### 1. Set Up Environment Variables
Copy the template configuration file and configure your admin credentials, JWT secrets, and storage paths:
```bash
cp .env.example .env
# Edit .env file to match your setup
```

### 2. Run Utility Scripts (Backend)
Navigate to `apps/backend` to run the following scripts:
*   **Seed Admin**: Sync or create the Admin account configured in `.env`.
    ```bash
    npm run set-admin
    ```
*   **Create Invite Code**: Generate a 6-character registration invitation code.
    ```bash
    npm run create-invite
    ```
*   **Orphaned Files Cleanup**: Manual scan and delete orphaned files.
    ```bash
    npm run clean-orphaned-files
    ```

### 3. Run the Application
Launch all services in detached mode using Docker Compose:
```bash
docker compose up -d --build
```

### 4. Verifying Endpoints
*   **Frontend**: `http://localhost:45173` (Redirects to `/login` or `/dashboard`)
*   **Backend Health Check**: `http://localhost:45174/api/health`
*   **Storage Usage API**: `http://localhost:45174/api/storage/usage` (Requires authentication)

---

## 🌐 Production Deployment & Cloudflare Tunnel
1.  Configure the tunnel in `infra/cloudflared/config.yml` (refer to the sample at `infra/cloudflared/config.example.yml`).
2.  Route your Frontend domain and API Backend domain to their respective Docker containers in the internal network.
