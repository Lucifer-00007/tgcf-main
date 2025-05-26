<!-- markdownlint-disable -->

<p align="center">
<a href = "https://github.com/aahnik/tgcf" > <img src = "https://user-images.githubusercontent.com/66209958/115183360-3fa4d500-a0f9-11eb-9c0f-c5ed03a9ae17.png" alt = "tgcf logo"  width=120> </a>
</p>

<h1 align="center"> tgcf </h1>

<p align="center">
The ultimate tool to automate custom telegram message forwarding.
</p>

<p align="center">
<a href="https://github.com/aahnik/tgcf/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aahnik/tgcf" alt="GitHub license"></a>
<a href="https://github.com/aahnik/tgcf/stargazers"><img src="https://img.shields.io/github/stars/aahnik/tgcf?style=social" alt="GitHub stars"></a>
<a href="https://github.com/aahnik/tgcf/issues"><img src="https://img.shields.io/github/issues/aahnik/tgcf" alt="GitHub issues"></a>
<a href="https://twitter.com/intent/tweet?text=Wow:&amp;url=https%3A%2F%2Fgithub.com%2Faahnik%2Ftgcf"><img src="https://img.shields.io/twitter/url?style=social&amp;url=https%3A%2F%2Fgithub.com%2Faahnik%2Ftgcf" alt="Twitter"></a>
</p>
<p align="center">
<a href="https://github.com/aahnik/tgcf/actions/workflows/quality.yml"><img src="https://github.com/aahnik/tgcf/actions/workflows/quality.yml/badge.svg" alt="Code Quality"></a>
</p>

Live-syncer, Auto-poster, backup-bot, cloner, chat-forwarder, duplicator, ... Call it whatever you like! **tgcf** is an advanced telegram chat forwarding automation tool, now rewritten in Node.js/TypeScript, that can fulfill all your custom needs.


## Features

Extremely easy to get started yet ready for any complex task you throw at it.

- At its simple form, its just a **telegram message forwarder** that forwards your messages from source to destination chats.
- You can choose the mode: **past** for forward all old (existing messages) or **live** for start forwarding from now.
- Supports running with a Telegram Bot account. (Note: User account features from the Python version are not fully ported for all operations in this Node.js version).
- You can customize every detail of the forwarding with the help of plugins: **filter**(blacklist/whitelist), **format**(bold, italics, etc), **replace**(supports regex), **caption**(header/footer). You can even apply watermark to images/videos (video watermarking requires FFmpeg), or perform optical character recognition (ocr) on images (requires Tesseract language data).
- Detailed [**documentation**](https://github.com/aahnik/tgcf/wiki) (Note: Wiki may contain outdated information from the Python version) and [**videos**](https://www.youtube.com/playlist?list=PLSTrsq_DvEgisMG5BLUf97tp2DoAnwCMG) (from Python version) makes it easy for you to configure tgcf.
- Supported environments: Any platform where Node.js can run, including **Linux**, **Mac**, **Windows**. Docker support can be added.
- All these is **free and open source**. You may sponsor to accelerate the development of any new feature and get fast support over chat.

## Install and Run

**Prerequisites:**

*   Node.js (v16 or higher recommended)
*   npm (comes with Node.js)
*   FFmpeg: Required if you plan to use video watermarking features from the 'mark' plugin. (See [FFmpeg website](https://ffmpeg.org/download.html) for installation instructions).
*   Tesseract OCR Data: If using the 'ocr' plugin, `tesseract.js` will attempt to download language data. Ensure your environment can download these files or have them available.

**Installation:**

1.  Clone the repository:
    ```bash
    git clone https://github.com/aahnik/tgcf.git
    cd tgcf
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the TypeScript code:
    ```bash
    npm run build
    ```

**Configuration:**

`tgcf` uses a JSON file for configuration, by default named `tgcf_config.json` in the root directory. You can also use environment variables for database configuration (see below).

1.  Create `tgcf_config.json` in the root of the project.
2.  Populate it based on your needs. Here's a basic example structure:

    ```json
    {
      "login": {
        "BOT_TOKEN": "YOUR_TELEGRAM_BOT_TOKEN"
      },
      "forwards": [
        {
          "source": "source_chat_id_or_username",
          "dest": ["destination_chat_id_or_username"],
          "offset": 0 
        }
      ],
      "live": {
        "delete_sync": false
      },
      "past": {
        "delay": 1
      },
      "plugins": {
        "filter": { "check": false },
        "fmt": { "check": false },
        "replace": { "check": false },
        "caption": { "check": false },
        "mark": { "check": false, "image": "path/to/your/watermark.png" },
        "ocr": { "check": false },
        "sender": { "check": false }
      }
      // Add other configurations as needed based on src/config.ts and src/plugin_models.ts
    }
    ```
    *   Replace `"YOUR_TELEGRAM_BOT_TOKEN"`, source/destination chat IDs, and other values as needed.
    *   For detailed structure of `plugins` and other configurations, refer to the interfaces in `src/config.ts` and `src/plugin_models.ts`.

**Environment Variables (Optional - for MongoDB configuration):**

*   `MONGO_CON_STR`: Your MongoDB connection string.
*   `MONGO_DB_NAME`: MongoDB database name (defaults to "tgcf-config").
*   `MONGO_COL_NAME`: MongoDB collection name (defaults to "tgcf-instance-0").
*   `TESSERACT_DEBUG=true`: To enable verbose logging from Tesseract.js during OCR plugin initialization.

**Running `tgcf`:**

The main entry point is `src/main.ts`. After building, it will be in `dist/src/main.js`.
Make sure your `package.json`'s "scripts" section has a "start" script like:
`"start": "node dist/src/main.js"`

*   **Live Mode** (for new messages):
    ```bash
    npm start live 
    ```
*   **Past Mode** (for existing messages):
    ```bash
    npm start past
    ```

## Deploy to Cloud

Cloud deployment guides need to be updated for the Node.js version. Previous guides for Python are not directly applicable.
*   General guidance for Node.js deployment on platforms like Docker, Digital Ocean (Droplets/App Platform), AWS (EC2/Lambda), Google Cloud Run, etc., can be followed.
*   Ensure your chosen environment supports Node.js, FFmpeg (if needed), and can access Tesseract language data (if OCR is used).

## Getting Help

- First of all [read the wiki](https://github.com/aahnik/tgcf/wiki) (Note: The wiki is likely outdated and refers to the Python version. It will be updated over time).
- Type your question in GitHub's Search bar on the top left of this page,
  and click "In this repository".
  Go through the issues and discussions that appear in the result.
  Try re-wording your query a few times before you give up.
- If your question does not already exist,
  feel free to ask your questions in the
  [Discussion forum](https://github.com/aahnik/tgcf/discussions/new).
  Please avoid duplicates.
- For reporting bugs or requesting a new feature please use the [issue tracker](https://github.com/aahnik/tgcf/issues/new)
  of the repo.

## Contributing

PRs are most welcome! To get started:

1.  Fork the repository.
2.  Clone your fork: `git clone https://github.com/YOUR_USERNAME/tgcf.git`
3.  Create a new branch: `git checkout -b my-feature-branch`
4.  Install dependencies: `npm install`
5.  Make your changes. Ensure you build the TypeScript: `npm run build`
6.  Lint and format your code: `npm run lint` (or configure Prettier/ESLint in your editor).
7.  Commit your changes: `git commit -am 'Add some feature'`
8.  Push to the branch: `git push origin my-feature-branch`
9.  Submit a pull request.

If you are not a developer, you may also contribute financially to
incentivise the development of any custom feature you need.
