<!-- markdownlint-disable -->
<p align="center">
  <a href="https://github.com/Lucifer-00007/tgcf-main">
    <img src="https://user-images.githubusercontent.com/66209958/115183360-3fa4d500-a0f9-11eb-9c0f-c5ed03a9ae17.png" alt="tgcf logo" width="150">
  </a>
</p>

<h1 align="center">tgcf</h1>

<p align="center">
  <strong>The ultimate tool to automate custom Telegram message forwarding, now powered by Node.js with a Next.js Web UI.</strong>
</p>

`tgcf` (telegram content forwarder) is an advanced automation tool for Telegram, rewritten in Node.js/TypeScript. It allows you to forward messages from source chats to destination chats with a high degree of customization. It now features a user-friendly Next.js web interface for configuration, Telegram login, and controlling the forwarding tasks, alongside its existing CLI capabilities.

Core functionalities include:
- Forwarding messages from any source (channels, groups, private chats if bot has access) to any destination.
- **Live mode:** Forwards new messages as they arrive.
- **Past mode:** Forwards all existing messages from sources.
- Rich plugin system for filtering, formatting, watermarking, OCR, text replacement, and more.
- API-driven control for starting/stopping forwarding tasks and managing configurations.

## Features

`tgcf` is designed to be easy to get started with, yet powerful enough for complex forwarding needs:

- **Flexible Forwarding:**
    - Forward messages from multiple sources to multiple destinations.
    - Control message flow with **live** (new messages) and **past** (all existing messages) modes.
- **Web User Interface:**
    - Modern Next.js UI for easy configuration of all aspects of `tgcf`.
    - Secure Telegram login flow (API ID/Hash + Phone + Code/Password) managed via the UI.
    - Start, stop, and monitor `tgcf` tasks directly from your browser.
- **Powerful Plugin System:**
    - **Filter:** Blacklist or whitelist messages based on text patterns (including regex), media type, user ID, and more.
    - **Format:** Style message text using Markdown-like syntax (bold, italics, code, strike).
    - **Replace:** Modify text content using simple string replacements or powerful regular expressions.
    - **Caption:** Add custom headers or footers to messages.
    - **Mark (Watermark):** Apply image watermarks to photos and videos (video watermarking requires FFmpeg).
    - **OCR:** Perform Optical Character Recognition on images to extract text (requires Tesseract OCR).
    - **Sender:** Customize the sender of messages by using different bot tokens for specific forwards (via API/config).
- **Cross-Platform:**
    - Runs on any platform where Node.js can be installed (Linux, macOS, Windows).
    - Docker support for containerized deployments (currently focuses on running the backend API).
- **API & CLI Control:**
    - In addition to the Web UI, control `tgcf` tasks (start/stop/status) via a backend Express.js API.
    - Retains CLI functionality for direct server-side operations.
- **Free and Open Source:** Licensed under MIT. Contributions and feature sponsorships are welcome!

## Prerequisites

To run `tgcf`, you'll need:

*   **Node.js:** Version 18 or higher is recommended (as used in the Dockerfile).
*   **npm:** Comes bundled with Node.js (used for dependency management).
*   **FFmpeg:** (Optional) Required only if you plan to use video watermarking features of the "mark" plugin. Download from [FFmpeg.org](https://ffmpeg.org/download.html).
*   **Tesseract OCR & Language Data:** (Optional) Required only if using the "ocr" plugin. `tesseract.js` will attempt to download language data automatically. Ensure your environment allows this, or pre-install language data if needed.

## Installation

The project is now a monorepo-like structure with a Node.js backend and a Next.js frontend in the `web/` directory.

**1. Clone the Repository:**
```bash
git clone https://github.com/Lucifer-00007/tgcf-main.git
cd tgcf-main
```

**2. Backend (API Server) Setup:**
Located in the root directory.
```bash
# Install backend dependencies
npm install

# Build the backend (compile TypeScript)
npm run build
```

**3. Frontend (Next.js Web UI) Setup:**
Located in the `web/` directory.
```bash
cd web

# Install frontend dependencies
npm install

# Note: `npm run build` for the frontend is typically for production deployment.
# For development, you'll use `npm run dev` as shown in the "Running" section.
cd .. 
```

## Configuration

`tgcf` uses a `tgcf_config.json` file located in the root directory of the project for its main configuration. This file can be managed via the Web UI or edited manually.

**Initial Setup via Web UI:**
It's recommended to use the Web UI for initial setup and configuration after starting the backend and frontend servers (see "Running the Application" below). The UI will guide you through Telegram login (which populates API ID, Hash, and session string if using user mode) and other settings.

**Manual `tgcf_config.json` (Example):**
If you prefer manual setup or need to pre-configure:
1.  Create `tgcf_config.json` in the project root.
2.  Populate it. Here’s a structure guide:

    ```json
    {
      "login": {
        "API_ID": null,        // Your Telegram API ID (number) - Can be set via UI
        "API_HASH": null,      // Your Telegram API Hash (string) - Can be set via UI
        "BOT_TOKEN": null,     // Your Telegram Bot Token (string, if using bot mode)
        "SESSION_STRING": null // Session string (if using user mode, typically set via UI login)
        // user_type: 0 for bot, 1 for user (often managed by login flow)
      },
      "admins": [], // Array of admin user IDs (numbers) or usernames (strings)
      "forwards": [
        {
          "con_name": "MyFirstForward",
          "use_this": true,
          "source": "source_chat_id_or_username", // e.g., -100123456789 or "my_channel"
          "dest": ["destination_chat_id_or_username"], // Array of chat IDs/usernames
          "offset": 0, // Optional: Start forwarding from this message ID (past mode)
          "end": null    // Optional: Stop forwarding before this message ID (past mode)
        }
      ],
      "show_forwarded_from": false,
      "mode": 0, // 0 for live, 1 for past (global default, can be overridden by API calls)
      "live": {
        "delete_sync": false,
        "sequential_updates": false,
        "delete_on_edit": null // e.g., ".deleteMe" or null
      },
      "past": {
        "delay": 1000 // Delay in milliseconds between messages
      },
      "theme": "dark", // UI theme preference
      "bot_messages": {
        "start": "Welcome to tgcf!",
        "bot_help": "tgcf: Advanced Telegram Forwarding. Configure via Web UI."
      },
      "plugins": { // Enable/disable and configure plugins
        "filter": { "check": false, "users": {}, "files": {}, "text": {} },
        "fmt": { "check": false, "style": "preserve" },
        "replace": { "check": false, "text": {}, "text_raw": "", "regex": false },
        "caption": { "check": false, "header": "", "footer": "" },
        "mark": { "check": false, "image": "path/to/watermark.png", "position": "C", "frame_rate": 15 },
        "ocr": { "check": false },
        "sender": { "check": false, "user_type": 0, "BOT_TOKEN": "" }
      }
    }
    ```
    *   For detailed plugin configurations, refer to `src/plugin_models.ts`.
    *   For `API_ID` and `API_HASH`, get them from [my.telegram.org](https://my.telegram.org/apps).

**Environment Variables:**
*   `PORT`: Port for the backend API server (defaults to 3000 if not set).
*   `API_ID`, `API_HASH`: Can be set as environment variables (will be overridden by `tgcf_config.json` if present there).
*   `MONGO_CON_STR`: MongoDB connection string (if using MongoDB for config storage).
*   `MONGO_DB_NAME`: MongoDB database name (default: `tgcf-config`).
*   `MONGO_COL_NAME`: MongoDB collection name (default: `tgcf-instance-0`).
*   `TESSERACT_DEBUG=true`: Enable verbose logging from Tesseract.js for the OCR plugin.

## Running the Application

**1. Backend API Server:**
Navigate to the project root directory.
```bash
# Ensure you've built the backend first (npm run build)
npm start
```
This starts the Express.js API server. By default, it listens on port 3000 (or the `PORT` environment variable).

**2. Frontend Web UI:**
Open a new terminal, navigate to the `web/` directory.
```bash
cd web
npm run dev
```
This starts the Next.js development server, typically on `http://localhost:3001` (it will indicate the port if 3001 is taken).

**3. Accessing the UI:**
Open your browser and go to the URL provided by the Next.js development server (e.g., `http://localhost:3001`).
From the UI, you can:
- Log in to Telegram (this will populate `API_ID`, `API_HASH`, and potentially `SESSION_STRING` in your backend's `tgcf_config.json`).
- Manage all configurations (Admins, Connections, Plugins, Advanced Settings).
- Start and stop `tgcf` in live or past modes and monitor its status.

**4. CLI Mode (Optional):**
The application still supports direct CLI operations from the root directory (after `npm install` and `npm run build`):
```bash
# Start in live mode
npm start live

# Start in past mode
npm start past
```
When using CLI mode, ensure `tgcf_config.json` is properly configured, especially the `login` section.

## Using the Web UI

The Web UI provides a comprehensive interface for managing `tgcf`:

- **Welcome Page:** Provides an overview and links.
- **Login Page:** Securely log in to your Telegram account (Bot or User). This step is crucial for `tgcf` to interact with Telegram. Your `API_ID` and `API_HASH` will be saved to `tgcf_config.json` after successful login.
- **Configuration Pages (Admins, Connections, Plugins, Advanced):**
    - **Admins:** Manage a list of Telegram user IDs/usernames that have administrative privileges over `tgcf` (e.g., for bot commands, if implemented).
    - **Connections:** Define forwarding rules: source chats, destination chats, and specific options like message offset or end points for past mode.
    - **Plugins:** Enable, disable, and configure individual plugins like Filter, Caption, Mark (Watermark), Replace, etc.
    - **Advanced:** Manage general settings like operation mode (live/past default), message display options, and custom bot messages.
- **Run Page:**
    - Start `tgcf` in "Live" or "Past" mode.
    - Stop the currently running `tgcf` task.
    - View the real-time status and logs/messages from the backend.

**Important:** Always save your changes on each configuration page using the provided "Save" buttons.

## Plugin Information

Plugins allow you to customize how messages are handled. They are configured in the "Plugins" section of the Web UI or directly in `tgcf_config.json` under the `plugins` key.

Each plugin typically has a `check: true/false` field to enable or disable it.

**Core Plugins:**
- **Filter (`filter`):** Filter messages by various criteria (text, user, file type).
- **Format (`fmt`):** Apply text formatting (bold, italics, etc.).
- **Replace (`replace`):** Perform text replacements using simple or regex patterns.
- **Caption (`caption`):** Add headers/footers to messages.
- **Mark (`mark`):** Add watermarks to images/videos.
- **OCR (`ocr`):** Extract text from images.
- **Sender (`sender`):** Override the sending client for specific forwards (e.g., use a different bot token).

Refer to the UI and `src/plugin_models.ts` for detailed configuration options for each plugin.

## Docker

The provided `Dockerfile` is set up to build and run the Node.js backend API server.

**Build the Docker Image:**
```bash
docker build -t tgcf-node .
```

**Run the Docker Container:**
```bash
docker run -p 3000:3000 \
  -v $(pwd)/tgcf_config.json:/usr/src/app/tgcf_config.json \
  # Add other necessary volume mounts, e.g., for watermark images if using local paths
  # Example for watermark: -v $(pwd)/my_watermarks:/usr/src/app/my_watermarks \
  # Example for Tesseract data (if not fetching): -v /path/to/tessdata:/usr/share/tesseract-ocr/4.00/tessdata \
  # Pass environment variables if needed:
  # -e PORT=3000 \
  # -e API_ID="your_api_id" \
  # -e API_HASH="your_api_hash" \
  # -e MONGO_CON_STR="your_mongo_connection_string" \
  tgcf-node
```
- This command maps port 3000 on your host to port 3000 in the container.
- It mounts your local `tgcf_config.json` into the container. **Make sure this file exists and is configured.**
- If using plugins like "mark" with local image paths, you'll need to mount those paths into the container as well and ensure the paths in your config match the container paths.

**Note:** The Dockerfile currently only runs the backend. To run the full application (backend + Web UI) with Docker, you would typically:
1.  Build the Next.js UI separately (`cd web && npm run build`).
2.  Modify the Dockerfile to copy the built Next.js static assets (`web/.next/standalone` or `web/out`) into the container and serve them (e.g., using Express static middleware or a multi-stage Docker build with a web server like Nginx). This setup is not yet implemented in the current Dockerfile.
3.  Alternatively, run the backend and frontend in separate containers managed by Docker Compose.

## Deployment to Cloud

- **Backend API (Node.js/Express):**
    - Can be deployed to any platform supporting Node.js (e.g., AWS EC2, Google Cloud Run, DigitalOcean App Platform, Heroku with Node.js buildpack, VPS).
    - Ensure the environment has Node.js, npm, and any runtime dependencies like FFmpeg or Tesseract if those plugins are used.
    - Manage `tgcf_config.json` via mounted volumes, environment variables, or a database connection.
- **Frontend Web UI (Next.js):**
    - Can be deployed to platforms like Vercel (recommended for Next.js), Netlify, AWS Amplify, Google Firebase Hosting, or as a static site on various services after running `npm run build` inside the `web/` directory.
    - The Next.js app will need to be configured to point to your deployed backend API URL if they are not served from the same domain (CORS might need configuration on the backend).

## Getting Help

- **Search Existing Issues/Discussions:** Use GitHub's search bar ("In this repository").
- **Ask a Question:** If your question isn't answered, start a new thread in the [Discussion forum](https://github.com/Lucifer-00007/tgcf-main/discussions/new).
- **Report Bugs / Request Features:** Use the [Issue Tracker](https://github.com/Lucifer-00007/tgcf-main/issues/new).

## Contributing

We welcome contributions!

1.  Fork the repository.
2.  Clone your fork: `git clone https://github.com/YOUR_USERNAME/tgcf-main.git`
3.  Create your feature branch: `git checkout -b my-new-feature`
4.  **Backend:**
    - Navigate to the root directory.
    - Install dependencies: `npm install`
    - Make changes in `src/`.
    - Build: `npm run build`
    - Lint: `npm run lint`
5.  **Frontend:**
    - Navigate to the `web/` directory.
    - Install dependencies: `npm install`
    - Make changes in `web/src/`.
    - Lint: `npm run lint` (or as configured in `web/package.json`)
6.  Commit your changes: `git commit -am 'Add some feature'`
7.  Push to the branch: `git push origin my-new-feature`
8.  Submit a Pull Request.

Financial contributions to support feature development are also appreciated.

---

*This README has been updated to reflect the project's transition to Node.js/TypeScript with a Next.js Web UI.*
