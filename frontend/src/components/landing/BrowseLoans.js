import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, X, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { BankLogo } from '../../lib/bankLogos';
import { CATEGORIES, fmtRs } from './utils';

// ============================================================
// Bazaar Bismuth Loan Tile — layered translucent, Dalal Light
// ============================================================
function LoanTile({ product, t, compareList, toggleCompare, isLoggedIn, user, navigate }) {
  const [showDetails, setShowDetails] = useState(false);
  const approvalScore = Math.min(95, Math.max(10,
    50 + (product.min_credit_score <= 650 ? 15 : product.min_credit_score <= 700 ? 5 : -5) +
    (product.interest_rate <= 10 ? -5 : product.interest_rate <= 13 ? 0 : 10)
  ));
  const approvalColor = approvalScore >= 80
    ? 'bg-[#DCFCE7] text-[#166534]'
    : approvalScore >= 60 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F3F4F6] text-[#64748B]';
  const isSelected = compareList.find(x => x.product_id === product.product_id);
  const isBest = product.isBestValue;
  const hasFeatures = product.features && product.features.length > 0;

  return (
    <div
      className={`bismuth-tile ${isBest ? 'bismuth-tile-best' : ''} p-5 md:p-6`}
      data-testid={`product-card-${product.product_id}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
        {/* Bank identity */}
        <div className="flex items-center gap-3 md:w-56 flex-shrink-0">
          <button
            onClick={() => toggleCompare(product)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected ? 'bg-[#0A1118] border-[#0A1118]' : 'border-[#D1D5DB] hover:border-[#0A1118] hover:scale-110'}`}
            data-testid={`compare-${product.product_id}`}
          >
            {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <BankLogo bankName={product.bank_name} />
          <div className="min-w-0 flex-1">
            <div className="font-heading font-bold text-sm text-[#0A1118] truncate">{product.bank_name}</div>
            <div className="font-body text-xs text-[#64748B] truncate">{product.product_name}</div>
          </div>
          {isBest && (
            <span className="bg-[#0A1118] text-[#FFB347] font-body text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm">
              ★ {t.bestValue}
            </span>
          )}
        </div>

        {/* Data grid */}
        <div className="flex-1 grid grid-cols-4 gap-3 md:gap-5">
          <div>
            <div className="cap">{t.ratePerAnnum}</div>
            <div className="data-large text-base text-[#0A1118]">{product.interest_rate}<span className="text-xs text-[#94A3B8] font-medium">%</span></div>
          </div>
          <div>
            <div className="cap">{t.emiEst}</div>
            <div className="font-numbers font-semibold text-sm text-[#0A1118]">{fmtRs(product.calc_emi)}<span className="text-[10px] text-[#94A3B8] font-normal">/mo</span></div>
          </div>
          <div>
            <div className="cap">{t.totalCostLabel}</div>
            <div className="data-large text-base text-[#0A1118]">{fmtRs(product.calc_total)}</div>
          </div>
          <div>
            <div className="cap">{t.approvalOddsLabel}</div>
            <span className={`inline-block font-numbers font-bold text-xs rounded-full px-2.5 py-0.5 mt-0.5 ${approvalColor}`}>{approvalScore}%</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isLoggedIn ? (
            <Button
              size="sm"
              onClick={() => navigate(user?.has_profile ? '/dashboard' : `/onboarding?loan_type=${product.loan_type}`)}
              className="snap-press bg-[#0A1118] hover:bg-[#1B2D45] text-white rounded-lg px-5 h-9 font-body text-xs font-bold whitespace-nowrap shadow-md"
              data-testid={`apply-${product.product_id}`}
            >
              {t.applyWithoutSpam} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Link to={`/register?loan_type=${product.loan_type}`}>
              <Button
                size="sm"
                className="snap-press bg-[#0A1118] hover:bg-[#1B2D45] text-white rounded-lg px-5 h-9 font-body text-xs font-bold whitespace-nowrap shadow-md"
                data-testid={`apply-${product.product_id}`}
              >
                {t.applyWithoutSpam} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
          <span className="font-body text-[10px] text-[#94A3B8]">{t.processingLabel} {product.processing_fee_pct}%</span>
          {hasFeatures && (
            <button
              onClick={() => setShowDetails(s => !s)}
              className="font-body text-[10px] text-[#C8860A] font-semibold uppercase tracking-wider flex items-center gap-0.5 hover:text-[#A16207] transition-colors"
              data-testid={`details-toggle-${product.product_id}`}
            >
              Details
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible feature chips */}
      {hasFeatures && showDetails && (
        <div className="relative z-10 mt-4 pt-4 border-t border-[#E5E7EB] snap-in" data-testid={`details-panel-${product.product_id}`}>
          <div className="cap mb-2">Highlights</div>
          <div className="flex flex-wrap gap-1.5">
            {product.features.map((f, fi) => (
              <span key={fi} className="font-body text-[11px] bg-[#FFFBF5] border border-[#FEF3C7] text-[#92400E] rounded-full px-2.5 py-1">{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrowseLoans({
  t, products, loading, selectedCategory, setSelectedCategory,
  sortBy, setSortBy, loanCtx, setProfileModal, compareList,
  toggleCompare, isLoggedIn, user, navigate, track,
}) {
  return (
    <section id="browse-loans" className="py-12 md:py-16 px-6 lg:px-8" data-testid="browse-loans-section">
      <div className="max-w-7xl mx-auto">

        {/* Context bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5" data-testid="loan-context-bar">
          <div className="font-body text-sm text-[#334155]">
            {t.showingLoansFor} <strong className="text-[#0A1118] font-numbers">{fmtRs(loanCtx.amount)}</strong> · <strong className="text-[#0A1118] font-numbers">{loanCtx.tenure} {t.months}</strong> · <strong className="text-[#0A1118]">{loanCtx.cibil === 'any' ? t.anyCibil : loanCtx.cibil}</strong>
            <button onClick={() => setProfileModal(true)} className="text-[#C8860A] font-semibold ml-2 hover:text-[#A16207] underline-offset-2 hover:underline transition-colors" data-testid="change-context-btn">{t.change} ↗</button>
          </div>
          <div className="flex items-center gap-2 font-body text-sm text-[#64748B]">
            {t.sortByLabel}
            <button onClick={() => setSortBy('total_cost')} className={`snap-press px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'total_cost' ? 'bg-[#0A1118] text-white shadow-md' : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]'}`} data-testid="sort-total-cost">{t.totalCostLabel}</button>
            <button onClick={() => setSortBy('interest_rate')} className={`snap-press px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === 'interest_rate' ? 'bg-[#0A1118] text-white shadow-md' : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]'}`} data-testid="sort-interest">{t.interestRateSort}</button>
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
                className={`snap-press flex-shrink-0 px-4 py-2 rounded-full font-body text-sm transition-colors ${selectedCategory === cat.key ? 'bg-[#0A1118] text-white font-semibold shadow-md' : 'bg-white border border-[#E5E7EB] text-[#334155] hover:border-[#C8860A] hover:text-[#0A1118]'}`}
                data-testid={`category-${cat.key || 'all'}`}
              >
                {t[cat.tKey]} <span className="font-numbers opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Loan tile list */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#C8860A]" /></div>
        ) : (
          <div className="space-y-3 snap-in-stagger" data-testid="loan-products-grid">
            {products.map((product) => (
              <LoanTile
                key={product.product_id}
                product={product}
                t={t}
                compareList={compareList}
                toggleCompare={toggleCompare}
                isLoggedIn={isLoggedIn}
                user={user}
                navigate={navigate}
              />
            ))}
          </div>
        )}

        {isLoggedIn && !user?.has_profile && (
          <div className="mt-8 bismuth-tile p-7 flex flex-col md:flex-row items-center justify-between gap-4" data-testid="onboarding-nudge">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#C8860A]" />
                <span className="cap text-[#C8860A]">{t.getPersonalizedReco}</span>
              </div>
              <p className="font-body text-sm text-[#334155]">{t.completeProfileBlurb}</p>
            </div>
            <Button onClick={() => navigate('/onboarding')} className="relative z-10 snap-press bg-[#0A1118] text-white hover:bg-[#1B2D45] rounded-xl px-6 h-11 font-body font-bold whitespace-nowrap shadow-md" data-testid="onboarding-nudge-btn">
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
    <div className="fixed inset-0 z-[9999] bg-[#0A1118]/70 backdrop-blur-sm flex items-center justify-center p-4 snap-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-7 shadow-2xl border border-[#E5E7EB]" onClick={e => e.stopPropagation()} data-testid="profile-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-lg text-[#0A1118]">{t.setLoanContext}</h3>
          <button onClick={onClose} className="snap-press text-[#94A3B8] hover:text-[#0A1118]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="font-heading font-semibold text-sm text-[#0A1118] mb-2 block">{t.loanAmount}</label>
            <Slider value={[loanCtx.amount]} min={50000} max={10000000} step={50000} onValueChange={([v]) => setLoanCtx(p => ({...p, amount: v}))} />
            <div className="font-numbers text-sm text-[#0A1118] mt-1 text-right font-semibold">{fmtRs(loanCtx.amount)}</div>
          </div>
          <div>
            <label className="font-heading font-semibold text-sm text-[#0A1118] mb-2 block">{t.tenure}</label>
            <div className="flex gap-2">{[12,24,36,48,60].map(m => (
              <button key={m} onClick={() => setLoanCtx(p => ({...p, tenure: m}))} className={`snap-press flex-1 py-2 rounded-lg font-body text-sm font-semibold transition-colors ${loanCtx.tenure === m ? 'bg-[#0A1118] text-white shadow-md' : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]'}`}>{m}mo</button>
            ))}</div>
          </div>
          <div>
            <label className="font-heading font-semibold text-sm text-[#0A1118] mb-2 block">{t.cibilScore}</label>
            <div className="flex gap-2">{[{v:'any',l:t.anyCibil},{v:'750+',l:'750+'},{v:'700-750',l:'700-750'},{v:'650-700',l:'650-700'},{v:'<650',l:'<650'}].map(c => (
              <button key={c.v} onClick={() => setLoanCtx(p => ({...p, cibil: c.v}))} className={`snap-press flex-1 py-2 rounded-lg font-body text-xs font-semibold transition-colors ${loanCtx.cibil === c.v ? 'bg-[#0A1118] text-white shadow-md' : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]'}`}>{c.l}</button>
            ))}</div>
          </div>
          <Button onClick={onClose} className="snap-press w-full bg-[#0A1118] text-white hover:bg-[#1B2D45] rounded-xl h-11 font-body font-bold shadow-md">{t.applyUpdateCards}</Button>
        </div>
      </div>
    </div>
  );
}
