import React, { useState, useEffect, useRef } from "react";
import { Bot, X, Send, Heart, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "./ui/Button";

interface Message {
  sender: "user" | "assistant";
  content: string;
}

export const AIWidget: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      content: "👋 Hello! I am your AI Blood Platform Assistant. How can I help you today? You can ask me about blood donation safety, check compatibility, or run an eligibility check!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Create or load conversation when widget is opened
  useEffect(() => {
    if (isOpen && isAuthenticated && !conversationId) {
      const initConversation = async () => {
        try {
          const res = await api.post("/ai/conversations", { title: "Quick Widget Assist" });
          setConversationId(res.data.id);
        } catch (err) {
          console.error("Failed to start AI widget conversation:", err);
        }
      };
      initConversation();
    }
  }, [isOpen, isAuthenticated]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", content: userText }]);
    setLoading(true);

    try {
      if (isAuthenticated && conversationId) {
        // Logged-in full API conversation
        const res = await api.post(`/ai/conversations/${conversationId}/messages`, {
          content: userText
        });
        setMessages((prev) => [...prev, { sender: "assistant", content: res.data.response }]);
      } else {
        // Guest mode fallback (send to backend mockup processor directly or mock locally)
        // Let's call a stateless mockup check or a guest endpoint.
        // Since we want it to be smart, we can call the auth signup/login or just use local mock response logic,
        // but wait! We can easily use our rules engine logic on client-side or define a generic chat.
        // Let's implement a stateless response builder that does a basic fetch or mock processing.
        // To be 100% robust, let's mock it locally with some quick answers, or direct them to log in!
        setTimeout(() => {
          let reply = "I would love to help you find donors, check eligibility, or review compatibility! Please **Sign In** to save your conversation history and access live donor matching.";
          
          const text = userText.toLowerCase();
          if (text.includes("compatib") || text.includes("can a+ donate") || text.includes("receive")) {
            reply = "🩸 For compatibility: O- is the universal donor and can donate to all blood groups. AB+ is the universal recipient. To see compatibility charts and check specific groups, please sign in!";
          } else if (text.includes("safe") || text.includes("process") || text.includes("recovery")) {
            reply = "❤️ Blood donation is 100% safe! Sterile needles are used once and discarded. Recovery takes only 24 hours. Sign in to chat with our healthcare AI for a complete checklist!";
          } else if (text.includes("eligible") || text.includes("can i donate")) {
            reply = "📋 Donors must be 18-65 years old, weigh at least 50kg, and wait 90 days between donations. Sign in so I can run a personalized eligibility assessment for you!";
          }
          
          setMessages((prev) => [...prev, { sender: "assistant", content: reply }]);
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", content: "Sorry, I ran into an error. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 flex h-[480px] w-[340px] sm:w-[380px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-600 p-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-3">LifeFlow Support AI</h4>
                <span className="text-[10px] text-red-100 font-medium">Healthcare Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/10">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-red-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800/50 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">
                    {msg.content.split("**").map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="font-extrabold">{part}</strong> : part
                    )}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 shadow-sm items-center">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Guest Alert banner */}
          {!isAuthenticated && (
            <div className="bg-red-500/10 border-y border-red-500/20 px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              <span className="text-[10px] text-red-500 font-bold leading-tight">
                Guest Mode: Log in to enable live donor searches and eligibility checkers.
              </span>
            </div>
          )}

          {/* Chat Form Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-100 p-3 bg-white dark:bg-slate-950 dark:border-slate-800/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me something..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 bg-slate-50/50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8.5 w-8.5 rounded-xl shrink-0"
              disabled={!input.trim() || loading}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 hover:shadow-red-500/30 hover:rotate-12 group"
        title="AI Support Assistant"
      >
        {isOpen ? (
          <X className="h-6.5 w-6.5" />
        ) : (
          <div className="relative">
            <Bot className="h-6.5 w-6.5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-red-600 group-hover:animate-ping" />
          </div>
        )}
      </button>
    </div>
  );
};
export default AIWidget;
