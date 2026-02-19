import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type SeasonType = 'winter' | 'valentine' | 'none';

interface SeasonContextType {
    currentSeason: SeasonType;
    showGreeting: boolean;
    dismissGreeting: () => void;
}

const SeasonContext = createContext<SeasonContextType>({
    currentSeason: 'none',
    showGreeting: false,
    dismissGreeting: () => { },
});

export function SeasonProvider({ children }: { children: ReactNode }) {
    const [currentSeason, setCurrentSeason] = useState<SeasonType>('none');
    const [showGreeting, setShowGreeting] = useState(false);

    useEffect(() => {
        // Detect current month (0-indexed: 0 = January, 11 = December)
        const now = new Date();
        const month = now.getMonth();

        // Determine seasonal theme
        let season: SeasonType = 'none';
        if (month === 11) {
            // December (11) or January (0) = Winter/Christmas theme
            season = 'winter';
        } else if (month === 1) {
            // February (1) = Valentine's theme
            season = 'valentine';
        }

        setCurrentSeason(season);

        // Check if we should show greeting modal
        if (season !== 'none') {
            const lastGreetingDate = localStorage.getItem('lastGreetingDate');
            const today = new Date().toDateString();

            if (lastGreetingDate !== today) {
                // Show greeting if we haven't shown it today
                setShowGreeting(true);
            }
        }
    }, []);

    const dismissGreeting = () => {
        setShowGreeting(false);
        // Store today's date to prevent showing again today
        const today = new Date().toDateString();
        localStorage.setItem('lastGreetingDate', today);
    };

    return (
        <SeasonContext.Provider value={{ currentSeason, showGreeting, dismissGreeting }}>
            {children}
        </SeasonContext.Provider>
    );
}

export const useSeason = () => useContext(SeasonContext);
