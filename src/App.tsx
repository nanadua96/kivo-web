import { useState } from 'react';
import './App.css'; // Import the dedicated CSS stylesheet

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessageText = input;
    setInput('');
    setIsStreaming(true);

    // Append user message and an empty placeholder for the assistant response
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessageText },
      { role: 'assistant', content: '' },
    ]);

    try {
      const response = await fetch('http://127.0.0.1:3000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessageText,
          chatId: 'portfolio-chat-1',
        }),
      });

      if (!response.ok) throw new Error('Network response failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode chunk bytes to string and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace('data:', '').trim();
          if (jsonStr === '[DONE]') {
            setIsStreaming(false);
            break;
          }

          const parsed = JSON.parse(jsonStr);
          if (parsed.content) {
            // Update the last message immutably
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: lastMsg.content + parsed.content,
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      console.error('Streaming client error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-bubble ${
              msg.role === 'user' ? 'message-user' : 'message-assistant'
            }`}
          >
            <p className="message-text">{msg.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          className="chat-input"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="chat-submit-btn"
        >
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
