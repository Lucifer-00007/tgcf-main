# Roadmap: Refactoring tgcf from Python to Node.js & Next.js

**Project Goals:**

1.  **Backend:** Replace the Python backend of `tgcf` with a Node.js/Express/MongoDB backend, following the `davellanedam/node-express-mongodb-jwt-rest-api-skeleton` pattern.
2.  **Frontend:** Utilize your existing Next.js frontend to interact with the new Node.js backend.
3.  **Functionality:** Ensure core logic (message forwarding, filtering, configuration, etc.) and UI remain identical to the original Python version.
4.  **Cleanup:** Remove all Python code and unused files.

---

## Phase 1: Deep Dive into the Existing Python Application (`tgcf-main/main`)

*   **Objective:** Thoroughly understand the current Python application's features, logic, and data flow.
*   **Key Areas to Analyze:**
    *   **Core Logic:**
        *   `tgcf/main.py`, `tgcf/past.py`, `tgcf/live.py`
        *   Message fetching (sources) and sending (destinations).
        *   Handling of "past" vs. "live" messages.
        *   State management (e.g., tracking last processed message).
        *   Error handling and retry mechanisms.
    *   **Telegram Interaction (Telethon):**
        *   Authentication flow (API ID/hash, phone, 2FA, session management).
        *   Specific Telethon methods used.
    *   **Configuration:**
        *   `tgcf/config.py`, `default_config.ini`
        *   Configuration parameters.
        *   Loading, parsing, and access.
    *   **Plugin System:**
        *   `tgcf/plugins/`
        *   Discovery and loading.
        *   Plugin interface/API.
        *   Types of plugins and their logic.
        *   Plugin configuration management.
    *   **Admin/User Interface (Current state):**
        *   Configurable aspects via UI.
        *   Admin actions.
    *   **Utilities:**
        *   `tgcf/utils.py`
        *   Common helper functions needing Node.js equivalents.

---

## Phase 2: Design the Node.js Backend

*   **Objective:** Plan the architecture of the new Node.js backend.
*   **Steps & Considerations:**
    1.  **Setup Backend Project:**
        *   Use `davellanedam/node-express-mongodb-jwt-rest-api-skeleton` as a base.
        *   Familiarize with its structure: `routes`, `controllers`, `middlewares`, `models`, `services`, `config`.
    2.  **Choose Node.js Telegram Library:**
        *   **Recommended:** `gram.js` (similar to Telethon).
        *   Alternative: `Telegraf` (more bot-focused).
    3.  **API Endpoint Design:**
        *   **Authentication (JWT):**
            *   `POST /api/auth/login`
            *   `POST /api/auth/register` (optional)
            *   `GET /api/auth/me`
        *   **Telegram Session Management:**
            *   `POST /api/telegram/connect`
            *   `POST /api/telegram/submit-code`
            *   `POST /api/telegram/submit-password` (2FA)
            *   `GET /api/telegram/status`
            *   `POST /api/telegram/disconnect`
        *   **Configuration Management (MongoDB):**
            *   `GET /api/config` (fetch main config)
            *   `PUT /api/config` (update main config)
        *   **Plugin Configuration:**
            *   `GET /api/plugins` (list available plugins, schemas)
            *   `GET /api/config/plugins` (fetch plugin configs)
            *   `PUT /api/config/plugins` (update plugin configs)
        *   **Core `tgcf` Control:**
            *   `POST /api/tgcf/start`
            *   `POST /api/tgcf/stop`
            *   `GET /api/tgcf/status` (logs, stats)
    4.  **Database Schema (MongoDB via Mongoose):**
        *   **`User` model:** For UI admins (from skeleton).
        *   **`Config` model:** To store main `tgcf` configuration (sources, destinations, plugin settings).
        *   **`TelegramSession` model:** To store session strings, API ID/hash.
        *   **(Optional) `ProcessedMessages` model:** To persist last processed message IDs.
    5.  **Configuration Strategy (Node.js):**
        *   `.env` files for sensitive data (`dotenv` package).
        *   Application configuration managed via API & stored in MongoDB (with defaults in code).
    6.  **Plugin System in Node.js:**
        *   JS/TS modules in a `src/plugins` directory.
        *   Standardized plugin interface (e.g., `transform`, `filter` methods, `configSchema`).
        *   Dynamic loading and management by the main application.
    7.  **Background Tasks / Services:**
        *   Core message forwarding logic as Node.js services.
        *   Use `async/await` with the Telegram library.

---

## Phase 3: Implement the Node.js Backend

*   **Objective:** Write the Node.js code.
*   **Steps:**
    1.  **Setup Basic Skeleton:** Implement user authentication (JWT).
    2.  **Telegram Client Service (`telegram.service.js`):**
        *   Encapsulate `gram.js` (or chosen library) interactions.
        *   Implement connect, disconnect, code/password submission.
        *   Securely store/retrieve session strings (MongoDB).
        *   Methods for fetching/sending messages, getting chat info.
    3.  **Configuration Service & API:**
        *   Implement `Config` Mongoose model.
        *   Services and controllers for `/api/config` CRUD operations.
    4.  **Port Core Forwarding Logic:**
        *   Translate logic from Python's `past.py` and `live.py` to Node.js services.
        *   Utilize the Telegram Client Service.
        *   Manage asynchronous operations and state (last message ID).
    5.  **Port Plugins:**
        *   Create corresponding JS/TS modules for each Python plugin.
        *   Translate Python plugin logic.
        *   Ensure Node.js plugin service can load, configure, and execute them.
    6.  **Implement Control Endpoints:** `/api/tgcf/start`, `/api/tgcf/stop`, `/api/tgcf/status`.
    7.  **Error Handling & Logging:** Implement robust error handling and logging (e.g., `winston`, `pino`).

---

## Phase 4: Integrate Next.js Frontend

*   **Objective:** Connect the Next.js frontend to the new Node.js backend.
*   **Steps:**
    1.  **Update API Client (`src/app/lib/apiClient.ts`):**
        *   Point API calls to the new Node.js backend URLs.
        *   Adjust request/response structures if needed.
    2.  **Implement JWT Authentication Flow:**
        *   Store JWT tokens from `/api/auth/login`.
        *   Send JWT in `Authorization` header for protected requests.
        *   Handle token expiration/refresh.
    3.  **Adapt UI Components:**
        *   Ensure forms and displays match the new API.
        *   Thoroughly test all UI functionality.
    4.  **Type Definitions:** Update/create TypeScript interfaces in Next.js for API data structures.

---

## Phase 5: Testing & Refinement

*   **Objective:** Ensure system stability and correctness.
*   **Steps:**
    1.  **Unit Tests (Backend):** Test services, utilities, plugin logic (Jest, Mocha).
    2.  **Integration Tests (Backend):** Test API endpoints (Postman, automated tests).
    3.  **End-to-End Testing:** Test full UI-to-Telegram flow.
        *   Verify message forwarding with various configurations.
        *   Test configuration saving/loading.
        *   Test Telegram session handling.
    4.  **Performance Testing (Optional):** Basic load tests if performance is critical.
    5.  **Refactor and Optimize:** Improve code based on test results.

---

## Phase 6: Cleanup

*   **Objective:** Remove all obsolete Python code and unused files.
*   **Steps:**
    1.  **Backup:** Ensure a stable backup or version control commit.
    2.  **Delete Python Files & Artifacts:**
        *   `tgcf` directory.
        *   `default_config.ini`.
        *   Python-specific environment files (`requirements.txt`, virtual envs).
        *   Python build/run scripts.
    3.  **Remove Other Unused Files.**
    4.  **Update Documentation:**
        *   `README.md` and other docs to reflect the new Node.js + Next.js architecture.
        *   Include new setup and deployment instructions.

---

**Key Challenges & Considerations:**

*   **Translating Pythonic Logic:** Python's `asyncio` and Telethon specifics to Node.js `async/await` and `gram.js`.
*   **Telegram Library Differences:** Adapting to `gram.js` API and behavior.
*   **Plugin System Re-architecture:** Designing a robust plugin system in Node.js.
*   **State Management:** Ensuring correct state persistence (e.g., last processed messages).
*   **Time Commitment:** This is a large project; break it into smaller tasks.

**Recommended Tools & Technologies:**

*   **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT (`jsonwebtoken`), `gram.js`, `dotenv`, Logger (e.g., `winston`). (TypeScript highly recommended for backend).
*   **Frontend:** Next.js, React, TypeScript.
*   **Development:** Git.