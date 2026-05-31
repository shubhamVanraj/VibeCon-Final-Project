import { Shield, Eye, Lock, Heart, Linkedin } from 'lucide-react';
import { Card } from '../ui/card';

export function TrustCards({ t }) {
  const cards = [
    { icon: Shield, color: '#059669', bgColor: '#DCFCE7', title: t.zeroSpamGuaranteed, body: t.zeroSpamDesc },
    { icon: Eye, color: '#C8860A', bgColor: '#FEF3C7', title: t.totalCostTransparency, body: t.totalCostDesc },
    { icon: Lock, color: '#0D1B2A', bgColor: '#E0E7FF', title: t.dataStaysYours, body: t.dataStaysDesc },
  ];
  return (
    <section className="py-16 px-6 lg:px-8" data-testid="trust-section">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((tc) => (
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
  );
}

export function FounderStory({ t }) {
  return (
    <section className="py-14 md:py-16 px-6 lg:px-8 bg-[#FFFBF5]" data-testid="our-story-section">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-[#C8860A]" strokeWidth={1.5} />
          <span className="font-body text-xs uppercase tracking-widest font-bold text-[#C8860A]">{t.ourStoryTag}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
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
          <div className="md:col-span-9">
            <div className="text-[#C8860A] text-5xl font-heading font-bold leading-none mb-3" aria-hidden>“</div>
            <p className="font-body text-lg md:text-xl text-[#334155] leading-relaxed">
              {t.founderQuote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
