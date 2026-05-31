import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { BankLogo } from '../../lib/bankLogos';

export function HeroSection({ t }) {
  return (
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

        {/* Right 40% — Best match preview with amber left border */}
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
  );
}
