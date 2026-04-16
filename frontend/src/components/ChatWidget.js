import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

const QUICK_QUESTIONS = {
  en: [
    'What loan is best for me?',
    'How to improve credit score?',
    'Gold loan vs personal loan?',
    'What is processing fee?',
  ],
  hi: [
    'मेरे लिए कौन सा लोन सबसे अच्छा है?',
    'क्रेडिट स्कोर कैसे सुधारें?',
    'गोल्ड लोन या पर्सनल लोन?',
    'प्रोसेसिंग फीस क्या है?',
  ],
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const { language } = useLanguage();
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat-public', {
        message: userMsg,
        language,
        session_id: sessionId,
      });
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
      if (data.session_id) setSessionId(data.session_id);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: language === 'hi' ? 'कुछ गलत हो गया। कृपया फिर से प्रयास करें।' : 'Something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 md:bottom-8 right-6 z-[999] w-14 h-14 rounded-full bg-[#059669] text-white shadow-xl hover:bg-[#047857] transition-all hover:scale-105 flex items-center justify-center btn-glow"
          data-testid="chatbot-toggle"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 md:bottom-8 right-6 z-[999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-black/10 overflow-hidden flex flex-col bg-white" style={{ height: '480px' }} data-testid="chatbot-panel">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#059669] to-[#047857] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white/90" />
              <div>
                <div className="font-heading font-bold text-white text-sm">Rinkosh AI</div>
                <div className="font-body text-[10px] text-white/70">
                  {language === 'hi' ? 'लोन के बारे में कुछ भी पूछें' : 'Ask anything about loans'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors" data-testid="chatbot-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="chatbot-messages">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="font-body text-sm text-[#4B5563] text-center mt-4">
                  {language === 'hi' ? 'नमस्ते! मैं आपकी लोन संबंधी सवालों में मदद कर सकता हूं।' : 'Hi! I can help you with any loan-related questions.'}
                </p>
                <div className="space-y-2" data-testid="quick-questions">
                  {(QUICK_QUESTIONS[language] || QUICK_QUESTIONS.en).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#059669]/5 hover:bg-[#059669]/10 text-[#059669] font-body text-xs transition-colors border border-[#059669]/10"
                      data-testid={`quick-q-${i}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl font-body text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#111827] text-white rounded-br-md'
                    : 'bg-[#F3F4F6] text-[#0A0A0A] rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-md px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-black/5 flex gap-2 flex-shrink-0 bg-white">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'hi' ? 'अपना सवाल पूछें...' : 'Ask your question...'}
              className="flex-1 rounded-full border-black/10 bg-[#F9F9FB] text-sm font-body h-10"
              disabled={loading}
              data-testid="chatbot-input"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="rounded-full bg-[#059669] hover:bg-[#047857] text-white h-10 w-10 p-0 flex-shrink-0"
              data-testid="chatbot-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
