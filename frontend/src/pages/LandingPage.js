import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { Button } from '../components/ui/button';
import { Shield, ArrowRight, Eye, Lock, MessageSquare, TrendingUp, CheckCircle, Users, IndianRupee, Ban } from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: Eye, title: t.feat1, desc: t.feat1d },
    { icon: Ban, title: t.feat2, desc: t.feat2d },
    { icon: MessageSquare, title: t.feat3, desc: t.feat3d },
    { icon: TrendingUp, title: t.feat4, desc: t.feat4d },
  ];

  const steps = [
    { num: "01", title: t.step1, desc: t.step1d },
    { num: "02", title: t.step2, desc: t.step2d },
    { num: "03", title: t.step3, desc: t.step3d },
    { num: "04", title: t.step4, desc: t.step4d },
  ];

  const stats = [
    { value: "20+", label: t.statBanks },
    { value: "6", label: t.statCategories },
    { value: "100%", label: t.statControl },
    { value: "0", label: t.statSpam },
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-nav" data-testid="landing-navbar">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
            <span className="font-heading font-bold text-xl text-[#0A0A0A]">Rinkosh</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="ghost" className="rounded-full font-body font-semibold text-[#4B5563] hover:text-[#0A0A0A]" data-testid="nav-login-button">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-[#059669] text-white hover:bg-[#047857] rounded-full px-6 font-body font-semibold" data-testid="nav-signup-button">
                Find Best Loan
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 lg:px-8" data-testid="hero-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#059669]/10 text-[#059669] rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
              <Lock className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-xs font-body font-bold uppercase tracking-wider">Your data is surakshit (safe)</span>
            </div>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-[#0A0A0A] tracking-tighter leading-[1.05] mb-6 animate-fade-in-up">
              {t.heroHeading || <>Stop Overpaying<br />on Loans</>}
            </h1>
            <p className="font-body text-lg md:text-xl text-[#4B5563] leading-relaxed mb-4 max-w-xl animate-fade-in-up-delay-1">
              {t.heroSubtext || 'We compare interest rates, fees, and hidden charges across 20+ banks. No spam, no data selling. You control everything.'}
            </p>
            <p className="font-body text-sm text-[#059669] font-semibold mb-10 animate-fade-in-up-delay-1 italic">
              {t.motto || 'No Spam. No Secrets. Just Savings.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up-delay-2">
              <Link to="/register">
                <Button className="bg-[#111827] text-white hover:bg-[#000000] rounded-full px-8 py-3 font-body font-semibold h-14 text-base" data-testid="hero-cta-button">
                  {t.findBestLoan}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="rounded-full px-8 py-3 font-body font-semibold border-[#E5E7EB] hover:border-[#111827] h-14 text-base" data-testid="hero-login-button">
                  {t.iHaveAccount || 'I have an account'}
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block animate-fade-in-up-delay-2">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#059669]/5 rounded-3xl blur-2xl" />
              <img
                src="https://images.unsplash.com/photo-1658480023495-dc8cae9e781e?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=600&h=500&fit=crop"
                alt="Indian professional using smartphone for banking"
                className="relative rounded-3xl shadow-2xl object-cover w-full h-[480px]"
                loading="lazy"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-black/5 animate-fade-in-up-delay-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#059669]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-[#0A0A0A] text-sm">Avg. Savings</div>
                    <div className="font-heading font-bold text-[#059669] text-lg">Rs. 2,34,000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-black/5 bg-[#F9F9FB]" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight">{stat.value}</div>
                <div className="font-body text-sm text-[#4B5563] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-32 px-6 lg:px-8" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280] font-body">{t.whyRinkosh || 'Why Rinkosh'}</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight mt-3">
              {t.transparencyAtEveryStep || 'Transparency at every step'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/5 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] loan-card" data-testid={`feature-card-${i}`}>
                <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center mb-5">
                  <f.icon className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#0A0A0A] mb-2">{f.title}</h3>
                <p className="font-body text-[#4B5563] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-32 px-6 lg:px-8 bg-[#F9F9FB]" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280] font-body">{t.howItWorks || 'How It Works'}</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight mt-3">
              {t.fourSimpleSteps || 'Four simple steps'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative" data-testid={`step-card-${i}`}>
                <div className="font-heading text-6xl font-bold text-[#059669]/10 mb-4">{s.num}</div>
                <h3 className="font-heading text-lg font-semibold text-[#0A0A0A] mb-2">{s.title}</h3>
                <p className="font-body text-sm text-[#4B5563] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 md:py-32 px-6 lg:px-8" data-testid="trust-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1534951009808-766178b47a4f?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=500&h=400&fit=crop"
                  alt="Financial growth and savings"
                  className="rounded-3xl shadow-lg object-cover w-full h-[360px]"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="w-16 h-16 rounded-2xl bg-[#059669]/10 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-[#059669]" strokeWidth={1.5} />
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight mb-4">
                {t.privacyIsSacred || 'Your privacy is sacred'}
              </h2>
              <p className="font-body text-lg text-[#4B5563] mb-10">
                {t.privacyDesc || 'We never share your data without explicit consent. No third-party selling. No hidden clauses.'}
              </p>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle, text: t.explicitConsent },
                  { icon: Users, text: t.youChooseWho },
                  { icon: IndianRupee, text: t.noHiddenFees },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#F9F9FB] rounded-xl p-4 text-left loan-card">
                    <item.icon className="w-5 h-5 text-[#059669] flex-shrink-0" strokeWidth={1.5} />
                    <span className="font-body text-sm text-[#0A0A0A]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 px-6 lg:px-8 bg-[#111827]" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            {t.readyToSave || 'Ready to save on your next loan?'}
          </h2>
          <p className="font-body text-lg text-[#9CA3AF] mb-8">
            {t.joinThousands || 'Join thousands of Indians making smarter borrowing decisions.'}
          </p>
          <Link to="/register">
            <Button className="bg-[#059669] text-white hover:bg-[#047857] rounded-full px-10 py-3 font-body font-semibold h-14 text-base" data-testid="cta-signup-button">
              {t.getStartedFree || 'Get Started Free'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-8 border-t border-black/5" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <span className="font-heading font-bold text-[#0A0A0A]">Rinkosh</span>
          </div>
          <p className="font-body text-sm text-[#9CA3AF]">Transparent lending for everyone.</p>
        </div>
      </footer>
    </div>
  );
}
