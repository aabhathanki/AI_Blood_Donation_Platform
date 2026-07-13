import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, Plus, MessageSquare, ShieldAlert, Award, Calendar, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

interface Message {
  id: number;
  sender: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

export const AIChatPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    setSidebarLoading(true);
    try {
      const res = await api.get("/ai/conversations");
      setConversations(res.data);
      if (res.data.length > 0 && !activeConvId) {
        setActiveConvId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      const fetchMessages = async () => {
        try {
          const res = await api.get(`/ai/conversations/${activeConvId}`);
          setMessages(res.data.messages);
        } catch (err) {
          console.error(err);
        }
      };
      fetchMessages();
    }
  }, [activeConvId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleCreateChat = async () => {
    try {
      const res = await api.post("/ai/conversations", { title: `Chat ${new Date().toLocaleTimeString()}` });
      setConversations((prev) => [res.data, ...prev]);
      setActiveConvId(res.data.id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeConvId) return;

    const userText = input;
    setInput("");
    
    // Add user message locally
    const dummyUserMsg: Message = {
      id: Date.now(),
      sender: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, dummyUserMsg]);
    setLoading(true);

    try {
      const res = await api.post(`/ai/conversations/${activeConvId}/messages`, {
        content: userText,
      });
      
      // Fetch full message list again to synchronize with DB IDs
      const syncRes = await api.get(`/ai/conversations/${activeConvId}`);
      setMessages(syncRes.data.messages);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: Date.now() + 1,
        sender: "assistant",
        content: "Oops! I encountered an error connecting to the AI brain. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950/20">
      
      {/* Conversations Sidebar (Left side) */}
      <aside className="w-80 border-r border-slate-200 bg-white/70 dark:border-slate-800/40 dark:bg-slate-950/70 p-4 flex flex-col gap-4 hidden md:flex shrink-0">
        <Button
          onClick={handleCreateChat}
          className="w-full flex items-center justify-center gap-2 h-10 text-xs font-bold"
        >
          <Plus className="h-4.5 w-4.5" />
          New Assistant Chat
        </Button>
        
        <div className="flex-1 overflow-y-auto space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 block mb-2">
            History Archives
          </span>
          
          {sidebarLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-300" />
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold transition-all ${
                  activeConvId === conv.id
                    ? "bg-red-500/10 text-red-500 font-bold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-white"
                }`}
              >
                <MessageSquare className="h-4.5 w-4.5 flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))
          )}
          
          {!sidebarLoading && conversations.length === 0 && (
            <p className="text-[11px] text-slate-400 font-bold text-center py-10">
              No conversations found.
            </p>
          )}
        </div>
      </aside>

      {/* Main Chat Panel (Right side) */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-950/20 overflow-hidden relative">
        
        {/* Active conversation title header */}
        <div className="h-16 border-b border-slate-200/50 dark:border-slate-800/40 px-6 flex items-center gap-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white leading-3">
              Consult Healthcare AI
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
              Intent-aware Eligibility & Compatibility Agent
            </span>
          </div>
        </div>

        {/* Scrollable conversation bubble list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
          
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 flex items-center justify-center mx-auto text-white">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Ask LifeFlow AI</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                Consult compatibility, run eligibility checks, search drives in your city, or verify urgent matching donor locations instantly.
              </p>
              
              {/* Preset suggestion bubbles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4">
                {[
                  "Can I donate blood if I got a tattoo recently?",
                  "I urgently need O Negative blood in Bengaluru",
                  "Check compatibility: who can receive AB- blood?",
                  "Find upcoming donation camps near Bangalore",
                ].map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(preset)}
                    className="p-3 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl text-left transition-all hover:scale-[1.01]"
                  >
                    {preset} &rarr;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actual Messages */}
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                    msg.sender === "user" 
                      ? "bg-red-500/10 text-red-500" 
                      : "bg-gradient-to-br from-red-500 to-rose-600 text-white"
                  }`}>
                    {msg.sender === "user" ? user?.full_name.charAt(0).toUpperCase() : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Bubble content */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-red-600 text-white rounded-tr-none font-medium"
                        : "bg-white text-slate-800 border border-slate-200/50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800/60 rounded-tl-none"
                    }`}
                  >
                    {/* Render bold stars formatting manually */}
                    <p className="whitespace-pre-line font-medium">
                      {msg.content.split("**").map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="font-extrabold">{part}</strong> : part
                      )}
                    </p>
                  </div>

                </div>
              </div>
            ))}
            
            {/* Thinking Loader */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 shadow-sm items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

        </div>

        {/* Chat input form (Bottom) */}
        {activeConvId ? (
          <form
            onSubmit={handleSend}
            className="h-20 border-t border-slate-200/50 dark:border-slate-800/40 px-6 bg-white dark:bg-slate-950 flex items-center gap-3 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your healthcare/eligibility/compatibility query here..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 bg-slate-50/50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-200"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              disabled={!input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="h-20 border-t border-slate-200/50 dark:border-slate-800/40 px-6 bg-white dark:bg-slate-950 flex items-center justify-center shrink-0">
            <Button onClick={handleCreateChat} className="text-xs font-bold h-9">
              Initialize New Assistant Chat Session
            </Button>
          </div>
        )}

      </main>

    </div>
  );
};
export default AIChatPage;
