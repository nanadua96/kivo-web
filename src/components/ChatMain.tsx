"use client";

import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSidebar } from "@/store";
import { useMessages } from "@/store/message.store";
import styles from "./ChatMain.module.css";
import Markdown, { ThinkingIndicator } from "./Markdown";

type Props = {
  className?: string;
};

type SelectedAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

type MessageAttachment = {
  name: string;
  type: string;
  content?: string;
  data?: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  text: string;
  createdAt: string;
  rating?: string;
  attachments?: MessageAttachment[];
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  text: string;
  timestamp?: string;
  rating?: string;
  attachments?: MessageAttachment[];
};

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 1024 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
  "c",
  "cpp",
  "css",
  "csv",
  "h",
  "html",
  "java",
  "js",
  "jsx",
  "json",
  "log",
  "md",
  "py",
  "sh",
  "sql",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

function isTextFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type.startsWith("text/") || TEXT_FILE_EXTENSIONS.has(extension ?? "")
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function ChatMain({ className }: Props) {
  // =============================
  // SIDEBAR
  // =============================
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const toggleAuthModal = useSidebar((state) => state.toggleAuthModal);

  const messages = useMessages((state) => state.messages);
  const addMessages = useMessages((state) => state.addMessages);
  const addMessage = useMessages((state) => state.addMessage);
  const updateMessage = useMessages((state) => state.updateMessage);

  console.log("📀 Messages:", messages);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");

  const [selectedAttachments, setSelectedAttachments] = useState<
    SelectedAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState("");

  const isInputEmpty =
    input.trim().length === 0 && selectedAttachments.length === 0;

  const selectedAttachmentsRef = useRef<SelectedAttachment[]>([]);

  useEffect(() => {
    selectedAttachmentsRef.current = selectedAttachments;
  }, [selectedAttachments]);

  useEffect(
    () => () => {
      selectedAttachmentsRef.current.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    },
    [],
  );

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  const [chatId, setChatId] = useState("new");

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  ////////////////////////////////////////////////////////! MESSAGE LOGIC
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
      alert("Copied!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
  ////////////////////////////////////////////////////////! MESSAGE LOGIC

  const rateMessageMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: "up" | "down" }) =>
      api.post(`/api/messages/${id}/feedback`, { data: { rating } }),

    //! OTHERS

    onSuccess() {
      console.log("rate message success");
    },
  });

  async function rateMessage() {}

  const [isStreaming, setIsStreaming] = useState(false);

  function foo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    addMessages([
      {
        role: "user",
        content: "What is JavaScript?",
      },
      {
        role: "assistant",
        content:
          "**JavaScript** is a high‑level, interpreted programming language that is primarily used to create interactive and dynamic behavior on web pages. Here are the key points that define what JavaScript is and how it works:\n\n| Aspect | Description |\n|--------|-------------|\n| **Purpose** | Adds interactivity to HTML/CSS (e.g., animations, form validation, content updates without reloading). |\n| **Execution environment** | Runs in web browsers (Chrome, Firefox, Safari, Edge) and on servers via **Node.js**. |\n| **Type system** | Dynamically typed, weakly typed (variables can hold any type, and type coercion occurs). |\n| **Paradigms** | Supports procedural, object‑oriented, and functional programming styles. |\n| **Standard** | Defined by the **ECMAScript** specification (latest edition: ECMAScript 2024). |\n| **Modules** | Native ES modules (`import`/`export`) and CommonJS (`require`) in Node.js. |\n| **Asynchronous model** | Event loop with **callbacks**, **Promises**, and **async/await** for non‑blocking I/O. |\n| **Core APIs** | DOM manipulation, fetch/XHR, Web Storage, Web Workers, Canvas, WebGL, etc. |\n| **Tooling** | Transpilers (Babel, TypeScript), bundlers (Webpack, Rollup, Vite), linters (ESLint), testing frameworks (Jest, Mocha). |\n| **Ecosystem** | Millions of packages on **npm**; integrates with front‑end frameworks (React, Vue, Angular) and back‑end frameworks (Express, NestJS). |\n\n### A Quick Example\n```js\n// Change the text of a button when it is clicked\ndocument.querySelector('button').addEventListener('click', () => {\n  alert('You clicked me!');\n});\n```\n* The code runs in the browser, accesses the DOM (`document.querySelector`), registers an event listener, and shows an alert when the button is clicked.\n\n### Why “JavaScript” and Not “Java”?\n- **Historical branding:** When Netscape first released the language (1995) they named it “LiveScript.” To ride the popularity wave of Java, they renamed it **JavaScript**, even though the two languages are unrelated.\n- **Different syntax & runtime:** Java is a statically‑typed, compiled language; JavaScript is interpreted (or JIT‑compiled) and dynamically typed.\n\n### Modern Evolution\n- **ECMAScript 2015 (ES6)** introduced `let`/`const`, arrow functions, classes, template literals, modules, etc.\n- Subsequent yearly releases (ES7‑ES2024) keep adding features like optional chaining, nullish coalescing, top‑level await, and new built‑ins.\n- **TypeScript** (a superset of JavaScript with static typing) has become the de‑facto way to write large‑scale JavaScript projects.\n\n### Bottom Line\nJavaScript is the **lingua franca of the web**, enabling developers to build everything from simple interactive widgets to full‑stack applications that run both in the browser and on the server. Its flexibility, massive ecosystem, and continuous evolution make it one of the most widely used programming languages today.",
      },
      {
        role: "user",
        content: "Give me a smple calculator app in JS",
      },
      {
        role: "assistant",
        content:
          "Below is a **complete, minimal‑style calculator** that runs entirely in the browser.  \nIt consists of three files (you can also paste everything into a single HTML file if you prefer):\n\n| File | Purpose |\n|------|---------|\n| `index.html` | Mark‑up – the calculator UI |\n| `style.css`   | Simple styling to make it look decent |\n| `app.js`      | JavaScript – the logic that does the calculations |\n\n---\n\n## 1️⃣ `index.html`\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Simple JS Calculator</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <div class=\"calculator\">\n    <input type=\"text\" id=\"display\" readonly>\n\n    <div class=\"buttons\">\n      <!-- Row 1 -->\n      <button class=\"op\" data-op=\"C\">C</button>\n      <button class=\"op\" data-op=\"+/-\">±</button>\n      <button class=\"op\" data-op=\"%\">%</button>\n      <button class=\"op\" data-op=\"/\">÷</button>\n\n      <!-- Row 2 -->\n      <button class=\"num\">7</button>\n      <button class=\"num\">8</button>\n      <button class=\"num\">9</button>\n      <button class=\"op\" data-op=\"*\">×</button>\n\n      <!-- Row 3 -->\n      <button class=\"num\">4</button>\n      <button class=\"num\">5</button>\n      <button class=\"num\">6</button>\n      <button class=\"op\" data-op=\"-\">‑</button>\n\n      <!-- Row 4 -->\n      <button class=\"num\">1</button>\n      <button class=\"num\">2</button>\n      <button class=\"num\">3</button>\n      <button class=\"op\" data-op=\"+\">+</button>\n\n      <!-- Row 5 -->\n      <button class=\"num zero\">0</button>\n      <button class=\"num\">.</button>\n      <button class=\"equals\">=</button>\n    </div>\n  </div>\n\n  <script src=\"app.js\"></script>\n</body>\n</html>\n```\n\n*Key points*\n\n* The **display** is a read‑only `<input>` so the user cannot type directly (the calculator controls it).  \n* Buttons are grouped with classes: `num` for digits/decimal, `op` for operators, `equals` for `=` and a special `C` (clear) button.\n\n---\n\n## 2️⃣ `style.css`\n\n```css\n/* Basic reset */\n* { box-sizing: border-box; margin: 0; padding: 0; }\n\n/* Center the calculator */\nbody {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background: #f3f4f6;\n  font-family: Arial, Helvetica, sans-serif;\n}\n\n/* Calculator container */\n.calculator {\n  background: #222;\n  border-radius: 12px;\n  padding: 20px;\n  width: 320px;\n}\n\n/* Display */\n#display {\n  width: 100%;\n  height: 60px;\n  font-size: 2rem;\n  text-align: right;\n  margin-bottom: 15px;\n  border: none;\n  border-radius: 6px;\n  padding: 0 10px;\n  background: #111;\n  color: #fff;\n}\n\n/* Buttons grid */\n.buttons {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 10px;\n}\n\n/* General button style */\nbutton {\n  font-size: 1.4rem;\n  padding: 15px;\n  border: none;\n  border-radius: 6px;\n  cursor: pointer;\n  background: #333;\n  color: #fff;\n  transition: background 0.2s;\n}\n\n/* Hover effect */\nbutton:hover { background: #444; }\n\n/* Number buttons */\nbutton.num { background: #555; }\nbutton.num:hover { background: #666; }\n\n/* Zero button spans two columns */\nbutton.zero { grid-column: span 2; }\n\n/* Operator buttons */\nbutton.op   { background: #ff9500; }\nbutton.op:hover { background: #ffa733; }\n\n/* Equals button */\nbutton.equals {\n  background: #34c759;\n  grid-column: span 1;\n}\nbutton.equals:hover { background: #5ddc85; }\n```\n\nFeel free to tweak colors, fonts, or sizes to match your taste.\n\n---\n\n## 3️⃣ `app.js`\n\n```js\n// Grab elements\nconst display = document.getElementById('display');\nconst numButtons = document.querySelectorAll('button.num');\nconst opButtons = document.querySelectorAll('button.op');\nconst equalsBtn = document.querySelector('button.equals');\n\n// State variables\nlet operand1 = null;      // first number entered\nlet operand2 = null;      // second number (after operator)\nlet operator = null;      // '+', '-', '*', '/', '%'\nlet shouldResetDisplay = false; // flag to clear display on next digit\n\n// Helper: update the visual display\nfunction setDisplay(value) {\n  display.value = value;\n}\n\n// Helper: reset the whole calculator\nfunction clearAll() {\n  operand1 = operand2 = operator = null;\n  setDisplay('');\n  shouldResetDisplay = false;\n}\n\n// Number / decimal button click handler\nnumButtons.forEach(btn => {\n  btn.addEventListener('click', () => {\n    if (shouldResetDisplay) {\n      setDisplay('');\n      shouldResetDisplay = false;\n    }\n\n    // Prevent multiple leading zeros (e.g., \"00\")\n    if (display.value === '0' && btn.textContent !== '.') {\n      setDisplay(btn.textContent);\n      return;\n    }\n\n    // Prevent more than one decimal point\n    if (btn.textContent === '.' && display.value.includes('.')) return;\n\n    setDisplay(display.value + btn.textContent);\n  });\n});\n\n// Operator button click handler\nopButtons.forEach(btn => {\n  btn.addEventListener('click', () => {\n    const op = btn.dataset.op;\n\n    // Clear button\n    if (op === 'C') {\n      clearAll();\n      return;\n    }\n\n    // Sign‑change button (±)\n    if (op === '+/-') {\n      if (display.value) {\n        setDisplay(String(-parseFloat(display.value)));\n      }\n      return;\n    }\n\n    // Percentage button – treat as value / 100\n    if (op === '%') {\n      if (display.value) {\n        setDisplay(String(parseFloat(display.value) / 100));\n      }\n      return;\n    }\n\n    // If we already have a pending operation, compute it first\n    if (operator && !shouldResetDisplay) {\n      compute();\n    }\n\n    // Store the first operand and chosen operator\n    operand1 = parseFloat(display.value);\n    operator = op;\n    shouldResetDisplay = true;\n  });\n});\n\n// Equals button\nequalsBtn.addEventListener('click', compute);\n\n// Core calculation routine\nfunction compute() {\n  if (operator === null) return; // nothing to compute\n\n  operand2 = parseFloat(display.value);\n  let result;\n\n  switch (operator) {\n    case '+': result = operand1 + operand2; break;\n    case '-': result = operand1 - operand2; break;\n    case '*': result = operand1 * operand2; break;\n    case '/':\n      // Guard against division by zero\n      result = operand2 === 0 ? 'Error' : operand1 / operand2;\n      break;\n    default: return;\n  }\n\n  // Round to avoid long floating‑point tails (e.g., 0.1+0.2)\n  if (typeof result === 'number')\n    result = Math.round(result * 1e12) / 1e12; // 12‑decimal precision\n\n  setDisplay(String(result));\n  // Reset state so user can continue chaining calculations\n  operand1 = result;\n  operator = null;\n  shouldResetDisplay = true;\n}\n\n// Optional: enable keyboard input\ndocument.addEventListener('keydown', e => {\n  const key = e.key;\n\n  if (/\\d/.test(key)) { // digits\n    document.querySelector(`button.num:nth-child(${parseInt(key) + 1})`).click();\n  } else if (key === '.') {\n    document.querySelector('button.num:nth-child(12)').click(); // the '.' button\n  } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%') {\n    const map = { '+': '+', '-': '-', '*': '*', '/': '/', '%': '%' };\n    document.querySelector(`button.op[data-op=\"${map[key]}\"]`).click();\n  } else if (key === 'Enter' || key === '=') {\n    equalsBtn.click();\n  } else if (key === 'Escape') {\n    clearAll();\n  }\n});\n```\n\n### How the JavaScript works\n\n| Step | What happens |\n|------|--------------|\n| **Digit / “.” click** | Appends the character to the display. If the previous button was an operator (`shouldResetDisplay` flag), the display is cleared first. |\n| **Operator click** (`+ – * / %`) | Stores the current value as `operand1`, remembers the operator, and sets `shouldResetDisplay` so the next digit starts a fresh number. |\n| **Special operators**",
      },
      {
        role: "user",
        content: "A table comparing JavaScript to Go and Python",
      },
      {
        role: "assistant",
        content:
          "## Quick‑look comparison  \n| Feature / Aspect | **JavaScript** (ECMAScript) | **Go** (Golang) | **Python** |\n|------------------|----------------------------|-----------------|------------|\n| **Primary paradigm** | Multi‑paradigm (imperative, OO, functional). Runs in browsers **and** on servers (Node.js). | Statically‑typed, compiled, procedural + limited OO; heavy emphasis on concurrency & simplicity. | Multi‑paradigm (imperative, OO, functional, procedural). Interpreted / compiled to bytecode. |\n| **Typing** | Dynamically typed, weak (type coercion). Optional static typing via **TypeScript** or Flow. | Statically typed, strong, inferred (no explicit `var` needed in many cases). | Dynamically typed, strong (no implicit coercion). Optional static typing via **type hints** (`typing` module) and static analysers (`mypy`). |\n| **Compilation / Execution model** | Interpreted (JIT‑compiled by the browser or Node). No explicit build step required for basic scripts. | Ahead‑of‑time compiled to native binaries (`go build`). Fast compile times (≈ seconds). | Interpreted (CPython) → bytecode (`.pyc`). Can be compiled to native executables with **PyInstaller**, **Cython**, or **Nuitka**; also JIT options (PyPy). |\n| **Performance** | Good for UI‑centric workloads; V8 and other engines provide high‑speed JIT. Not ideal for heavy CPU‑bound tasks without native addons. | Generally **faster** than Python and comparable to compiled C/C++ for many workloads; excellent for network I/O and concurrency. | Slower than Go/compiled JS for CPU‑bound tasks; great for rapid development and I/O‑bound tasks (thanks to async libs). |\n| **Concurrency model** | **Event loop** + callbacks / Promises / `async`‑`await`. Web Workers for parallelism. | Built‑in **goroutines** + channels; lightweight threads scheduled by runtime. No explicit event loop needed. | `asyncio` + `await` for cooperative concurrency; threads & multiprocessing for parallelism (GIL limits true parallelism in CPython). |\n| **Standard library** | Browser‑specific APIs (DOM, Canvas, WebGL) + Node core modules (fs, http, crypto, etc.). | Very rich **batteries‑included** lib: networking, crypto, sync primitives, testing, profiling, etc. | Extensive stdlib (file I/O, networking, `json`, `csv`, `datetime`, `unittest`, etc.). |\n| **Package ecosystem** | **npm** (≈ 2 M packages). Wide variety of front‑end and back‑end modules. | **go.mod** / **proxy.golang.org** (≈ 200 k modules). Emphasizes versioned, minimal dependencies. | **PyPI** (≈ 400 k packages). Huge scientific, data‑science, web‑dev, automation ecosystem. |\n| **Typical use‑cases** | • Web front‑end (UI, SPA)  <br>• Server‑side APIs (Node/Express, NestJS)  <br>• Desktop/Electron apps  <br>• Serverless functions | • Cloud services, micro‑services, APIs  <br>• CLI tools & DevOps utilities  <br>• High‑throughput networking (proxies, proxies, load balancers)  <br>• Distributed systems (Kubernetes operators, etc.) | • Web back‑ends (Django, Flask, FastAPI)  <br>• Data science, ML, AI (NumPy, pandas, TensorFlow, PyTorch)  <br>• Scripting/automation  <br>• Prototyping & education |\n| **Memory management** | Automatic garbage collection (generational, tracing). | Automatic, non‑generational GC optimized for low‑latency; deterministic allocation for most cases. | Automatic reference counting + cyclic GC (CPython). |\n| **Error handling** | Exceptions (`try`/`catch`). Promises reject on async errors. | Multiple return values (`value, err`), plus panic/recover for exceptional cases. | Exceptions (`try`/`except`). |\n| **Tooling & IDE support** | • VS Code, WebStorm, Chrome DevTools, ESLint, Prettier, Jest, Babel, TypeScript <br>• Hot‑module reloading, source‑maps, debugging. | • `go fmt`, `go vet`, `go test`, `golint`, `gopls` (language server). <br>• Delve debugger, VS Code, GoLand, Sublime. | • `black`, `flake8`, `mypy`, `pytest`, `pylint`. <br>• VS Code, PyCharm, Jupyter, IPython. |\n| **Learning curve** | Low entry barrier (runs in any browser). Advanced concepts (async, prototypal inheritance) can be tricky. | Simple syntax, but concepts like interfaces, goroutine scheduling, and tooling (modules) need time. | Very beginner‑friendly syntax; extensive documentation and community support. |\n| **Cross‑platform support** | Runs everywhere browsers exist; Node works on Windows/macOS/Linux. | Single binary per OS/arch → “write once, compile everywhere”. | Interpreted on all major OSes; virtual environments isolate dependencies. |\n| **Community & industry adoption** | Dominant for front‑end; huge Node ecosystem for back‑end. Companies: Google, Facebook, Netflix, Uber. | Fast‑growing especially in cloud‑native, DevOps, and infrastructure. Companies: Docker, Kubernetes, Dropbox, Uber, Cloudflare. | One of the most popular languages overall; heavy presence in data science, academia, web, automation. |\n| **Versioning** | ECMAScript yearly releases (ES5 → ES2024). Browsers implement gradually; transpilers (Babel) used for backward compatibility. | Stable language spec; backward compatible releases. Minor versions every 6‑8 weeks. | Python 2 (EOL 2020) → Python 3.x. Minor releases roughly yearly; backward‑compatible but some breaking changes (e.g., `print` function). |\n| **Typical “Hello, World”** | ```js\\nconsole.log('Hello, World!');``` | ```go\\npackage main\\nimport \\\"fmt\\\"\\nfunc main() { fmt.Println(\\\"Hello, World!\\\") }\\n``` | ```python\\nprint('Hello, World!')\\n``` |\n\n---\n\n### TL;DR Take‑aways\n\n| ✅ | JavaScript | ✅ | Go | ✅ | Python |\n|---|------------|---|----|---|--------|\n| **Best for** | Interactive UI, full‑stack web (Node), rapid prototyping in the browser. | High‑performance services, concurrency‑heavy back‑ends, command‑line tools, cloud‑native workloads. | Data‑science, scripting, rapid application development, teaching, large‑scale web apps. |\n| **Speed** | Fast for JIT‑optimized workloads; slower for heavy CPU work. | Near‑C speed for many cases; excels at concurrent I/O. | Slower for CPU‑bound tasks; acceptable for most I/O‑bound tasks. |\n| **Typing** | Dynamic (optional static via TypeScript). | Static (type inference). | Dynamic (optional static via type hints). |\n| **Concurrency** | Event‑loop, async/await. | Goroutines + channels (lightweight threads). | `asyncio` + threads/processes (GIL limits true parallelism). |\n| **Ecosystem size** | Largest (npm). | Growing fast, but more curated. | Massive (PyPI). |\n| **Learning curve** | Low to moderate. | Moderate (new concepts like channels). | Very low; steep when entering scientific stack. |\n\nFeel free to ask for deeper dives into any specific column (e.g., performance benchmarks, concurrency patterns, tooling tips, etc.).",
      },
    ]);
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || isStreaming) return;

    const inputValue = input.trim();

    if ((!inputValue && selectedAttachments.length === 0) || isPending) return;

    setIsPending(true);
    setError(false);
    setAttachmentError("");

    try {
      // Attachment

      //////////////////////////////////////////////////////////////////////! AI WROTE THIS RUBBISH
      const attachmentPayload = await Promise.all(
        selectedAttachments.map(
          async ({ file }): Promise<MessageAttachment> => {
            if (isTextFile(file)) {
              return {
                name: file.name,
                type: file.type || "text/plain",
                content: await file.text(),
              };
            }

            return {
              name: file.name,
              type: file.type,
              data: await readAsDataUrl(file),
            };
          },
        ),
      );

      const textFileContext = attachmentPayload
        .filter((attachment) => attachment.content !== undefined)
        .map(
          (attachment) =>
            `\n\n[Attached text file: ${attachment.name}]\n${attachment.content}\n[End of ${attachment.name}]`,
        )
        .join("");

      const imageContext = attachmentPayload
        .filter((attachment) => attachment.data !== undefined)
        .map((attachment) => attachment.name);

      const userMessageText =
        inputValue ||
        (attachmentPayload.length ? "Please review the attached file(s)." : "");

      const messageForApi = [
        userMessageText,
        textFileContext,
        imageContext.length
          ? `\n\nAttached image(s): ${imageContext.join(", ")}`
          : "",
      ].join("");
      //////////////////////////////////////////////////////////////////////! AI WROTE THIS RUBBISH

      // Comment
      setIsStreaming(true);

      // setMessages((prev) => [
      //   ...prev,
      //   {
      //     role: "user",
      //     content: userMessageText,
      //     attachments: attachmentPayload,
      //   },
      //   {
      //     role: "assistant",
      //     content: "",
      //   },
      // ]);

      // Send request
      const { data } = await api.post("/api/conversation", {
        data: {
          message: messageForApi,
          // attachments: attachmentPayload, //! FIX
          conversationId: "portfolio-chat-1", //! FIX
          model: "qwen/qwen3.8-27b",
          //  model: 'openai/gpt-oss-20b',
        },
      });

      // if (!response.ok) throw new Error("Network response failed");

      // if (!response.body)
      //   throw new Error("The response stream is unavailable.");

      // Streaming
      const reader = data.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode chunk bytes to string and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const lines = buffer.split("\n\n");

        // Keep the last partial line in the buffer if it didn't end with \n\n
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.replace("data:", "").trim();
          if (jsonStr === "[DONE]") {
            setIsStreaming(false);
            break;
          }

          const parsed = JSON.parse(jsonStr);

          if (parsed.content) {
            // Update the last message (the assistant's ongoing response) immutably
            // setMessages((prev) => {
            //   const updated = [...prev];
            //   const lastMsg = updated[updated.length - 1];
            //   if (!lastMsg) return updated;
            //   updated[updated.length - 1] = {
            //     ...lastMsg,
            //     content: lastMsg.content + parsed.content,
            //   };
            //   return updated;
            // });
          }
        }
      }

      setInput("");

      if (inputRef.current) inputRef.current.style.height = "auto";

      selectedAttachments.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });

      setSelectedAttachments([]);
    } catch (error: any) {
      if (error === AxiosError) {
        console.log("Network error!", error.response.data);
      }

      // console.error("Streaming client error:", err);
      setError(true);

      // setMessages((previous) =>
      //   previous.filter(
      //     (message: { id?: string }) =>
      //       message.id !== userMessageId && message.id !== assistantReplyId,
      //   ),
      // );
    } finally {
      setIsStreaming(false);
      setIsPending(false);
    }
  }
  ////////////////////////////////////////////////////////////////////////////////! STREAMING

  function handleAttachmentSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.currentTarget.files ?? []);
    let totalBytes = selectedAttachments.reduce(
      (total, attachment) => total + attachment.file.size,
      0,
    );
    const addedAttachments: SelectedAttachment[] = [];
    let validationError = "";

    for (const file of files) {
      const isImage = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ].includes(file.type);
      if (!isImage && !isTextFile(file)) {
        validationError = `${file.name} is not a supported image or text file.`;
        continue;
      }

      if (!isImage && file.size > MAX_TEXT_FILE_BYTES) {
        validationError = `${file.name} is larger than the 1 MB text-file limit.`;
        continue;
      }

      if (
        selectedAttachments.length + addedAttachments.length >=
        MAX_ATTACHMENTS
      ) {
        validationError = `Attach up to ${MAX_ATTACHMENTS} files at a time.`;
        break;
      }

      if (totalBytes + file.size > MAX_ATTACHMENT_BYTES) {
        validationError = "Attachments must total 10 MB or less.";
        continue;
      }

      totalBytes += file.size;
      addedAttachments.push({
        id: "1", //! FIX
        // id: createId(),
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    if (addedAttachments.length) {
      setSelectedAttachments((current) => [...current, ...addedAttachments]);
    }
    setAttachmentError(validationError);
    event.currentTarget.value = "";
  }

  function removeAttachment(id: string) {
    setSelectedAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  const [editText, setEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [edit, setEdit] = useState({ showEditInput: false, text: "" });

  function toggleEdit(content: string) {
    setEditText(content);
    setIsEditing(!isEditing);
  }

  function handleEditSubmit() {
    console.log("🌈 Edited prompt:", editText);
    toggleEdit("");

    // sumbit code goes here
  }

  //   function handleCancelEdit(text: string) {
  //     setEditText("");
  // toggleEdit("")
  //   }

  function handlePrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const inputValue = inputRef.current?.value as string;
    console.log(inputValue);

    addMessages([
      {
        id: "1",
        role: "user",
        content: inputValue,
      },
      {
        id: "2",
        role: "assistant",
        content: "",
      },
    ]);

    setIsStreaming(true);
    setIsPending(true);

    setTimeout(() => {
      updateMessage("2", "Hello there!");
      setIsStreaming(false);
      setIsPending(false);
    }, 2000);
  }

  return (
    <section
      className={`${className ?? ""} ${styles.container} ${messages.length === 0 ? styles.empty : ""} `}
    >
      <nav className={styles.nav}>
        {/* <button
          type="button"
          className={styles.hamburgerButton}
          onClick={toggleSidebar}
          aria-label={expanded ? "Collapse sidebar" : "Open sidebar"}
          aria-expanded={expanded}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#1f1f1f"
          >
            <path d="M160-240q-17 0-28.5-11.5T120-280q0-17 11.5-28.5T160-320h640q17 0 28.5 11.5T840-280q0 17-11.5 28.5T800-240H160Zm0-200q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520h640q17 0 28.5 11.5T840-480q0 17-11.5 28.5T800-440H160Zm0-200q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z" />
          </svg>
        </button> */}

        <Link href="https://github.com/nanadua96/kivo-web">GitHub</Link>

        {!expanded && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={`${styles.iconButton} ${styles.sidebarToggleButton}`}
            aria-label="Open sidebar"
            aria-expanded={expanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#1f1f1f"
            >
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm280-80h280v-560H480v560Z" />
            </svg>
          </button>
        )}

        <div className="nav-button-group">
          <button
            type="button"
            className="btn-base btn-outline"
            onClick={toggleAuthModal}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={toggleAuthModal}
            className="btn-base btn-solid"
          >
            Login
          </button>
        </div>
      </nav>
      {/* ============= Body =============*/}
      {messages.length > 0 && (
        <div className={styles.chatContainer}>
          <div className={styles.chatWrapper}>
            {messages.map((message, index) => {
              const messageId = message.id;

              const { id, role, content } = message;

              // User bubble
              if (role === "user") {
                // Show edit
                if (isEditing) {
                  return (
                    <div key={id} className={styles.userBubbleEdit}>
                      <div className={styles.userBubble}>
                        <input
                          value={editText}
                          onChange={(e) => {
                            setEditText(e.target.value);
                            console.log("User is typing:", e.target.value);
                          }}
                        />
                      </div>
                      <div className={styles.userBubbleButtonGroup}>
                        <button onClick={() => toggleEdit("")} type="button">
                          Cancel
                          {/* <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                          </svg> */}
                        </button>
                        <button onClick={handleEditSubmit} type="button">
                          Done
                          {/* <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
                          </svg> */}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={id} className={styles.senderBubbleWrapper}>
                    <div className={styles.senderBubble}>
                      <p>{content}</p>
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className={styles.sentAttachments}>
                            {message.attachments.map((attachment) => (
                              <div
                                key={`${attachment.name}-${attachment.type}`}
                                className={styles.sentAttachment}
                              >
                                {attachment.data && (
                                  <Image
                                    src={attachment.data}
                                    alt={attachment.name}
                                    width={42}
                                    height={42}
                                    unoptimized
                                  />
                                )}
                                <span>{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className={styles.senderBubbleButtonGroup}>
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                        </svg>
                      </button>
                      <button onClick={() => toggleEdit(content)} type="button">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L313-143q-11 11-25.5 17t-30.5 6h-97Zm600-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              }

              if (message.role === "assistant") {
                return (
                  <div
                    key={index}
                    // style={{ alignSelf: "flex-start" }}
                    className={styles.markdownBody}
                    // className="markdown-body"
                  >
                    <Markdown>{message.content}</Markdown>
                    <div className="assistant-msg-btn-group">
                      <button
                        onClick={() => handleCopy(message.content)}
                        type="button"
                        className="sender-msg-btn"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          height="24px"
                          viewBox="0 -960 960 960"
                          width="24px"
                          fill="#1f1f1f"
                        >
                          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-520q0-17 11.5-28.5T160-720q17 0 28.5 11.5T200-680v520h400q17 0 28.5 11.5T640-120q0 17-11.5 28.5T600-80H200Zm160-240v-480 480Z" />
                        </svg>
                      </button>
                      {/* Rating up */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "up");
                        }}
                        disabled={!messageId}
                        type="button"
                        className="sender-msg-btn"
                      >
                        {message?.rating === "up" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M840-640q32 0 56 24t24 56v80q0 7-1.5 15t-4.5 15L794-168q-9 20-30 34t-44 14H400q-33 0-56.5-23.5T320-200v-407q0-16 6.5-30.5T344-663l217-216q15-14 35.5-17t39.5 7q19 10 27.5 28t3.5 37l-45 184h218ZM160-120q-33 0-56.5-23.5T80-200v-360q0-33 23.5-56.5T160-640q33 0 56.5 23.5T240-560v360q0 33-23.5 56.5T160-120Z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M840-640q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14H280v-520l240-238q15-15 35.5-17.5T595-888q19 10 28 28t4 37l-45 183h258Zm-480 34v406h360l120-280v-80H480l54-220-174 174ZM160-120q-33 0-56.5-23.5T80-200v-360q0-33 23.5-56.5T160-640h120v80H160v360h120v80H160Zm200-80v-406 406Z" />
                          </svg>
                        )}
                      </button>
                      {/* Rating down */}
                      <button
                        onClick={() => {
                          if (messageId) rateMessage(messageId, "down");
                        }}
                        disabled={!messageId}
                        type="button"
                        className="sender-msg-btn"
                      >
                        {message?.rating === "down" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M120-320q-32 0-56-24t-24-56v-80q0-7 1.5-15t4.5-15l120-282q9-20 30-34t44-14h320q33 0 56.5 23.5T640-760v407q0 16-6.5 30.5T616-297L399-81q-15 14-35.5 17T324-71q-19-10-27.5-28t-3.5-37l45-184H120Zm680-520q33 0 56.5 23.5T880-760v360q0 33-23.5 56.5T800-320q-33 0-56.5-23.5T720-400v-360q0-33 23.5-56.5T800-840Z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 -960 960 960"
                            width="24px"
                            fill="#1f1f1f"
                          >
                            <path d="M120-320q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14h440v520L440-82q-15 15-35.5 17.5T365-72q-19-10-28-28t-4-37l45-183H120Zm480-34v-406H240L120-480v80h360l-54 220 174-174Zm200-486q33 0 56.5 23.5T880-760v360q0 33-23.5 56.5T800-320H680v-80h120v-360H680v-80h120Zm-200 80v406-406Z" />
                          </svg>
                        )}
                      </button>
                      {/* <button
                      onClick={() => {
                        if (messageId) handleRegenerateMessage(messageId);
                      }}
                      disabled={!messageId}
                      type="button"
                      className="sender-msg-btn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#1f1f1f"
                      >
                        <path d="M240-478q0 16 2 31.5t7 30.5q5 17-1 32.5T227-361q-16 8-31.5 1.5T175-383q-8-23-11.5-47t-3.5-48q0-134 93-228t227-94h7l-36-36q-11-11-11-28t11-28q11-11 28-11t28 11l104 104q12 12 12 28t-12 28L507-628q-11 11-28 11t-28-11q-11-11-11-28t11-28l36-36h-7q-100 0-170 70.5T240-478Zm480-4q0-16-2-31.5t-7-30.5q-5-17 1-32.5t21-22.5q16-8 31.5-1.5T785-577q8 23 11.5 47t3.5 48q0 134-93 228t-227 94h-7l36 36q11 11 11 28t-11 28q-11 11-28 11t-28-11L349-172q-12-12-12-28t12-28l104-104q11-11 28-11t28 11q11 11 11 28t-11 28l-36 36h7q100 0 170-70.5T720-482Z" />
                      </svg>
                    </button> */}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {error && (
              <div>
                <p style={{ color: "red" }}>
                  Error sending message. Please try again.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.form?.requestSubmit()}
                >
                  Retry
                </button>
              </div>
            )}

            {isPending && <ThinkingIndicator />}
          </div>
        </div>
      )}

      <div className={styles.inputContainer}>
        {messages.length === 0 && (
          <div className="headline-wrapper">
            <p className="headline">What should we explore?</p>
          </div>
        )}

        <form className="input-wrapper" onSubmit={handlePrompt}>
          {/* <form className="input-wrapper" onSubmit={foo}> */}
          {/* <form className="input-wrapper" onSubmit={handleSendMessage}> */}
          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,.txt,.md,.csv,.json,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.sh,.yaml,.yml,.toml,.log,.sql"
            multiple
            onChange={handleAttachmentSelection}
            aria-label="Attach images or text files"
          />

          {selectedAttachments.length > 0 && (
            <div className={styles.attachmentList}>
              {selectedAttachments.map(({ id, file, previewUrl }) => (
                <div className={styles.attachmentItem} key={id}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt=""
                      width={34}
                      height={34}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.fileBadge} aria-hidden="true">
                      TXT
                    </span>
                  )}
                  <span className={styles.attachmentName} title={file.name}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className={styles.removeAttachment}
                    onClick={() => removeAttachment(id)}
                    aria-label={`Remove ${file.name}`}
                    disabled={isPending}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            id="chat"
            className="input"
            placeholder="Ask me anything..."
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(event) => {
              setInput(event.target.value);
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 200)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isPending}
          />

          <div className={styles.composerToolbar}>
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach images or text files"
              title="Attach images or text files"
              disabled={isPending}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg>
            </button>

            {attachmentError && (
              <p className={styles.attachmentError} role="alert">
                {attachmentError}
              </p>
            )}

            {isPending ? (
              <button
                type="button"
                className={styles.sendButton}
                aria-label="Sending message"
                disabled
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                className={styles.sendButton}
                type="submit"
                disabled={isInputEmpty}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5m-6 6 6-6 6 6" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
