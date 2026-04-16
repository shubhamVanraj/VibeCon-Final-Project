import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle, SoundToggle } from '../components/ThemeToggle';
import { EmiCalculator } from '../components/EmiCalculator';
import { Button } from '../components/ui/button';
import { Shield, ArrowRight, Eye, Lock, MessageSquare, TrendingUp, CheckCircle, Users, IndianRupee, Ban, ChevronDown, ChevronUp, Heart, Target } from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

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

  const featureDetails = [
    t.feat1Detail || 'We show processing fees, foreclosure charges, and total cost of ownership — not just the headline rate.',
    t.feat2Detail || 'Your phone number is never shared. Banks can only reach you if you explicitly click "I\'m Interested".',
    t.feat3Detail || 'Our AI analyzes your profile to find the best match. Ask questions via text or voice in English or Hindi.',
    t.feat4Detail || 'We guide you through secured cards, starter loans, and payment habits that actually move your CIBIL score.',
  ];

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0" data-testid="landing-page">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-nav" data-testid="landing-navbar">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-9 h-9 object-contain" />
            <span className="font-heading font-bold text-xl text-[#0A0A0A] tracking-tight">Rinkosh</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <ThemeToggle />
            <SoundToggle />
            <Link to="/login">
              <Button variant="ghost" className="rounded-full font-body font-semibold text-[#4B5563] hover:text-[#0A0A0A] hover:bg-[#059669]/5" data-testid="nav-login-button">
                {t.login}
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-[#059669] text-white hover:bg-[#047857] rounded-full px-6 font-body font-semibold btn-glow" data-testid="nav-signup-button">
                {t.findBestLoan}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 lg:px-8 hero-glow relative overflow-hidden" data-testid="hero-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#059669]/10 text-[#059669] rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
              <Lock className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-xs font-body font-bold uppercase tracking-wider">{t.dataSafeHindi}</span>
            </div>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-[#0A0A0A] tracking-[-0.04em] leading-[1.05] mb-6 animate-fade-in-up">
              {t.heroHeading || <>Stop Overpaying<br />on Loans</>}
            </h1>
            <p className="font-body text-lg md:text-xl text-[#4B5563] leading-relaxed mb-4 max-w-xl animate-fade-in-up-delay-1">
              {t.heroSubtext || 'We compare interest rates, fees, and hidden charges across 20+ banks. No spam, no data selling. You control everything.'}
            </p>
            <p className="font-body text-sm text-gradient font-bold mb-10 animate-fade-in-up-delay-1 tracking-wide">
              {t.motto || 'No Spam. No Secrets. Just Savings.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up-delay-2">
              <Link to="/register">
                <Button className="bg-[#111827] text-white hover:bg-[#000000] rounded-full px-8 py-3 font-body font-semibold h-14 text-base btn-dark-glow" data-testid="hero-cta-button">
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
          <div className="hidden lg:block animate-fade-in-right">
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#059669]/10 via-transparent to-[#3B82F6]/5 rounded-3xl blur-2xl" />
              <img
                src="https://images.unsplash.com/photo-1658480023495-dc8cae9e781e?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=600&h=500&fit=crop"
                alt="Indian professional using smartphone for banking"
                className="relative rounded-3xl shadow-2xl object-cover w-full h-[480px]"
                loading="lazy"
              />
              <div className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-[#059669]/10 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#059669]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-[#0A0A0A] text-sm">Avg. Savings</div>
                    <div className="font-heading font-bold text-gradient text-lg">Rs. 2,34,000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-stats-glass" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-heading text-3xl md:text-4xl font-bold text-gradient tracking-tight">{stat.value}</div>
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
              <div key={i} className="rounded-2xl p-6 md:p-8 feature-card-shade loan-card cursor-pointer" data-testid={`feature-card-${i}`}
                onClick={() => setExpandedFeature(expandedFeature === i ? null : i)}>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#059669]/15 to-[#059669]/5 flex items-center justify-center mb-5">
                    <f.icon className="w-6 h-6 text-[#059669]" strokeWidth={1.5} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center transition-transform duration-300" style={{transform: expandedFeature === i ? 'rotate(180deg)' : 'rotate(0)'}}>
                    <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#0A0A0A] mb-2 tracking-tight">{f.title}</h3>
                <p className="font-body text-[#4B5563] leading-relaxed">{f.desc}</p>
                {expandedFeature === i && (
                  <p className="font-body text-sm text-[#059669] mt-3 pt-3 border-t border-[#059669]/10 leading-relaxed animate-fade-in-up">{featureDetails[i]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-32 px-6 lg:px-8 bg-mesh-light" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280] font-body">{t.howItWorks || 'How It Works'}</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight mt-3">
              {t.fourSimpleSteps || 'Four simple steps'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => {
              const details = [
                t.step1Detail || 'We ask about your loan type, income, employment, and credit score. Takes just 2 minutes.',
                t.step2Detail || 'Our engine compares 35+ products across 18 banks. You see the real total cost — not just the interest rate.',
                t.step3Detail || 'No one calls or emails you unless you click "I\'m Interested" on a specific bank.',
                t.step4Detail || 'See real-time status: Interested → Applied → Approved → Disbursed. Revoke access anytime.',
              ];
              return (
                <div key={i} className="relative cursor-pointer group" data-testid={`step-card-${i}`}
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}>
                  <div className="font-heading text-5xl font-bold text-gradient opacity-20 mb-3">{s.num}</div>
                  <h3 className="font-heading text-lg font-semibold text-[#0A0A0A] mb-2 tracking-tight group-hover:text-[#059669] transition-colors">{s.title}</h3>
                  <p className="font-body text-sm text-[#4B5563] leading-relaxed">{s.desc}</p>
                  {expandedStep === i && (
                    <p className="font-body text-sm text-[#059669] mt-2 pt-2 border-t border-[#059669]/10 animate-fade-in-up">{details[i]}</p>
                  )}
                </div>
              );
            })}
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

      {/* Our Story */}
      <section className="py-20 md:py-32 px-6 lg:px-8 bg-mesh-light" data-testid="our-story-section">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Heart className="w-5 h-5 text-[#059669]" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#059669] font-body">{language === 'hi' ? 'हमारी कहानी' : 'Our Story'}</span>
          </div>
          <div className="space-y-6">
            <div className="feature-card-shade rounded-2xl p-6 md:p-8">
              <p className="font-body text-lg text-[#0A0A0A] leading-relaxed">
                {language === 'hi'
                  ? '"नमस्ते, मैं शुभम हूं, बोकारो से — भारत का एक टियर-2 शहर। बड़े होते हुए मैंने देखा कि अपने आसपास के लोगों के लिए सही वित्तीय निर्णय लेना कितना मुश्किल था — खासकर जब बात लोन की हो।"'
                  : '"Hi, I\'m Shubham, from Bokaro, a Tier-2 city in India. Growing up, I saw how difficult it was for people around me to make the right financial decisions — especially when it came to loans."'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="feature-card-shade rounded-2xl p-6">
                <Target className="w-6 h-6 text-[#F59E0B] mb-3" strokeWidth={1.5} />
                <p className="font-body text-[#4B5563] leading-relaxed">
                  {language === 'hi'
                    ? 'आज भी, लाखों भारतीय बिना स्पष्ट जानकारी के लोन लेते हैं — छिपे शुल्कों या जागरूकता की कमी से पैसे गंवाते हैं।'
                    : 'Even today, millions of Indians take loans without clear visibility into the best options, often losing money due to hidden charges or lack of awareness.'}
                </p>
              </div>
              <div className="feature-card-shade rounded-2xl p-6">
                <Eye className="w-6 h-6 text-[#059669] mb-3" strokeWidth={1.5} />
                <p className="font-body text-[#4B5563] leading-relaxed">
                  {language === 'hi'
                    ? 'ज़्यादातर प्लेटफॉर्म आपका डेटा बेचने पर ध्यान देते हैं, सही निर्णय लेने में मदद करने पर नहीं।'
                    : 'Most platforms focus on selling your data, not helping you make the right decision.'}
                </p>
              </div>
            </div>
            <div className="bg-[#059669]/5 rounded-2xl p-6 md:p-8 border border-[#059669]/10">
              <p className="font-heading font-semibold text-lg text-[#059669] leading-relaxed">
                {language === 'hi'
                  ? 'रिंकोश इसे बदलने के लिए बनाया गया है — आपको पूर्ण नियंत्रण, पारदर्शिता, और जो सच में आपके लिए सबसे अच्छा है उसे चुनने की क्षमता देना।'
                  : 'Rinkosh is built to change that — giving you full control, transparency, and the ability to choose what\'s truly best for you.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Savings Stats */}
      <section className="py-16 md:py-24 px-6 lg:px-8" data-testid="savings-stats-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280] font-body">{language === 'hi' ? 'छोटे अंतर, बड़ी बचत' : 'Small Difference, Big Savings'}</span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mt-3">
              {language === 'hi' ? '0.10% कम ब्याज दर का मतलब = बड़ी बचत' : 'Even 0.10% lower rate = Big savings'}
            </h2>
            <p className="font-body text-[#4B5563] mt-2">{language === 'hi' ? '10,00,000 रुपये के लोन पर' : 'On a Rs. 10,00,000 loan'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: language === 'hi' ? '5 साल' : '5 Years', low: '5,000', high: '8,000' },
              { label: language === 'hi' ? '10 साल' : '10 Years', low: '10,000', high: '20,000' },
              { label: language === 'hi' ? '20 साल' : '20 Years', low: '35,000', high: '75,000' },
            ].map((s, i) => (
              <div key={i} className="feature-card-shade rounded-2xl p-6 text-center loan-card" data-testid={`savings-tile-${i}`}>
                <div className="font-heading font-bold text-sm text-[#4B5563] mb-3 uppercase tracking-wider">{s.label}</div>
                <div className="font-heading text-2xl md:text-3xl font-bold text-gradient mb-1">Rs.{s.low} - {s.high}</div>
                <div className="font-body text-xs text-[#9CA3AF]">{language === 'hi' ? 'अनुमानित बचत' : 'Estimated savings'}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMI Calculator */}
      <section className="py-16 md:py-24 px-6 lg:px-8 bg-mesh-light" data-testid="emi-calculator-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280] font-body">{language === 'hi' ? 'EMI कैलकुलेटर' : 'EMI Calculator'}</span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0A0A0A] tracking-tight mt-3">
              {language === 'hi' ? 'अपनी मासिक EMI जानें' : 'Know Your Monthly EMI'}
            </h2>
          </div>
          <EmiCalculator showCta />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 px-6 lg:px-8 bg-cta-gradient relative overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(5,150,105,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.2) 0%, transparent 50%)'}} />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            {t.readyToSave || 'Ready to save on your next loan?'}
          </h2>
          <p className="font-body text-lg text-[#9CA3AF] mb-8">
            {t.joinThousands || 'Join thousands of Indians making smarter borrowing decisions.'}
          </p>
          <Link to="/register">
            <Button className="bg-[#059669] text-white hover:bg-[#047857] rounded-full px-10 py-3 font-body font-semibold h-14 text-base btn-glow" data-testid="cta-signup-button">
              {t.getStartedFree || 'Get Started Free'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-8 border-t border-[#059669]/5" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-6 h-6 object-contain" />
            <span className="font-heading font-bold text-[#0A0A0A] tracking-tight">Rinkosh</span>
          </div>
          <p className="font-body text-sm text-[#9CA3AF]">Transparent lending for everyone.</p>
        </div>
      </footer>
    </div>
  );
}
