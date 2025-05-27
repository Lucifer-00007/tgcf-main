"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WelcomePage;
const image_1 = __importDefault(require("next/image"));
const featuresMarkdown = `
- **Forward messages** from any source to any destination.
- Supports **live** (new messages) and **past** (all existing messages) modes.
- **Filter** messages based on text, media type, user ID, etc.
- **Format** message text using Markdown or HTML.
- Apply **watermarks** to images and videos.
- Perform **OCR** on images to extract text.
- **Replace** text content using simple or regex patterns.
- **Customize** message sender using bot tokens.
- **And much more!** Explore the plugins and configurations.
`;
// Basic function to convert simple markdown list to JSX
// This is a very simplified parser for this specific markdown content
function MarkdownToList({ content }) {
    const lines = content.trim().split('\n');
    return (<ul className="list-disc list-inside space-y-1 text-gray-300">
      {lines.map((line, index) => {
            // Remove leading list item marker and bold tags for simplicity here
            // A more robust solution would use a proper markdown parser library
            const cleanedLine = line.replace(/^- \*\*(.*?)\*\*/, '$1').replace(/^- (.*?)/, '$1');
            const parts = cleanedLine.split(/(\*\*.*?\*\*)/g); // Split by bold tags
            return (<li key={index}>
            {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
          </li>);
        })}
    </ul>);
}
function WelcomePage() {
    return (<div className="container mx-auto p-4">
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <image_1.default src="https://user-images.githubusercontent.com/66209958/115183360-3fa4d500-a0f9-11eb-9c0f-c5ed03a9ae17.png" alt="tgcf Logo" width={150} height={150} className="rounded-full mb-4" priority // Preload the logo as it's LCP
    />
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to tgcf 👋
          </h1>
          <p className="text-lg text-gray-400">
            The ultimate tool for Telegram content forwarding and manipulation.
          </p>
        </div>

        <div className="mb-8 p-4 bg-yellow-500 text-yellow-900 rounded-md shadow">
          <p className="font-semibold text-center">
            ⚠️ Please press Save after changing any config. (This will be relevant on configuration pages)
          </p>
        </div>
        
        <div className="bg-gray-700 p-6 rounded-lg shadow-inner">
          <details className="group">
            <summary className="text-xl font-semibold text-white cursor-pointer list-none group-open:mb-2">
              Features at a Glance ✨
            </summary>
            <div className="prose prose-invert max-w-none">
              <MarkdownToList content={featuresMarkdown}/>
            </div>
          </details>
        </div>

      </div>
    </div>);
}
