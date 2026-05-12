import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sendMessage as sendChatMessage } from './useChatApi';
import { ChatMessage } from './ChatMessage';
import type { ActionButton, Message, PageContext } from './chat.types';
import './ChatWidget.css';

const QUICK_PROMPTS = [
  'Find products',
  'How to buy?',
  'Payment help',
  'Browse categories',
  'Cheapest laptops',
  'Show phones',
];

function createMessage(
  role: Message['role'],
  text: string,
  extras?: Pick<Message, 'products' | 'actions'>,
): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    timestamp: new Date(),
    ...extras,
  };
}

function BotAvatarBadge() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#fff4cf] shadow-[0_0_24px_rgba(212,175,55,0.25)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3" strokeLinecap="round" />
        <rect x="5" y="7" width="14" height="11" rx="4" />
        <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M9 15h6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[82%] gap-2">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-black/70 text-[#f8e7ac]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v3" strokeLinecap="round" />
            <rect x="5" y="7" width="14" height="11" rx="4" />
            <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
            <path d="M9 15h6" strokeLinecap="round" />
          </svg>
        </span>

        <div className="typing-indicator rounded-[18px_18px_18px_0] border border-white/6 bg-[#131313] px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-1">
            <span className="typing-indicator-dot h-2 w-2 rounded-full bg-[#f7df92]" />
            <span className="typing-indicator-dot h-2 w-2 rounded-full bg-[#fff5ce]" />
            <span className="typing-indicator-dot h-2 w-2 rounded-full bg-[#d4af37]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const messageListRef = useRef<HTMLDivElement | null>(null);

  // Default position handling
  useEffect(() => {
    // Reset to default on mount/reload
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Only drag when closed
    if (isOpen) return;

    // Prevent dragging from the icon inside
    if ((e.target as HTMLElement).closest('svg')) {
      // Allow drag to continue but we'll check it in handleDrag
    }

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Get the current rect to handle initial offsets correctly
    dragStart.current = { 
      x: clientX - position.x, 
      y: clientY - position.y 
    };
    
    // Prevent default to avoid text selection/scrolling during drag
    if (e.cancelable) e.preventDefault();
  };

  const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    // Boundary checks (optional but recommended)
    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag, { passive: false });
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const buildPageContext = (): PageContext => {
    const productMatch = location.pathname.match(/^\/products\/([^/]+)|^\/product\/([^/]+)/);
    const productRef = productMatch?.[1] || productMatch?.[2];
    const productName =
      document.querySelector<HTMLElement>('[data-chat-product-name]')?.textContent?.trim() ||
      undefined;

    return {
      currentPath: location.pathname,
      currentProductId: productRef ? decodeURIComponent(productRef) : undefined,
      currentProductName: productName,
    };
  };

  const appendBotMessage = (message: Message) => {
    setMessages((current) => [...current, message]);
    if (!isOpen) {
      setUnreadCount((count) => count + 1);
    }
  };

  const handleSubmit = async (rawMessage?: string) => {
    const trimmedMessage = (rawMessage ?? inputValue).trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    const userMessage = createMessage('user', trimmedMessage);
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(trimmedMessage, nextHistory, buildPageContext(), user?.id);
      appendBotMessage(
        createMessage('bot', response.reply, {
          products: response.products ?? [],
          actions: response.actions ?? [],
        }),
      );
    } catch (_error) {
      appendBotMessage(
        createMessage(
          'bot',
          "I'm having trouble connecting right now. Please try again in a moment.",
          { products: [], actions: [] },
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: ActionButton) => {
    if (action.action === 'navigate' && action.path) {
      navigate(action.path);
      return;
    }

    if (action.action === 'sendMessage' && action.message) {
      void handleSubmit(action.message);
    }
  };

  const chatWindowBaseClasses =
    'chat-window-shell chat-window-frame fixed z-[70] flex flex-col overflow-hidden transition-all duration-300 ease-out';

  return (
    <>
      <button
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={() => !isDragging && setIsOpen((open) => !open)}
        aria-label="Toggle AI assistant"
        className={`chat-trigger-shell fixed bottom-[6.2rem] right-4 z-[80] flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/30 bg-[radial-gradient(circle_at_30%_30%,#fff6d5_0%,#e2c56d_20%,#c59a24_48%,#090909_100%)] text-black shadow-[0_24px_50px_rgba(0,0,0,0.42)] transition-opacity hover:scale-[1.06] md:bottom-6 md:right-6 ${
          isOpen ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100'
        } ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: 'none'
        }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 10h8" strokeLinecap="round" />
          <path d="M8 14h5" strokeLinecap="round" />
          <path d="M19 5H5a2 2 0 0 0-2 2v13l3.5-2.5H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" strokeLinejoin="round" />
        </svg>

        <span className="pointer-events-none absolute inset-[10px] rounded-full border border-white/25" />

        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <section
        className={[
          chatWindowBaseClasses,
          'chat-enter',
          isOpen ? 'chat-open' : '',
          'md:bottom-28 md:right-6 md:h-[600px] md:w-[390px] md:rounded-[28px]',
          'chat-mobile-enter bottom-[6.2rem] right-4 left-auto h-[68vh] w-[calc(100vw-2rem)] max-w-[360px] rounded-[28px] md:left-auto',
        ].join(' ')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!isOpen}
      >
        <header className="chat-header-shine flex h-16 shrink-0 items-center justify-between border-b border-white/8 bg-[linear-gradient(135deg,#050505_0%,#171717_58%,#3a2b0a_100%)] px-4 text-white">
          <div className="flex items-center gap-3">
            <BotAvatarBadge />
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-[#fff6d5] uppercase">AI Assistant</p>
              <p className="text-[11px] text-[#d8c17a]">Live shopping help</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-white/90 transition hover:border-[#d4af37]/50 hover:bg-white/8"
          >
            x
          </button>
        </header>

        <div ref={messageListRef} className="chat-messages-panel flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#1f1a0f_0%,#0c0c0c_32%,#090909_100%)] px-4 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onActionClick={handleActionClick} />
            ))}
            {isLoading ? <TypingIndicator /> : null}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="border-t border-white/8 bg-black/80 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void handleSubmit(prompt)}
                  className="shrink-0 rounded-full border border-[#d4af37]/28 bg-white/6 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f3e4b2] transition hover:border-[#f5dd8c] hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-0 border-t border-white/8 bg-[linear-gradient(180deg,#0c0c0c_0%,#050505_100%)] px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ask me anything..."
              className="h-[54px] flex-1 rounded-full border border-[#d4af37]/22 bg-white/7 px-4 text-sm text-white outline-none transition placeholder:text-[#b8ac87] focus:border-[#f5dd8c] focus:bg-white/10"
            />

            <button
              onClick={() => void handleSubmit()}
              disabled={!inputValue.trim() || isLoading}
              className="flex h-[54px] min-w-[54px] items-center justify-center rounded-full border border-white/18 bg-[linear-gradient(135deg,#fff7d5_0%,#d8b559_28%,#8f6b16_70%,#050505_100%)] px-4 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Go
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
