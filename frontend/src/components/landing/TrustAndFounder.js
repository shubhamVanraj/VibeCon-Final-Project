import { Shield, Eye, Lock, Heart, Linkedin } from 'lucide-react';

export function TrustCards({ t }) {
  const cards = [
    { icon: Shield, color: '#10B981', bgColor: '#DCFCE7', ringColor: 'rgba(16,185,129,0.18)', title: t.zeroSpamGuaranteed, body: t.zeroSpamDesc },
    { icon: Eye, color: '#C8860A', bgColor: '#FEF3C7', ringColor: 'rgba(255,179,71,0.22)', title: t.totalCostTransparency, body: t.totalCostDesc },
    { icon: Lock, color: '#0A1118', bgColor: '#E0E7FF', ringColor: 'rgba(10,17,24,0.16)', title: t.dataStaysYours, body: t.dataStaysDesc },
  ];
  return (
    <section className="py-20 px-6 lg:px-8 relative" data-testid="trust-section">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="cap text-[#C8860A] mb-2">Why Rinkosh</div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-[#0A1118] tracking-tight">Three promises. Zero exceptions.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 snap-in-stagger">
          {cards.map((tc) => (
            <div key={tc.title} className="bismuth-tile p-7 group" data-testid="trust-card">
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                     style={{ backgroundColor: tc.bgColor, boxShadow: `0 0 0 6px ${tc.ringColor}` }}>
                  <tc.icon className="w-6 h-6" style={{ color: tc.color }} strokeWidth={2.2} />
                </div>
                <h3 className="font-heading font-bold text-lg text-[#0A1118] mb-2 tracking-tight">{tc.title}</h3>
                <p className="font-body text-sm text-[#334155] leading-relaxed">{tc.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FounderStory({ t }) {
  return (
    <section className="py-16 md:py-20 px-6 lg:px-8 relative overflow-hidden" data-testid="our-story-section"
             style={{ background: 'linear-gradient(180deg, #FFFBF5 0%, #FFF8EE 100%)' }}>
      {/* Decorative grain */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(255,179,71,0.10) 0%, transparent 50%)' }} />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Heart className="w-5 h-5 text-[#C8860A]" strokeWidth={2} />
          <span className="cap text-[#C8860A]">{t.ourStoryTag}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-3 flex md:justify-start justify-center">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white font-heading font-bold text-4xl shadow-xl relative"
                   data-testid="founder-avatar"
                   style={{ background: 'linear-gradient(135deg, #0A1118 0%, #1B2D45 100%)' }}>
                SK
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FFB347] rounded-full flex items-center justify-center shadow-md">
                  <Heart className="w-3.5 h-3.5 text-[#0A1118]" fill="#0A1118" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="font-heading font-bold text-base text-[#0A1118]">{t.founderName}</div>
                <div className="font-body text-xs text-[#64748B]">{t.founderTitle}</div>
              </div>
              <a href="https://www.linkedin.com/in/shubhamkr0108/" target="_blank" rel="noopener noreferrer"
                 className="snap-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                 data-testid="founder-linkedin">
                <Linkedin className="w-3.5 h-3.5" /><span className="font-body text-xs font-semibold">{t.linkedinLabel}</span>
              </a>
            </div>
          </div>
          <div className="md:col-span-9">
            <div className="text-[#C8860A] text-7xl font-heading font-bold leading-none mb-2 select-none" aria-hidden>“</div>
            <p className="font-body text-lg md:text-2xl text-[#0A1118] leading-relaxed font-normal" style={{ letterSpacing: '-0.01em' }}>
              {t.founderQuote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
