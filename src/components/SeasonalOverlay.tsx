import { useSeason } from '../context/SeasonContext';
import '../styles/seasonal.css';

export function SeasonalOverlay() {
    const { currentSeason } = useSeason();

    if (currentSeason === 'none') {
        return null;
    }

    // Generate random positions for particles
    const generateParticles = (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            animationDelay: Math.random() * 5,
        }));
    };

    const particles = generateParticles(20);

    return (
        <>
            {/* Seasonal Decorations Overlay */}
            <div className="seasonal-overlay">
                {currentSeason === 'winter' && (
                    <>
                        {particles.map((particle) => (
                            <div
                                key={particle.id}
                                className="snowflake"
                                style={{
                                    left: `${particle.left}%`,
                                    animationDelay: `${particle.animationDelay}s`,
                                }}
                            >
                                ❄
                            </div>
                        ))}
                    </>
                )}

                {currentSeason === 'valentine' && (
                    <>
                        {particles.map((particle) => (
                            <div
                                key={particle.id}
                                className="heart"
                                style={{
                                    left: `${particle.left}%`,
                                    animationDelay: `${particle.animationDelay}s`,
                                }}
                            >
                                ❤
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Corner Banner */}
            <div className="seasonal-banner">
                <div className={`corner-ribbon ${currentSeason === 'valentine' ? 'valentine' : ''}`}>
                    {currentSeason === 'winter' ? "Season's Greetings" : "Happy Valentine's"}
                </div>
            </div>
        </>
    );
}
