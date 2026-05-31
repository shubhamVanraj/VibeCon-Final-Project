import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronDown, Linkedin, Mail, Headphones,
  Sparkles, ExternalLink, X
} from 'lucide-react';
import { Button } from '../ui/button';
import { BankLogo } from '../../lib/bankLogos';
import { fmtRs } from './utils';

export function CtaSection({ t }) {
  return (
    <section className="py-16 md:py-20 px-6 lg:px-8" data-testid="cta-section">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#0D1B2A] tracking-tight mb-3">
          {t.stillUnsure}
        </h2>
        <p className="font-body text-base text-[#64748B] mb-8">{t.aiAdvisorBlurb}</p>
        <Button className="bg-[#C8860A] text-white hover:bg-[#A16207] rounded-lg px-8 h-12 font-body font-bold text-base shadow-md hover:shadow-xl transition-shadow" data-testid="cta-ai-button">
          <Sparkles className="w-4 h-4 mr-2" /> {t.askAiAdvisor} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </section>
  );
}

export function TalkToUsToggle({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-24 md:bottom-8 left-4 md:left-6 z-[998]">
      <button onClick={() => setOpen(!open)} className="w-12 h-12 rounded-full bg-[#0D1B2A] text-white shadow-xl hover:bg-[#1B2D45] transition-all flex items-center justify-center" data-testid="talk-to-us-toggle">
        {open ? <ChevronDown className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
      </button>
      {open && (
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
  );
}

export function LandingFooter({ t }) {
  return (
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
  );
}

export function CompareBarAndSheet({ t, compareList, setCompareList, compareOpen, setCompareOpen }) {
  return (
    <>
      {compareList.length >= 2 && !compareOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[997] bg-[#0D1B2A] text-white py-3 px-6 flex items-center justify-between" data-testid="compare-bar">
          <div className="flex items-center gap-3">
            <span className="font-body text-sm">{compareList.length} {t.compare}</span>
            <div className="flex gap-1">{compareList.map(p => <span key={p.product_id} className="font-body text-[10px] bg-white/10 rounded-full px-2 py-0.5">{p.bank_name}</span>)}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCompareList([])} className="text-white/60 hover:text-white text-xs">Clear</Button>
            <Button size="sm" onClick={() => setCompareOpen(true)} className="bg-[#C8860A] hover:bg-[#A16207] text-white rounded-lg px-5 text-xs font-bold shadow-md" data-testid="open-compare-btn">{t.compare}</Button>
          </div>
        </div>
      )}

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
    </>
  );
}
