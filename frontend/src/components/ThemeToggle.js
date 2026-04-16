import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { sounds, isSoundEnabled, setSoundEnabled } from '../lib/sounds';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = () => {
    sounds.toggle();
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-black/5 dark:bg-white/10 text-[#4B5563] dark:text-[#D1D5DB] hover:text-[#059669] dark:hover:text-[#10B981]"
      data-testid="theme-toggle"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
    </button>
  );
}

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) sounds.success();
  };

  return (
    <button
      onClick={handleToggle}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-black/5 dark:bg-white/10 text-[#4B5563] dark:text-[#D1D5DB] hover:text-[#059669] dark:hover:text-[#10B981]"
      data-testid="sound-toggle"
      aria-label="Toggle sounds"
    >
      {enabled ? <Volume2 className="w-4 h-4" strokeWidth={1.5} /> : <VolumeX className="w-4 h-4" strokeWidth={1.5} />}
    </button>
  );
}
