import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { BankLogo } from '../../lib/bankLogos';
import { CATEGORIES, fmtRs } from './utils';

export function BrowseLoans({
  t, products, loading, selectedCategory, setSelectedCategory,
  sortBy, setSortBy, loanCtx, setProfileModal, compareList,
  toggleCompare, isLoggedIn, user, navigate, track,
}) {
  return (
    <section id="browse-loans" className="py-12 md:py-16 px-6 lg:px-8" data-testid="browse-loans-section">
      <div className="max-w-7xl mx-auto">

        {/* Context bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4" data-testid="loan-context-bar">
          <div className="font-body text-sm text-[#64748B]">
            {t.showingLoansFor} <strong className="text-[#0D1B2A]">{fmtRs(loanCtx.amount)}</strong> · <strong className="text-[#0D1B2A]">{loanCtx.tenure} {t.months}</strong> · <strong className="text-[#0D1B2A]">{loanCtx.cibil === 'any' ? t.anyCibil : loanCtx.cibil}</strong>
            <button onClick={() => setProfileModal(true)} className="text-[#0D1B2A] font-semibold ml-2 hover:underline" data-testid="change-context-btn">{t.change} ↗</button>
          </div>
          <div className="flex items-center gap-2 font-body text-sm text-[#64748B]">
            {t.sortByLabel}
            <button onClick={() => setSortBy('total_cost')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'total_cost' ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`} data-testid="sort-total-cost">{t.totalCostLabel}</button>
            <button onClick={() => setSortBy('interest_rate')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'interest_rate' ? 'bg-[#0D1B2A] text-white' : 'bg-[#F3F4F6] text-[#64748B]'}`} data-testid="sort-interest">{t.interestRateSort}</button>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide" data-testid="loan-category-pills">
          {CATEGORIES.map(cat => {
            const count = cat.key ? products.filter(p => p.loan_type === cat.key).length : products.length;
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

        {/* Loan cards */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0D1B2A]" /></div>
        ) : (
          <div className="space-y-3" data-testid="loan-products-grid">
            {products.map((product) => {
              const isBest = product.isBestValue;
              const approvalScore = Math.min(95, Math.max(10, 50 + (product.min_credit_score <= 650 ? 15 : product.min_credit_score <= 700 ? 5 : -5) + (product.interest_rate <= 10 ? -5 : product.interest_rate <= 13 ? 0 : 10)));
              const approvalColor = approvalScore >= 80 ? 'bg-[#DCFCE7] text-[#166534]' : approvalScore >= 60 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F3F4F6] text-[#64748B]';
              const isSelected = compareList.find(x => x.product_id === product.product_id);
              return (
                <div
                  key={product.product_id}
                  className={`rounded-xl border p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md ${isBest ? 'border-[#C8860A] border-t-2 bg-[#FFFBEB]/30' : 'border-[#E5E7EB] bg-white'}`}
                  data-testid={`product-card-${product.product_id}`}
                >
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
  );
}

export function LoanContextModal({ t, open, onClose, loanCtx, setLoanCtx }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl p-6" onClick={e => e.stopPropagation()} data-testid="profile-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-lg text-[#0D1B2A]">{t.setLoanContext}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#94A3B8]" /></button>
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
          <Button onClick={onClose} className="w-full bg-[#0D1B2A] text-white hover:bg-[#1B2D45] rounded-lg h-10 font-body font-bold">{t.applyUpdateCards}</Button>
        </div>
      </div>
    </div>
  );
}
