import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowRight, Calculator } from 'lucide-react';

export function StickyCta() {
  const { t } = useLanguage();
  const location = useLocation();

  // Don't show on dashboard, admin, or onboarding
  if (['/dashboard', '/admin', '/onboarding'].some(p => location.pathname.startsWith(p))) return null;
  // Don't show on register page
  if (location.pathname === '/register') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden" data-testid="sticky-cta">
      <div className="bg-white/95 dark:bg-[hsl(240,6%,8%)]/95 backdrop-blur-lg border-t border-black/5 dark:border-white/5 px-4 py-3 flex gap-2">
        <Link to="/register" className="flex-1">
          <Button className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-full font-body font-semibold h-11 text-sm btn-glow" data-testid="sticky-cta-main">
            {t.findBestLoan || 'Find Best Loan'} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
