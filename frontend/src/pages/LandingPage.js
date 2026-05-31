import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatWidget } from '../components/ChatWidget';
import { usePageView, useAnalytics } from '../lib/analytics';
import api from '../lib/api';

import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { EmiCalculatorSection } from '../components/landing/EmiCalculatorSection';
import { TrustCards, FounderStory } from '../components/landing/TrustAndFounder';
import { BrowseLoans, LoanContextModal } from '../components/landing/BrowseLoans';
import { CtaSection, TalkToUsToggle, LandingFooter, CompareBarAndSheet } from '../components/landing/CtaAndFooter';
import { calcEmi } from '../components/landing/utils';

export default function LandingPage() {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  usePageView('landing');

  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sortBy, setSortBy] = useState('total_cost');
  const [profileModal, setProfileModal] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [loanCtx, setLoanCtx] = useState({ amount: 500000, tenure: 36, cibil: 'any' });

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/loans/products');
      setAllProducts(data);
    } catch (err) { console.error('Fetch products:', err); }
    finally { setProductsLoading(false); }
  }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Scroll-spy: highlight nav links based on visible section
  useEffect(() => {
    const sectionIds = ['emi-calculator', 'browse-loans'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
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

  // Enrich + filter + sort loan products
  const filteredProducts = useMemo(() => {
    const enriched = allProducts.map(p => {
      const { emi, total, interest } = calcEmi(loanCtx.amount, p.interest_rate, loanCtx.tenure);
      return { ...p, calc_emi: emi, calc_total: total, calc_interest: interest };
    });
    let list = selectedCategory ? enriched.filter(p => p.loan_type === selectedCategory) : enriched;
    list = sortBy === 'total_cost'
      ? [...list].sort((a, b) => a.calc_total - b.calc_total)
      : [...list].sort((a, b) => a.interest_rate - b.interest_rate);
    if (list.length > 0) list[0].isBestValue = true;
    return list;
  }, [allProducts, loanCtx, selectedCategory, sortBy]);

  const toggleCompare = (p) => {
    setCompareList(prev => {
      if (prev.find(x => x.product_id === p.product_id)) return prev.filter(x => x.product_id !== p.product_id);
      if (prev.length >= 4) return prev;
      return [...prev, p];
    });
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      <LandingNavbar
        t={t}
        isLoggedIn={isLoggedIn}
        user={user}
        activeSection={activeSection}
        onLogout={handleLogout}
        navigate={navigate}
      />
      <HeroSection t={t} />
      <EmiCalculatorSection t={t} />
      <TrustCards t={t} />
      <FounderStory t={t} />
      <BrowseLoans
        t={t}
        products={filteredProducts}
        loading={productsLoading}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        loanCtx={loanCtx}
        setProfileModal={setProfileModal}
        compareList={compareList}
        toggleCompare={toggleCompare}
        isLoggedIn={isLoggedIn}
        user={user}
        navigate={navigate}
        track={track}
      />
      <CtaSection t={t} />
      <TalkToUsToggle t={t} />
      <LandingFooter t={t} />
      <CompareBarAndSheet
        t={t}
        compareList={compareList}
        setCompareList={setCompareList}
        compareOpen={compareOpen}
        setCompareOpen={setCompareOpen}
      />
      <LoanContextModal
        t={t}
        open={profileModal}
        onClose={() => setProfileModal(false)}
        loanCtx={loanCtx}
        setLoanCtx={setLoanCtx}
      />
      <ChatWidget />
    </div>
  );
}
