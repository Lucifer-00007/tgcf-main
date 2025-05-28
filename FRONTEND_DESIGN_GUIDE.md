# TGCF Next.js Frontend Design & API Interaction Guide (Phase 3.C)

This document provides a summary of the backend API, conceptual code skeletons for key Next.js UI components, and elaborations on frontend design aspects to guide the implementation of the `tgcf` control panel frontend.

## 1. Frontend-Backend API Interaction Summary

This section outlines the API contract between the Next.js frontend and the Node.js backend for `tgcf`.

**Base URL:** `/api` (e.g., `http://localhost:3000/api`)

**Authentication:** Most endpoints require a JWT Bearer token in the `Authorization` header.
`Authorization: Bearer <YOUR_JWT_TOKEN>`

---

### 1.1. Authentication (`/auth`)

#### 1.1.1. Login
*   **Endpoint:** `POST /auth/login`
*   **Purpose:** Authenticates an admin user.
*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com", // or "username": "admin_user"
      "password": "your_password"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
      "token": "jwt.token.string",
      "userDetails": {
        "id": "mongodb_object_id",
        "email": "user@example.com",
        "username": "admin_user"
        // any other user fields from the User model
      }
    }
    ```
*   **Response (Error 400/401):**
    ```json
    {
      "message": "Invalid credentials" // or other error messages
    }
    ```

#### 1.1.2. Register (Optional)
*   **Endpoint:** `POST /auth/register`
*   **Purpose:** Registers a new admin user.
*   **Authentication:** None required (or could be admin-protected).
*   **Request Body:**
    ```json
    {
      "email": "newuser@example.com",
      "username": "new_admin",
      "password": "new_password"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
      "message": "User registered successfully",
      "userId": "mongodb_object_id"
    }
    ```
*   **Response (Error 400):**
    ```json
    {
      "message": "User already exists" // or validation errors
    }
    ```

#### 1.1.3. Get Current User
*   **Endpoint:** `GET /auth/me`
*   **Purpose:** Retrieves details of the currently authenticated admin user.
*   **Authentication:** JWT Token required.
*   **Request Body:** None.
*   **Response (Success 200):**
    ```json
    {
      "id": "mongodb_object_id",
      "email": "user@example.com",
      "username": "admin_user"
      // any other user fields
    }
    ```
*   **Response (Error 401):** Unauthorized.

---

### 1.2. Telegram Session Management (`/telegram`)

All endpoints in this section require JWT Token authentication.

#### 1.2.1. Initiate Connection
*   **Endpoint:** `POST /telegram/connect`
*   **Purpose:** Starts the Telegram client connection process.
*   **Request Body:**
    ```json
    {
      "apiId": "your_api_id",
      "apiHash": "your_api_hash",
      "phoneNumber": "+12345678900",
      "sessionName": "default" // Optional, defaults to 'default'
    }
    ```
*   **Response (Success 200, code needed):**
    ```json
    {
      "status": "code_required",
      "message": "Phone code has been sent.",
      "phoneCodeHash": "some_hash_from_telegram"
    }
    ```
*   **Response (Success 200, already connected):**
    ```json
    {
      "status": "already_connected",
      "message": "Client is already connected."
    }
    ```

#### 1.2.2. Submit Login Code
*   **Endpoint:** `POST /telegram/submit-code`
*   **Purpose:** Submits the login code received on Telegram.
*   **Request Body:**
    ```json
    {
      "code": "12345",
      "phoneNumber": "+12345678900",
      "phoneCodeHash": "the_hash_from_connect_response",
      "sessionName": "default" // Optional
    }
    ```
*   **Response (Success 200, connected / password needed):** (Refer to previous detailed API summary for full structure)

#### 1.2.3. Submit 2FA Password
*   **Endpoint:** `POST /telegram/submit-password`
*   **Purpose:** Submits the Two-Factor Authentication password.
*   **Request Body:**
    ```json
    {
      "password": "your_2fa_password",
      "sessionName": "default" // Optional
    }
    ```
*   **Response (Success 200, connected):** (Refer to previous detailed API summary)

#### 1.2.4. Get Connection Status
*   **Endpoint:** `GET /telegram/status`
*   **Purpose:** Checks current Telegram connection status.
*   **Query Parameters:** `sessionName` (optional).
*   **Response (Success 200):** (Refer to previous detailed API summary)

#### 1.2.5. Disconnect Session
*   **Endpoint:** `POST /telegram/disconnect`
*   **Purpose:** Disconnects Telegram client.
*   **Request Body:** `{ "sessionName": "default" }` (Optional)
*   **Response (Success 200):** (Refer to previous detailed API summary)

---

### 1.3. Configuration Management

All endpoints require JWT Token authentication.

#### 1.3.1. Get Main Configuration
*   **Endpoint:** `GET /config`
*   **Response (Success 200):** Full `MainConfig` object. (Refer to previous detailed API summary for structure: forwards, mode, plugin_configs, etc.)

#### 1.3.2. Update Main Configuration
*   **Endpoint:** `PUT /config`
*   **Request Body:** Complete `MainConfig` object.
*   **Response (Success 200):** Confirmation and updated `MainConfig`.

#### 1.3.3. List Available Plugins
*   **Endpoint:** `GET /plugins`
*   **Response (Success 200):** Array of `PluginDefinition` objects (id, name, description, configSchema).

#### 1.3.4. Get Saved Plugin Settings
*   **Endpoint:** `GET /plugins/settings`
*   **Response (Success 200):** Object map `{[pluginId: string]: any}`.

#### 1.3.5. Update Plugin Settings
*   **Endpoint:** `PUT /plugins/settings`
*   **Request Body:** Object map `{[pluginId: string]: any}`.
*   **Response (Success 200):** Confirmation and updated settings map.

---

### 1.4. Core TGCF Control (`/tgcf`)

All endpoints require JWT Token authentication.

#### 1.4.1. Start TGCF Service
*   **Endpoint:** `POST /tgcf/start`
*   **Request Body (Optional):** `{ "mode": "live" | "past" }`
*   **Response (Success 200):** Confirmation.

#### 1.4.2. Stop TGCF Service
*   **Endpoint:** `POST /tgcf/stop`
*   **Response (Success 200):** Confirmation.

#### 1.4.3. Get TGCF Status
*   **Endpoint:** `GET /tgcf/status`
*   **Response (Success 200):** `TgcfOperationStatus` object (isRunning, currentMode, logs, stats).

---

## 2. Key UI Component Skeletons

This section provides conceptual TypeScript/React skeletons. For full detailed code, please refer to the output of the plan step "Provide Code Skeletons for Key UI Components."

### 2.1. API Client (`src/lib/apiClient.ts`)
```typescript
// Summary:
// import axios from 'axios';
// const apiClient = axios.create({ baseURL: '/api' });
// Interceptors for JWT and global error handling.
// Exported functions for each API endpoint:
//   login(credentials), getMe(),
//   connectTelegram(data), submitTelegramCode(data), submitTelegramPassword(data), getTelegramStatus(sessionName?), disconnectTelegram(sessionName?),
//   getMainConfig(), updateMainConfig(configData),
//   listAvailablePlugins(), getPluginSettings(), updatePluginSettings(settingsData),
//   startTgcf(mode?), stopTgcf(), getTgcfStatus()
// export default apiClient;

2.2. Auth Context/Service (e.g., src/contexts/AuthContext.tsx)

// Summary:
// React Context for global auth state.
// Manages user object, isAuthenticated flag.
// Provides login() and logout() methods.
// Checks localStorage for JWT on initial load.
// Interacts with apiClient.

2.3. TelegramConnectionForm.tsx (Conceptual)

// Summary:
// Multi-step form for Telegram connection.
// Handles API ID/Hash/Phone input.
// Handles code submission.
// Handles 2FA password submission.
// Calls relevant apiClient methods.

2.4. ForwardRuleForm.tsx (Conceptual)

// Summary:
// Form for adding/editing a forward rule.
// Inputs for source, destinations, connection name, etc.
// Constructs new/updated rule object.
// Calls onSave prop with the entire updated config.forwards array.

2.5. PluginConfigFormRenderer.tsx (Conceptual)

// Summary:
// Dynamically renders a form based on a JSON schema for plugin configuration.
// Manages form state based on current plugin settings.
// Submits updated settings for a specific plugin.
// Could use a library like react-jsonschema-form.

3. Elaborations on Specific Frontend Design Aspects

(This section would contain any detailed explanations or conceptual code requested by you for specific frontend design aspects. As no specific elaborations were requested in the previous step, this section is a placeholder.)

    - Example Topic: State Management for Forms
        For complex forms like ForwardRuleForm or dynamic forms in PluginConfigFormRenderer, using a library like react-hook-form or Formik is highly recommended. They help with managing form state, validation (e.g., with Yup or Zod), and submission handling, reducing boilerplate.
    - Example Topic: Displaying API Errors
        A global error handling mechanism (perhaps in the AuthContext or a dedicated NotificationContext) can be used to display API errors as toasts or notifications. The apiClient.ts interceptor can dispatch errors to this global handler, or individual components can catch errors from API calls and display them locally or pass them to the global handler.
    - Example Topic: Dynamic Form Generation from JSON Schema
        The PluginConfigFormRenderer would iterate over the properties of the plugin's configSchema. For each property, it would look at the type (e.g., 'string', 'boolean', 'number', 'array', 'object') and other attributes (enum, default, format) to decide which HTML input element or custom component to render. For 'array' of objects (like rules), it would need to render a list of sub-forms.
```

