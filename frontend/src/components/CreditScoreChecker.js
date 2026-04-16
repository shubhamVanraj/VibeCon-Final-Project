import { useState } from 'react';
import api from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CreditCard, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CreditScoreChecker() {
  const [state, setState] = useState('idle');
  const [data, setData] = useState(null);

  const handleCheck = async () => {
    setState('loading');
    try {
      const { data: result } = await api.get('/credit-score/check');
      setData(result);
      setState('result');
    } catch {
      setState('result');
      setData({ status: 'error', message: 'Could not connect to credit score service.', providers: [] });
    }
  };

  return (
    <Card className="rounded-2xl border-2 border-dashed border-[#059669]/30 p-6 mb-6 overflow-hidden bg-gradient-to-br from-white to-[#059669]/5" data-testid="credit-score-checker">
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-[#059669]/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-7 h-7 text-[#059669]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-heading font-bold text-lg text-[#0A0A0A]">Check Your Credit Score</h3>
              <p className="font-body text-sm text-[#4B5563] mt-1">
                Know your CIBIL/Experian score to get better recommendations and higher approval chances.
              </p>
            </div>
            <Button onClick={handleCheck}
              className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-6 font-body font-semibold whitespace-nowrap"
              data-testid="check-credit-score-btn">
              Check Score
            </Button>
          </motion.div>
        )}

        {state === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#059669] mb-3" />
            <p className="font-body text-sm text-[#4B5563]">Connecting to credit bureaus...</p>
          </motion.div>
        )}

        {state === 'result' && data && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              <span className="font-heading font-semibold text-[#0A0A0A]">Integration Coming Soon</span>
              <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] text-xs border-0">Placeholder</Badge>
            </div>
            <p className="font-body text-sm text-[#4B5563] mb-4">{data.message}</p>
            {data.providers?.length > 0 && (
              <div className="space-y-2">
                <p className="font-body text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Check your score for free:</p>
                {data.providers.map((p) => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between bg-white rounded-xl p-3 hover:shadow-sm transition-all group border border-black/5"
                    data-testid={`credit-provider-${p.name.toLowerCase()}`}>
                    <div>
                      <span className="font-body text-sm font-semibold text-[#0A0A0A]">{p.name}</span>
                      <span className="font-body text-xs text-[#9CA3AF] ml-2">{p.description}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#059669] transition-colors" />
                  </a>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => setState('idle')}
              className="mt-4 rounded-full font-body text-sm border-[#E5E7EB]"
              data-testid="credit-score-retry-btn">
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
