import { useLanguage } from '../contexts/LanguageContext';
import { Switch } from '../components/ui/switch';
import { Globe } from 'lucide-react';

export function LanguageToggle({ compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 text-sm font-body" data-testid="language-toggle-global">
      {!compact && <Globe className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.5} />}
      <span className={`text-xs ${language === 'en' ? 'text-[#0A0A0A] font-semibold' : 'text-[#9CA3AF]'}`}>EN</span>
      <Switch
        checked={language === 'hi'}
        onCheckedChange={(checked) => setLanguage(checked ? 'hi' : 'en')}
        className="scale-75"
        data-testid="language-switch"
      />
      <span className={`text-xs ${language === 'hi' ? 'text-[#0A0A0A] font-semibold' : 'text-[#9CA3AF]'}`}>HI</span>
    </div>
  );
}
