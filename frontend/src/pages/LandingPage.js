import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { ChatWidget } from '../components/ChatWidget';
import { BankLogo } from '../lib/bankLogos';
import { usePageView, useAnalytics } from '../lib/analytics';
import api, { formatIndianNumber } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import {
  Shield, ArrowRight, Eye, Lock, ChevronDown,
  Heart, Target, LogOut, Loader2,
  Linkedin, Mail, Phone, Headphones, ExternalLink,
  Sparkles, SlidersHorizontal, X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// EMI calculator helper
function calcEmi(principal, annualRate, months) {
  if (!principal || !months) return { emi: 0, total: 0, interest: 0 };
  const r = annualRate / (12 * 100);
  if (r === 0) return { emi: Math.round(principal / months), total: principal, interest: 0 };
  const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  const total = Math.round(emi * months);
  return { emi: Math.round(emi), total, interest: total - principal };
}

// Format Rs with Indian commas
const fmtRs = (n) => '₹' + Number(n).toLocaleString('en-IN');

const CATEGORIES = [
  { key: null, tKey: 'catAll' },
  { key: 'personal', tKey: 'catPersonal' },
  { key: 'home', tKey: 'catHome' },
  { key: 'car', tKey: 'catCar' },
  { key: 'business', tKey: 'catBusiness' },
  { key: 'education', tKey: 'catEducation' },
  { key: 'gold', tKey: 'catGold' },
  { key: 'msme', tKey: 'catMsme' },
  { key: 'bike', tKey: 'catBike' },
  { key: 'refinance', tKey: 'catRefinance' },
  { key: 'lap', tKey: 'catLap' },
  { key: 'working_capital', tKey: 'catWorkingCapital' },
  { key: 'plot', tKey: 'catPlot' },
  { key: 'used_vehicle', tKey: 'catUsedVehicle' },
  { key: 'mutual_funds', tKey: 'catMutualFunds' },
];

export default function LandingPage() {
  const { user, loading, logout } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  usePageView('landing');

  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sortBy, setSortBy] = useState('total_cost');
  const [profileModal, setProfileModal] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Loan context for EMI calculations
  const [loanCtx, setLoanCtx] = useState({ amount: 500000, tenure: 36, cibil: 'any' });

  // EMI calculator state
  const [calcAmt, setCalcAmt] = useState(1000000);
  const [calcRate, setCalcRate] = useState(10);
  const [calcTenure, setCalcTenure] = useState(60);
  const calcResult = useMemo(() => calcEmi(calcAmt, calcRate, calcTenure), [calcAmt, calcRate, calcTenure]);
  const pieData = [
    { name: t.principal || 'Principal', value: calcAmt, color: '#0D1B2A' },
    { name: t.interest || 'Interest', value: calcResult.interest, color: '#C8860A' },
  ];

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/loans/products');
      setAllProducts(data);
    } catch (err) { console.error('Fetch products:', err); }
    finally { setProductsLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Scroll-spy: highlight nav links based on visible section
  useEffect(() => {
    const sectionIds = ['emi-calculator', 'browse-loans'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const isLoggedIn = !loading && user;

  // Compute EMI & total cost for each product based on loanCtx
  const enrichedProducts = useMemo(() => {
    return allProducts.map(p => {
      const { emi, total, interest } = calcEmi(loanCtx.amount, p.interest_rate, loanCtx.tenure);
      return { ...p, calc_emi: emi, calc_total: total, calc_interest: interest };
    });
  }, [allProducts, loanCtx]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = selectedCategory ? enrichedProducts.filter(p => p.loan_type === selectedCategory) : enrichedProducts;
    if (sortBy === 'total_cost') list = [...list].sort((a, b) => a.calc_total - b.calc_total);
    else list = [...list].sort((a, b) => a.interest_rate - b.interest_rate);
    return list;
  }, [enrichedProducts, selectedCategory, sortBy]);

  const bestValueId = filtered.length > 0 ? filtered[0].product_id : null;

  const toggleCompare = (p) => {
    setCompareList(prev => {
      if (prev.find(x => x.product_id === p.product_id)) return prev.filter(x => x.product_id !== p.product_id);
      if (prev.length >= 4) return prev;
      return [...prev, p];
    });
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveSection('');
  };

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">

      {/* Trust Strip */}
      <div className="bg-[#F3F4F6] text-center py-2 px-4" data-testid="trust-strip">
        <p className="font-body text-xs text-[#4B5563]">
          <Lock className="w-3 h-3 inline-block mr-1 -mt-0.5 text-[#059669]" />
          {t.trustStrip}
        </p>
      </div>

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] shadow-sm" data-testid="landing-navbar">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <a href="/" onClick={scrollToTop} className="flex items-center gap-2" data-testid="logo-home-link">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-7 h-7 object-contain" />
            <span className="font-heading font-bold text-lg text-[#0D1B2A] tracking-tight">Rinkosh</span>
          </a>

          {/* Section nav links — desktop */}
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
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#4B5563]" data-testid="nav-logout-button"><LogOut className="w-4 h-4" /></Button>
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

      {/* Hero Section */}
      <section className="py-16 md:py-20 px-6 lg:px-8" data-testid="hero-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left 60% */}
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#92400E] rounded-full px-3.5 py-1 mb-6" data-testid="hero-badge">
              <span className="font-body text-xs font-semibold">{t.heroBadgeV2}</span>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-[#0D1B2A] tracking-[-0.03em] leading-[1.1] mb-5" data-testid="hero-headline">
              {t.heroHeadlineV2}
            </h1>
            <p className="font-body text-base md:text-lg text-[#64748B] leading-relaxed mb-8 max-w-lg">
              {t.heroSubtextV2}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <a href="#browse-loans">
                <Button className="bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg px-7 h-12 font-body font-bold text-base shadow-md hover:shadow-xl transition-shadow" data-testid="hero-compare-btn">
                  {t.compareLoansNow} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="#emi-calculator">
                <Button className="bg-white text-[#0D1B2A] hover:bg-[#F3F4F6] rounded-lg px-7 h-12 font-body font-bold text-base border-2 border-[#0D1B2A] shadow-sm transition-shadow" data-testid="hero-emi-btn">
                  {t.tryEmiCalculator}
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 text-[#64748B]">
              <span className="font-body text-sm"><strong className="text-[#0D1B2A]">72+</strong> {t.products72.replace('72+ ', '')}</span>
              <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
              <span className="font-body text-sm"><strong className="text-[#0D1B2A]">20</strong> {t.banks20.replace('20 ', '')}</span>
              <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
              <span className="font-body text-sm"><strong className="text-[#0D1B2A]">₹0</strong> {t.zeroSpamCalls.replace('₹0 ', '')}</span>
            </div>
          </div>
          {/* Right 40% — Mock best match card with amber left-border */}
          <div className="lg:col-span-2" data-testid="hero-mock-card">
            <Card className="rounded-2xl border border-[#E5E7EB] border-l-4 border-l-[#C8860A] p-6 relative shadow-md">
              <div className="absolute -top-3 left-5">
                <span className="bg-[#FEF3C7] text-[#92400E] font-body text-[11px] font-bold px-3 py-1 rounded-full">{t.bestMatch}</span>
              </div>
              <div className="flex items-center gap-3 mb-5 mt-1">
                <BankLogo bankName="HDFC Bank" />
                <div>
                  <div className="font-heading font-semibold text-sm text-[#0D1B2A]">HDFC Personal Loan</div>
                  <div className="font-body text-xs text-[#94A3B8]">{t.personalLoan}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.ratePerAnnum}</div>
                  <div className="font-heading font-bold text-lg text-[#0D1B2A]">10.5%</div>
                </div>
                <div>
                  <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.emiEst}</div>
                  <div className="font-heading font-bold text-lg text-[#0D1B2A]">₹21,247<span className="text-xs font-normal text-[#94A3B8]">/mo</span></div>
                </div>
                <div>
                  <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.totalCostLabel}</div>
                  <div className="font-heading font-bold text-xl text-[#0D1B2A]">₹7,64,892</div>
                </div>
                <div>
                  <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.approvalOddsLabel}</div>
                  <div className="inline-flex items-center bg-[#DCFCE7] text-[#166534] font-heading font-bold text-sm rounded-full px-3 py-0.5 mt-1">89%</div>
                </div>
              </div>
              <div className="text-center font-body text-[10px] text-[#94A3B8]">{t.based500k36mo}</div>
            </Card>
          </div>
        </div>
      </section>

      {/* EMI Calculator */}
      <section id="emi-calculator" className="py-16 md:py-20 px-6 lg:px-8 bg-[#F8F9FA]" data-testid="emi-calculator-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Sliders */}
            <div className="space-y-8">
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.howMuchNeed}</label>
                <Slider value={[calcAmt]} min={50000} max={10000000} step={50000} onValueChange={([v]) => setCalcAmt(v)} className="mb-2" />
                <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>₹50K</span><span className="font-semibold text-[#0D1B2A]">{fmtRs(calcAmt)}</span><span>₹1 Cr</span></div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.expectedRate}</label>
                <Slider value={[calcRate]} min={5} max={24} step={0.25} onValueChange={([v]) => setCalcRate(v)} className="mb-2" />
                <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>5%</span><span className="font-semibold text-[#0D1B2A]">{calcRate}%</span><span>24%</span></div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3 block">{t.forHowLong}</label>
                <Slider value={[calcTenure]} min={6} max={360} step={6} onValueChange={([v]) => setCalcTenure(v)} className="mb-2" />
                <div className="flex justify-between font-body text-xs text-[#94A3B8]"><span>6 mo</span><span className="font-semibold text-[#0D1B2A]">{calcTenure >= 12 ? `${Math.round(calcTenure/12)} yr` : `${calcTenure} mo`}</span><span>30 yr</span></div>
              </div>
              {/* Donut chart */}
              <div className="flex justify-center">
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0D1B2A]" /><span className="font-body text-xs text-[#64748B]">{t.principal}</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#C8860A]" /><span className="font-body text-xs text-[#64748B]">{t.interest}</span></div>
              </div>
            </div>
            {/* Results */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <Card className="rounded-xl border border-[#E5E7EB] p-6">
                  <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.monthlyEMI}</div>
                  <div className="font-heading font-bold text-3xl text-[#0D1B2A]">{fmtRs(calcResult.emi)}</div>
                </Card>
                <Card className="rounded-xl border border-[#E5E7EB] p-6">
                  <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.totalInterestLabel}</div>
                  <div className="font-heading font-bold text-3xl text-[#C8860A]">{fmtRs(calcResult.interest)}</div>
                </Card>
                <Card className="rounded-xl border border-[#E5E7EB] p-6">
                  <div className="font-body text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{t.totalRepayment}</div>
                  <div className="font-heading font-bold text-3xl text-[#0D1B2A]">{fmtRs(calcResult.total)}</div>
                </Card>
              </div>
              <a href="#browse-loans">
                <Button className="w-full bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg h-12 font-body font-bold text-base mt-4 shadow-md hover:shadow-lg transition-shadow" data-testid="emi-see-loans-btn">
                  {t.seeLoansMatchEmi} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Cards — 3-column with colored icon circles */}
      <section className="py-16 px-6 lg:px-8" data-testid="trust-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, color: '#059669', bgColor: '#DCFCE7', title: t.zeroSpamGuaranteed, body: t.zeroSpamDesc },
            { icon: Eye, color: '#C8860A', bgColor: '#FEF3C7', title: t.totalCostTransparency, body: t.totalCostDesc },
            { icon: Lock, color: '#0D1B2A', bgColor: '#E0E7FF', title: t.dataStaysYours, body: t.dataStaysDesc },
          ].map((tc) => (
            <Card key={tc.title} className="rounded-xl border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow" data-testid="trust-card">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: tc.bgColor }}>
                <tc.icon className="w-6 h-6" style={{ color: tc.color }} strokeWidth={2} />
              </div>
              <h3 className="font-heading font-semibold text-base text-[#0D1B2A] mb-2">{tc.title}</h3>
              <p className="font-body text-sm text-[#64748B] leading-relaxed">{tc.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Founder Story — moved above Browse Loans, 2-column layout */}
      <section className="py-14 md:py-16 px-6 lg:px-8 bg-[#FFFBF5]" data-testid="our-story-section">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="w-5 h-5 text-[#C8860A]" strokeWidth={1.5} />
            <span className="font-body text-xs uppercase tracking-widest font-bold text-[#C8860A]">{t.ourStoryTag}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
            {/* Left: Founder avatar */}
            <div className="md:col-span-3 flex md:justify-start justify-center">
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[#0D1B2A] flex items-center justify-center text-white font-heading font-bold text-3xl shadow-lg" data-testid="founder-avatar">SK</div>
                <div className="text-center md:text-left">
                  <div className="font-heading font-bold text-base text-[#0D1B2A]">{t.founderName}</div>
                  <div className="font-body text-xs text-[#94A3B8]">{t.founderTitle}</div>
                </div>
                <a href="https://www.linkedin.com/in/shubhamkr0108/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors" data-testid="founder-linkedin">
                  <Linkedin className="w-3.5 h-3.5" /><span className="font-body text-xs font-semibold">{t.linkedinLabel}</span>
                </a>
              </div>
            </div>
            {/* Right: Quote */}
            <div className="md:col-span-9">
              <div className="text-[#C8860A] text-5xl font-heading font-bold leading-none mb-3" aria-hidden>“</div>
              <p className="font-body text-lg md:text-xl text-[#334155] leading-relaxed">
                {t.founderQuote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Loans Section */}
      <section id="browse-loans" className="py-12 md:py-16 px-6 lg:px-8" data-testid="browse-loans-section">
        <div className="max-w-7xl mx-auto">

          {/* Context bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4" data-testid="loan-context-bar">
            <div className="font-body text-sm text-[#64748B]">
              {t.showingLoansFor} <strong className="text-[#0D1B2A]">{fmtRs(loanCtx.amount)}</strong> · <strong className="text-[#0D1B2A]">{loanCtx.tenure} {t.months}</strong> · <strong className="text-[#0D1B2A]">{loanCtx.cibil === 'any' ? t.anyCibil : loanCtx.cibil}</strong>
              <button onClick={() => setProfileModal(true)} className="text-[#0D1B2A] font-semibold ml-2 hover:underline" data-testid="change-context-btn">{t.change} ↗</button>
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2 font-body text-sm text-[#64748B]">
              {t.sortByLabel}
              <button onClick={() => setSortBy('total_cost')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'total_cost' ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`} data-testid="sort-total-cost">{t.totalCostLabel}</button>
              <button onClick={() => setSortBy('interest_rate')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'interest_rate' ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`} data-testid="sort-interest">{t.interestRateSort}</button>
            </div>
          </div>

          {/* Category pills — horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide" data-testid="loan-category-pills">
            {CATEGORIES.map(cat => {
              const count = cat.key ? allProducts.filter(p => p.loan_type === cat.key).length : allProducts.length;
              if (cat.key && count === 0) return null;
              return (
                <button
                  key={cat.key || 'all'}
                  onClick={() => { setSelectedCategory(cat.key); track('browse_category', { category: cat.key || 'all' }); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-body text-sm transition-colors ${selectedCategory === cat.key ? 'bg-[#0D1B2A] text-white font-semibold' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'}`}
                  data-testid={`category-${cat.key || 'all'}`}
                >
                  {t[cat.tKey]} ({count})
                </button>
              );
            })}
          </div>

          {/* Loan Cards */}
          {productsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0D1B2A]" /></div>
          ) : (
            <div className="space-y-3" data-testid="loan-products-grid">
              {filtered.map((product) => {
                const isBest = product.product_id === bestValueId;
                const approvalScore = Math.min(95, Math.max(10, 50 + (product.min_credit_score <= 650 ? 15 : product.min_credit_score <= 700 ? 5 : -5) + (product.interest_rate <= 10 ? -5 : product.interest_rate <= 13 ? 0 : 10)));
                const approvalColor = approvalScore >= 80 ? 'bg-[#DCFCE7] text-[#166534]' : approvalScore >= 60 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F3F4F6] text-[#64748B]';
                const isSelected = compareList.find(x => x.product_id === product.product_id);
                return (
                  <div
                    key={product.product_id}
                    className={`rounded-xl border p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md ${isBest ? 'border-[#C8860A] border-t-2 bg-[#FFFBEB]/30' : 'border-[#E5E7EB] bg-white'}`}
                    data-testid={`product-card-${product.product_id}`}
                  >
                    {/* Left: Bank info */}
                    <div className="flex items-center gap-3 md:w-52 flex-shrink-0">
                      <button onClick={() => toggleCompare(product)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-[#0D1B2A] border-[#0D1B2A]' : 'border-[#D1D5DB] hover:border-[#0D1B2A]'}`} data-testid={`compare-${product.product_id}`}>
                        {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <BankLogo bankName={product.bank_name} />
                      <div className="min-w-0">
                        <div className="font-heading font-semibold text-sm text-[#0D1B2A] truncate">{product.bank_name}</div>
                        <div className="font-body text-xs text-[#94A3B8] truncate">{product.product_name}</div>
                      </div>
                      {isBest && <span className="ml-auto md:ml-0 bg-[#FEF3C7] text-[#92400E] font-body text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{t.bestValue}</span>}
                    </div>

                    {/* Middle: 4 numbers */}
                    <div className="flex-1 grid grid-cols-4 gap-3 md:gap-6">
                      <div>
                        <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.ratePerAnnum}</div>
                        <div className="font-heading font-bold text-sm text-[#0D1B2A]">{product.interest_rate}%</div>
                      </div>
                      <div>
                        <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.emiEst}</div>
                        <div className="font-heading font-semibold text-sm text-[#0D1B2A]">{fmtRs(product.calc_emi)}<span className="text-[10px] text-[#94A3B8] font-normal">/mo</span></div>
                      </div>
                      <div>
                        <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.totalCostLabel}</div>
                        <div className="font-heading font-bold text-base text-[#0D1B2A]">{fmtRs(product.calc_total)}</div>
                      </div>
                      <div>
                        <div className="font-body text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.approvalOddsLabel}</div>
                        <span className={`inline-block font-heading font-bold text-xs rounded-full px-2.5 py-0.5 mt-0.5 ${approvalColor}`}>{approvalScore}%</span>
                      </div>
                    </div>

                    {/* Right: CTA */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isLoggedIn ? (
                        <Button size="sm" onClick={() => navigate(user?.has_profile ? '/dashboard' : `/onboarding?loan_type=${product.loan_type}`)} className="bg-[#0D1B2A] hover:bg-[#1B2D45] text-white rounded-lg px-5 font-body text-xs font-bold whitespace-nowrap shadow-md hover:shadow-lg transition-shadow" data-testid={`apply-${product.product_id}`}>
                          {t.applyWithoutSpam} <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      ) : (
                        <Link to={`/register?loan_type=${product.loan_type}`}>
                          <Button size="sm" className="bg-[#0D1B2A] hover:bg-[#1B2D45] text-white rounded-lg px-5 font-body text-xs font-bold whitespace-nowrap shadow-md hover:shadow-lg transition-shadow" data-testid={`apply-${product.product_id}`}>
                            {t.applyWithoutSpam} <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                      <span className="font-body text-[10px] text-[#94A3B8]">{t.processingLabel} {product.processing_fee_pct}%</span>
                      {product.features && product.features.length > 0 && (
                        <div className="flex gap-1 mt-0.5">{product.features.slice(0, 2).map((f, fi) => <span key={fi} className="font-body text-[9px] bg-[#F3F4F6] text-[#64748B] rounded-full px-2 py-0.5">{f}</span>)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Onboarding nudge */}
          {isLoggedIn && !user?.has_profile && (
            <div className="mt-8 bg-[#F8F9FA] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#E5E7EB]" data-testid="onboarding-nudge">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0D1B2A]">{t.getPersonalizedReco}</h3>
                <p className="font-body text-sm text-[#64748B] mt-1">{t.completeProfileBlurb}</p>
              </div>
              <Button onClick={() => navigate('/onboarding')} className="bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg px-6 font-body font-bold whitespace-nowrap shadow-md hover:shadow-lg transition-shadow" data-testid="onboarding-nudge-btn">
                {t.completeProfileBtn} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-6 lg:px-8" data-testid="cta-section">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0D1B2A] tracking-tight mb-3">
            {t.stillUnsure}
          </h2>
          <p className="font-body text-base text-[#64748B] mb-8">
            {t.aiAdvisorBlurb}
          </p>
          <Button className="bg-[#C8860A] text-white hover:bg-[#A16207] rounded-lg px-8 h-12 font-body font-bold text-base shadow-md hover:shadow-xl transition-shadow" data-testid="cta-ai-button">
            <Sparkles className="w-4 h-4 mr-2" /> {t.askAiAdvisor} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Talk to Us Toggle */}
      <div className="fixed bottom-24 md:bottom-8 left-4 md:left-6 z-[998]">
        <button onClick={() => setContactOpen(!contactOpen)} className="w-12 h-12 rounded-full bg-[#0D1B2A] text-white shadow-xl hover:bg-[#1B2D45] transition-all flex items-center justify-center" data-testid="talk-to-us-toggle">
          {contactOpen ? <ChevronDown className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
        </button>
        {contactOpen && (
          <div className="absolute bottom-16 left-0 w-72 bg-white rounded-xl shadow-2xl border border-[#E5E7EB] p-5 space-y-3" data-testid="talk-to-us-panel">
            <h4 className="font-heading font-bold text-sm text-[#0D1B2A]">{t.talkToUs}</h4>
            <a href="mailto:support@rinkosh.com" className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F9FA] hover:bg-[#F3F4F6] transition-colors" data-testid="contact-email">
              <Mail className="w-4 h-4 text-[#059669]" /><div><div className="font-body text-xs font-semibold text-[#0D1B2A]">{t.emailSupport}</div><div className="font-body text-[10px] text-[#059669]">support@rinkosh.com</div></div>
            </a>
            <a href="https://www.linkedin.com/in/shubhamkr0108/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-[#F8F9FA] hover:bg-[#F3F4F6] transition-colors" data-testid="contact-linkedin">
              <Linkedin className="w-4 h-4 text-[#0A66C2]" /><div><div className="font-body text-xs font-semibold text-[#0D1B2A]">{t.connectLinkedin}</div><div className="font-body text-[10px] text-[#0A66C2]">{t.founderName}</div></div>
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-10 px-6 lg:px-8 border-t border-[#E5E7EB] bg-white" data-testid="footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-6 h-6" />
                <span className="font-heading font-bold text-[#0D1B2A]">{t.brand}</span>
              </div>
              <p className="font-body text-sm text-[#64748B] leading-relaxed max-w-sm">{t.footerDesc}</p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3">{t.contact}</h4>
              <a href="mailto:support@rinkosh.com" className="flex items-center gap-2 font-body text-sm text-[#64748B] hover:text-[#059669] mb-2"><Mail className="w-3.5 h-3.5" />support@rinkosh.com</a>
              <a href="https://www.linkedin.com/in/shubhamkr0108/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-body text-sm text-[#64748B] hover:text-[#0A66C2]"><Linkedin className="w-3.5 h-3.5" />{t.connectLinkedin} <ExternalLink className="w-3 h-3" /></a>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-[#0D1B2A] mb-3">{t.quickLinks}</h4>
              <a href="#browse-loans" className="block font-body text-sm text-[#64748B] hover:text-[#0D1B2A] mb-2">{t.navBrowseLoans}</a>
              <a href="#emi-calculator" className="block font-body text-sm text-[#64748B] hover:text-[#0D1B2A] mb-2">{t.navEmiCalc}</a>
              <Link to="/privacy" className="block font-body text-sm text-[#64748B] hover:text-[#0D1B2A] mb-2">{t.privacyPolicy}</Link>
              <Link to="/terms" className="block font-body text-sm text-[#64748B] hover:text-[#0D1B2A] mb-2">{t.termsOfService}</Link>
              <Link to="/bank-onboarding" className="block font-body text-sm text-[#059669] hover:text-[#047857] font-semibold">{t.bankPartner}</Link>
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-6 space-y-2">
            <p className="font-body text-xs text-[#94A3B8]">{t.disclaimer}</p>
            <p className="font-body text-xs text-[#94A3B8]">{t.copyright} · <Link to="/privacy" className="hover:text-[#64748B]">{t.privacyPolicy}</Link> · <Link to="/terms" className="hover:text-[#64748B]">{t.termsShort}</Link></p>
          </div>
        </div>
      </footer>

      {/* Compare Bar */}
      {compareList.length >= 2 && !compareOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[997] bg-[#0D1B2A] text-white py-3 px-6 flex items-center justify-between" data-testid="compare-bar">
          <div className="flex items-center gap-3">
            <span className="font-body text-sm">{compareList.length} {t.compare.toLowerCase ? t.compare.toLowerCase() : t.compare}</span>
            <div className="flex gap-1">{compareList.map(p => <span key={p.product_id} className="font-body text-[10px] bg-white/10 rounded-full px-2 py-0.5">{p.bank_name}</span>)}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCompareList([])} className="text-white/60 hover:text-white text-xs">Clear</Button>
            <Button size="sm" onClick={() => setCompareOpen(true)} className="bg-[#C8860A] hover:bg-[#A16207] text-white rounded-lg px-5 text-xs font-bold shadow-md" data-testid="open-compare-btn">{t.compare}</Button>
          </div>
        </div>
      )}

      {/* Compare Sheet */}
      {compareOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setCompareOpen(false)} data-testid="compare-overlay">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="compare-sheet">
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-heading font-bold text-lg text-[#0D1B2A]">{t.compare}</h3>
              <button onClick={() => setCompareOpen(false)} className="text-[#94A3B8] hover:text-[#0D1B2A]"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-3 font-body text-xs text-[#94A3B8] w-36">Feature</th>
                  {compareList.map(p => <th key={p.product_id} className="text-center px-4 py-3 min-w-[160px]"><BankLogo bankName={p.bank_name} /><div className="font-heading font-semibold text-xs text-[#0D1B2A] mt-1">{p.bank_name}</div></th>)}
                </tr></thead>
                <tbody>
                  {[
                    { label: t.interestRate, key: 'interest_rate', fmt: v => `${v}%`, best: 'lowest' },
                    { label: t.monthlyEMI, key: 'calc_emi', fmt: v => fmtRs(v), best: 'lowest' },
                    { label: t.totalCostLabel, key: 'calc_total', fmt: v => fmtRs(v), best: 'lowest' },
                    { label: t.processingFee, key: 'processing_fee_pct', fmt: v => v === 0 ? 'Zero' : `${v}%`, best: 'lowest' },
                    { label: 'Max Amount', key: 'max_amount', fmt: v => fmtRs(v), best: 'highest' },
                    { label: 'Min CIBIL', key: 'min_credit_score', fmt: v => v === 0 ? 'None' : String(v), best: 'lowest' },
                  ].map(m => {
                    const vals = compareList.map(p => p[m.key]);
                    const bestV = m.best === 'lowest' ? Math.min(...vals) : Math.max(...vals);
                    return (
                      <tr key={m.key} className="border-b border-[#F3F4F6] hover:bg-[#F8F9FA]">
                        <td className="px-4 py-3 font-body text-xs text-[#64748B] font-medium">{m.label}</td>
                        {compareList.map(p => {
                          const isBest = p[m.key] === bestV && compareList.length > 1;
                          return <td key={p.product_id} className="text-center px-4 py-3"><span className={`font-heading font-bold text-sm ${isBest ? 'text-[#059669]' : 'text-[#0D1B2A]'}`}>{m.fmt(p[m.key])}</span>{isBest && <span className="block font-body text-[9px] text-[#059669]">{t.best}</span>}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Loan Profile Modal */}
      {profileModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setProfileModal(false)}>
          <div className="bg-white w-full max-w-md rounded-xl p-6" onClick={e => e.stopPropagation()} data-testid="profile-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-lg text-[#0D1B2A]">{t.setLoanContext}</h3>
              <button onClick={() => setProfileModal(false)}><X className="w-5 h-5 text-[#94A3B8]" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-2 block">{t.loanAmount}</label>
                <Slider value={[loanCtx.amount]} min={50000} max={10000000} step={50000} onValueChange={([v]) => setLoanCtx(p => ({...p, amount: v}))} />
                <div className="font-body text-xs text-[#64748B] mt-1 text-right">{fmtRs(loanCtx.amount)}</div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-2 block">{t.tenure}</label>
                <div className="flex gap-2">{[12,24,36,48,60].map(m => (
                  <button key={m} onClick={() => setLoanCtx(p => ({...p, tenure: m}))} className={`flex-1 py-2 rounded-lg font-body text-sm font-semibold transition-colors ${loanCtx.tenure === m ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`}>{m}mo</button>
                ))}</div>
              </div>
              <div>
                <label className="font-heading font-semibold text-sm text-[#0D1B2A] mb-2 block">{t.cibilScore}</label>
                <div className="flex gap-2">{[{v:'any',l:t.anyCibil},{v:'750+',l:'750+'},{v:'700-750',l:'700-750'},{v:'650-700',l:'650-700'},{v:'<650',l:'<650'}].map(c => (
                  <button key={c.v} onClick={() => setLoanCtx(p => ({...p, cibil: c.v}))} className={`flex-1 py-2 rounded-lg font-body text-xs font-semibold transition-colors ${loanCtx.cibil === c.v ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`}>{c.l}</button>
                ))}</div>
              </div>
              <Button onClick={() => setProfileModal(false)} className="w-full bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg h-10 font-body font-bold">{t.applyUpdateCards}</Button>
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
