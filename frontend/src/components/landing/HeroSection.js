import { ArrowRight, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { BankLogo } from '../../lib/bankLogos';

export function HeroSection({ t }) {
  return (
    <section className="relative py-20 md:py-28 px-6 lg:px-8 overflow-hidden" data-testid="hero-section">
      {/* Ambient brassware glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full opacity-50"
             style={{ background: 'radial-gradient(circle, rgba(255,179,71,0.18) 0%, rgba(255,179,71,0.04) 40%, transparent 70%)' }} />
        <div className="absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full opacity-40"
             style={{ background: 'radial-gradient(circle, rgba(13,27,42,0.06) 0%, transparent 60%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-14 items-center">
        {/* Left content */}
        <div className="lg:col-span-3 snap-in">
          <div className="inline-flex items-center gap-2 bg-[#FFF8EE] text-[#92400E] border border-[#FEF3C7] rounded-full px-4 py-1.5 mb-7 shadow-sm" data-testid="hero-badge">
            <Sparkles className="w-3.5 h-3.5 text-[#C8860A]" />
            <span className="font-body text-xs font-semibold tracking-wide">{t.heroBadgeV2}</span>
          </div>

          <h1 className="hero-headline text-5xl md:text-6xl lg:text-[68px] text-[#0A1118] mb-6" data-testid="hero-headline">
            {t.heroHeadlineV2.split(',').length > 1 ? (
              <>
                {t.heroHeadlineV2.split(',')[0]},
                <br />
                <span className="accent">{t.heroHeadlineV2.split(',').slice(1).join(',').trim()}</span>
              </>
            ) : (
              t.heroHeadlineV2
            )}
          </h1>

          <p className="font-body text-base md:text-lg text-[#334155] leading-relaxed mb-10 max-w-xl">
            {t.heroSubtextV2}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <a href="#browse-loans">
              <Button className="snap-press bg-[#0A1118] text-white hover:bg-[#1B2D45] rounded-xl px-8 h-14 font-body font-bold text-base shadow-[0_8px_24px_rgba(10,17,24,0.18)] hover:shadow-[0_12px_32px_rgba(10,17,24,0.24)]" data-testid="hero-compare-btn">
                {t.compareLoansNow} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <a href="#emi-calculator">
              <Button className="snap-press bg-white text-[#0A1118] hover:bg-[#FFFBF5] rounded-xl px-8 h-14 font-body font-bold text-base border-2 border-[#0A1118] shadow-sm" data-testid="hero-emi-btn">
                {t.tryEmiCalculator}
              </Button>
            </a>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            {[
              { num: '72+', label: t.products72.replace('72+ ', ''), icon: TrendingUp },
              { num: '20', label: t.banks20.replace('20 ', ''), icon: ShieldCheck },
              { num: '₹0', label: t.zeroSpamCalls.replace('₹0 ', ''), icon: Sparkles },
            ].map((s, i) => (
              <div key={i} className="border-l-2 border-[#FEF3C7] pl-3">
                <div className="data-large text-2xl text-[#0A1118]">{s.num}</div>
                <div className="font-body text-xs text-[#64748B] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right preview tile — Bazaar Bismuth Best Match */}
        <div className="lg:col-span-2 snap-in" style={{ animationDelay: '160ms' }} data-testid="hero-mock-card">
          <div className="bismuth-tile bismuth-tile-best p-7 relative">
            <div className="absolute -top-3 left-6 z-10">
              <span className="bg-[#0A1118] text-[#FFB347] font-body text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                ★ {t.bestMatch}
              </span>
            </div>

            <div className="relative z-10 mt-2">
              <div className="flex items-center gap-3 mb-6">
                <BankLogo bankName="HDFC Bank" />
                <div>
                  <div className="font-heading font-bold text-base text-[#0A1118]">HDFC Personal Loan</div>
                  <div className="font-body text-xs text-[#64748B]">{t.personalLoan}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-5">
                <div>
                  <div className="cap mb-1">{t.ratePerAnnum}</div>
                  <div className="data-large text-2xl text-[#0A1118]">10.5<span className="text-sm text-[#94A3B8] font-medium">%</span></div>
                </div>
                <div>
                  <div className="cap mb-1">{t.emiEst}</div>
                  <div className="data-large text-2xl text-[#0A1118]">₹21,247</div>
                  <div className="font-body text-[10px] text-[#94A3B8]">per month</div>
                </div>
                <div>
                  <div className="cap mb-1">{t.totalCostLabel}</div>
                  <div className="data-large text-2xl text-[#0A1118]">₹7,64,892</div>
                </div>
                <div>
                  <div className="cap mb-1">{t.approvalOddsLabel}</div>
                  <div className="inline-flex items-center bg-[#DCFCE7] text-[#166534] font-numbers font-bold text-base rounded-full px-3 py-1 mt-0.5">89%</div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                <div className="font-body text-[10px] text-[#94A3B8]">{t.based500k36mo}</div>
                <div className="font-body text-[10px] text-[#C8860A] font-semibold uppercase tracking-wider">Live data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
