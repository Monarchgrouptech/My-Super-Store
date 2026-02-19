import { useSeason } from '../context/SeasonContext';
import '../styles/seasonal.css';

export function GreetingModal() {
    const { currentSeason, showGreeting, dismissGreeting } = useSeason();

    if (!showGreeting || currentSeason === 'none') {
        return null;
    }

    const greetingContent = {
        winter: {
            icon: '🎄',
            title: 'Happy Holidays!',
            message: 'Wishing you a wonderful holiday season filled with joy and warmth.',
        },
        valentine: {
            icon: '💖',
            title: "Happy Valentine's!",
            message: 'Spread love and kindness this Valentine\'s Day.',
        },
    };

    const content = greetingContent[currentSeason];

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            dismissGreeting();
        }
    };

    return (
        <div className="greeting-modal-backdrop" onClick={handleBackdropClick}>
            <div className="greeting-modal">
                <div className="greeting-modal-content">
                    <div className="greeting-modal-icon">{content.icon}</div>
                    <h2 className="greeting-modal-title">{content.title}</h2>
                    <p className="greeting-modal-message">{content.message}</p>
                    <button className="greeting-modal-close" onClick={dismissGreeting}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
}
