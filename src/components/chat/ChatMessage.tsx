import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ActionButton as ActionButtonType, Message as MessageType } from './chat.types';
import { ProductCard } from './ProductCard';

interface ChatMessageProps {
  message: MessageType;
  onActionClick: (action: ActionButtonType) => void;
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BotAvatar() {
  return (
    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/28 bg-black/70 text-[#f5dd8c]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3" strokeLinecap="round" />
        <rect x="5" y="7" width="14" height="11" rx="4" />
        <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M9 15h6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[82%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser ? <BotAvatar /> : null}

        <div className={`${isUser ? 'items-end' : 'items-start'} flex w-full min-w-0 flex-col`}>
          <div
            className={`markdown-content px-4 py-3 text-sm leading-6 shadow-sm ${
              isUser
                ? 'rounded-[18px_18px_4px_18px] border border-white/20 bg-[linear-gradient(135deg,#fff4cf_0%,#d4af37_45%,#6e5312_100%)] text-black shadow-[0_16px_24px_rgba(212,175,55,0.18)]'
                : 'rounded-[18px_18px_18px_4px] border border-white/8 bg-[#141414] text-[#f4f2ea] shadow-[0_14px_24px_rgba(0,0,0,0.24)]'
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          </div>

          <span className="mt-1 px-1 text-[11px] text-[#9d947c]">{formatTimestamp(message.timestamp)}</span>

          {message.actions?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.actions.map((action) => (
                <button
                  key={`${message.id}-${action.label}`}
                  onClick={() => onActionClick(action)}
                  className="rounded-full border border-[#d4af37]/32 bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#f5e5b0] transition hover:border-[#f5dd8c] hover:bg-white/12"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          {message.products?.length ? (
            <div className="mt-3 flex w-full gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#d4af37]/30">
              {message.products.slice(0, 4).map((product) => (
                <ProductCard key={`${message.id}-${product.id}`} product={product} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
