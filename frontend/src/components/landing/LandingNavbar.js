import { Link } from 'react-router-dom';
import { LogOut, Lock } from 'lucide-react';
import { LanguageToggle } from '../LanguageToggle';
import { Button } from '../ui/button';

export function LandingNavbar({ t, isLoggedIn, user, activeSection, onLogout, navigate }) {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Trust Strip */}
      <div className="bg-[#F3F4F6] text-center py-2 px-4" data-testid="trust-strip">
        <p className="font-body text-xs text-[#4B5563]">
          <Lock className="w-3 h-3 inline-block mr-1 -mt-0.5 text-[#059669]" />
          {t.trustStrip}
        </p>
      </div>

      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] shadow-sm" data-testid="landing-navbar">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <a href="/" onClick={scrollToTop} className="flex items-center gap-2" data-testid="logo-home-link">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-7 h-7 object-contain" />
            <span className="font-heading font-bold text-lg text-[#0D1B2A] tracking-tight">Rinkosh</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            <a
              href="#emi-calculator"
              className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors ${activeSection === 'emi-calculator' ? 'text-[#0D1B2A] font-semibold bg-[#FEF3C7]' : 'text-[#4B5563] hover:text-[#0D1B2A]'}`}
              data-testid="nav-emi-link"
            >
              {t.navEmiCalc}
            </a>
            <a
              href="#browse-loans"
              className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors ${activeSection === 'browse-loans' ? 'text-[#0D1B2A] font-semibold bg-[#FEF3C7]' : 'text-[#4B5563] hover:text-[#0D1B2A]'}`}
              data-testid="nav-browse-link"
            >
              {t.navBrowseLoans}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle compact />
            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="font-body text-sm text-[#4B5563] hover:text-[#0D1B2A]" data-testid="nav-dashboard-button">{t.dashboard}</Button>
                {user?.role === 'admin' && <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="font-body text-xs text-[#4B5563]">Admin</Button>}
                <span className="font-body text-sm text-[#4B5563] hidden md:inline">{user?.name?.split(' ')[0]}</span>
                <Button variant="ghost" size="sm" onClick={onLogout} className="text-[#4B5563]" data-testid="nav-logout-button"><LogOut className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" className="font-body text-sm text-[#4B5563]" data-testid="nav-login-button">{t.login}</Button></Link>
                <Link to="/register">
                  <Button className="bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg px-5 font-body text-sm font-bold h-9 shadow-md hover:shadow-lg transition-shadow" data-testid="nav-cta-button">
                    {t.checkMyEligibility}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
