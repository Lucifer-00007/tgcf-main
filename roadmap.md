# Roadmap: Refactoring tgcf from Python to Node.js & Next.js

**Project Goals:**

1.  **Backend:** Replace the Python backend of `tgcf` with a Node.js/Express/MongoDB backend, following the `davellanedam/node-express-mongodb-jwt-rest-api-skeleton` pattern.
2.  **Frontend:** Utilize your existing Next.js frontend (or redesign/re-implement as needed) to interact with the new Node.js backend.
3.  **Functionality:** Ensure core logic (message forwarding, filtering, configuration, etc.) and UI remain identical to the original Python version or are enhanced as per new design.
4.  **Cleanup:** Remove all Python code and unused files.

---

## Phase 1: Deep Dive into the Existing Python Application (`tgcf-main/main`)

*   **Objective:** Thoroughly understand the current Python application's features, logic, data flow, and (if any) existing UI concepts.
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
    *   **User Interface (Current/Desired):**
        *   Identify all configurable aspects and user actions.
        *   Define the user experience for managing Telegram connections, configurations, plugins, and monitoring.
    *   **Utilities:**
        *   `tgcf/utils.py`
        *   Common helper functions needing Node.js equivalents.

---

## Phase 2: Design the Node.js Backend

*   **Objective:** Plan the architecture of the new Node.js backend and define its API contract.
*   **Steps & Considerations:**
    1.  **Setup Backend Project:**
        *   Use `davellanedam/node-express-mongodb-jwt-rest-api-skeleton` as a base.
        *   Familiarize with its structure: `routes`, `controllers`, `middlewares`, `models`, `services`, `config`.
    2.  **Choose Node.js Telegram Library:**
        *   **Recommended:** `gram.js` (similar to Telethon).
        *   Alternative: `Telegraf` (more bot-focused).
    3.  **API Endpoint Design (API Contract):**
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
            *   `GET /api/plugins` (list available plugins, schemas/docs for UI)
            *   `GET /api/config/plugins` (fetch plugin configs)
            *   `PUT /api/config/plugins` (update plugin configs)
        *   **Core `tgcf` Control:**
            *   `POST /api/tgcf/start`
            *   `POST /api/tgcf/stop`
            *   `GET /api/tgcf/status` (logs, stats, current running state)
        *   **Define request/response schemas for all endpoints (this is crucial for frontend development).**
    4.  **Database Schema (MongoDB via Mongoose):**
        *   **`User` model:** For UI admins (from skeleton).
        *   **`Config` model:** To store main `tgcf` configuration.
        *   **`TelegramSession` model:** To store session strings, API ID/hash.
        *   **(Optional) `ProcessedMessages` model:** To persist last processed message IDs.
    5.  **Configuration Strategy (Node.js):**
        *   `.env` files for sensitive data (`dotenv` package).
        *   Application configuration managed via API & stored in MongoDB.
    6.  **Plugin System in Node.js:**
        *   JS/TS modules in a `src/plugins` directory.
        *   Standardized plugin interface (e.g., `transform`, `filter` methods, `configSchema`).
        *   Dynamic loading and management.
    7.  **Background Tasks / Services:**
        *   Core message forwarding logic as Node.js services.
        *   Use `async/await` with the Telegram library.

---

## Phase 3: Backend & Frontend Implementation (Iterative/Parallel)

### Phase 3.A: Implement the Node.js Backend

*   **Objective:** Write the Node.js code based on the design and API contract.
*   **Steps:**
    1.  **Setup Basic Skeleton & Auth:** Implement user authentication (JWT).
    2.  **Telegram Client Service (`telegram.service.js`):**
        *   Encapsulate `gram.js` interactions.
        *   Implement connection, session management, message operations.
    3.  **Configuration Service & API:**
        *   Implement `Config` Mongoose model.
        *   Services and controllers for `/api/config` and `/api/config/plugins` CRUD.
    4.  **Port Core Forwarding Logic:**
        *   Translate Python's `past.py` and `live.py` logic.
        *   Integrate with Telegram Client Service and Config service.
    5.  **Port/Develop Plugins:**
        *   Create corresponding JS/TS modules.
        *   Translate/implement plugin logic.
    6.  **Implement Control & Status Endpoints:** `/api/tgcf/start`, `/api/tgcf/stop`, `/api/tgcf/status`.
    7.  **Error Handling & Logging:** Implement robust mechanisms.
    8.  **(Crucial) Mock API (Optional but Recommended):** If backend development is slower, provide a mock API server (e.g., using `msw` or a simple Express app) based on the defined API contract for the frontend team to start working against.

### Phase 3.B: Design the Next.js Frontend

*   **Objective:** Plan the user interface and user experience for the Next.js application.
*   **Steps:**
    1.  **Review Existing Frontend (if applicable):** Assess what from `feat/nodejs-nextjs-migration` can be reused, needs refactoring, or should be redesigned.
    2.  **Define User Flows:** Map out how users will perform key tasks:
        *   Login/Authentication.
        *   Connecting/Managing Telegram account(s).
        *   Viewing/Editing main configuration (sources, destinations, global settings).
        *   Discovering, enabling, and configuring plugins.
        *   Starting/Stopping the forwarding service.
        *   Monitoring status and viewing logs.
    3.  **Wireframes & Mockups:** Create visual representations of the UI screens and components.
        *   Focus on clarity, ease of use, and information hierarchy.
        *   Consider responsiveness for different screen sizes.
    4.  **Component Design:** Break down the UI into reusable React components.
        *   Define props and state for each component.
    5.  **State Management Strategy:** Choose a state management solution if needed beyond React's built-in hooks (e.g., Zustand, Jotai, Redux Toolkit for more complex global state).
    6.  **Routing:** Define the page structure and navigation using Next.js routing.
    7.  **Accessibility (A11y):** Keep accessibility principles in mind during design.

### Phase 3.C: Implement the Next.js Frontend

*   **Objective:** Build the Next.js application based on the frontend design and backend API contract.
*   **Steps:**
    1.  **Setup Project Structure:** Organize components, pages, services, styles, etc.
    2.  **Build UI Components:** Implement the React components designed in Phase 3.B.
    3.  **Implement Routing & Page Layouts.**
    4.  **API Client Integration (`src/app/lib/apiClient.ts` or similar):**
        *   Implement functions to call all defined backend API endpoints.
        *   Handle API responses, errors, and loading states.
    5.  **Implement Authentication Flow:**
        *   Login forms, JWT storage, protected routes/components.
    6.  **Develop Feature Pages:**
        *   Telegram connection management UI.
        *   Configuration editing forms.
        *   Plugin management interface.
        *   Control panel for starting/stopping/status.
    7.  **Implement State Management:** Connect components to global/local state as needed.
    8.  **Styling:** Apply CSS (e.g., Tailwind CSS, CSS Modules, Styled Components).
    9.  **Form Handling & Validation:** Implement robust form handling.
    10. **Type Definitions:** Use/create TypeScript interfaces for API data and component props.

---

## Phase 4: Integration, Testing & Refinement

*   **Objective:** Connect backend and frontend, ensure system stability and correctness.
*   **Steps:**
    1.  **Full Backend-Frontend Integration:** Ensure all frontend API calls correctly interact with the live backend.
    2.  **Unit Tests:**
        *   **Backend:** Test services, utilities, plugin logic (Jest, Mocha).
        *   **Frontend:** Test individual React components and utility functions (Jest, React Testing Library).
    3.  **Integration Tests:**
        *   **Backend:** Test API endpoints (Postman, automated tests).
        *   **Frontend:** Test user flows involving multiple components and API interactions.
    4.  **End-to-End Testing:** Test the full UI-to-Telegram flow.
        *   Verify message forwarding with various configurations set via the UI.
        *   Test configuration saving/loading via UI.
        *   Test Telegram session handling via UI.
    5.  **User Acceptance Testing (UAT) (Optional):** If possible, get feedback from potential users.
    6.  **Performance Testing (Optional):** Basic load tests if performance is critical.
    7.  **Refactor and Optimize:** Improve code based on test results and feedback for clarity, performance, and robustness. Address any bugs found.

---

## Phase 5: Cleanup & Documentation

*   **Objective:** Remove all obsolete Python code and finalize project documentation.
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
        *   Include new setup, configuration, and deployment instructions for both backend and frontend.
        *   Document API endpoints if not done via Swagger/OpenAPI.

---

**Key Challenges & Considerations:**

*   **Translating Pythonic Logic:** Python's `asyncio` and Telethon specifics to Node.js `async/await` and `gram.js`.
*   **Telegram Library Differences:** Adapting to `gram.js` API and behavior.
*   **Plugin System Re-architecture:** Designing a robust plugin system in Node.js.
*   **State Management (Backend & Frontend):** Ensuring correct state persistence and UI updates.
*   **API Contract Stability:** Maintaining a stable API contract between backend and frontend is crucial, especially if developed in parallel.
*   **Time Commitment:** This is a large project; break it into smaller tasks.

**Recommended Tools & Technologies:**

*   **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT (`jsonwebtoken`), `gram.js`, `dotenv`, Logger (e.g., `winston`). (TypeScript highly recommended).
*   **Frontend:** Next.js, React, TypeScript, State Management (e.g., Zustand, Jotai), Styling (e.g., Tailwind CSS).
*   **Development:** Git.
*   **API Documentation/Mocking (Optional):** Swagger/OpenAPI, MSW (Mock Service Worker).