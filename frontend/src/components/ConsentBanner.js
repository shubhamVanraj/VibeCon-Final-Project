import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../lib/api';
import { Button } from './ui/button';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ConsentBanner() {
  const [show, setShow] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem('rinkosh_consent');
    if (!consent) setShow(true);
  }, []);

  const handleConsent = async (granted) => {
    localStorage.setItem('rinkosh_consent', JSON.stringify({ granted, timestamp: new Date().toISOString() }));
    setShow(false);
    try {
      await api.post('/consent', { type: 'cookies_analytics', granted });
    } catch (err) {
      console.debug('Consent sync:', err.message);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[998] p-4 md:p-6" data-testid="consent-banner">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-black/10 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <Shield className="w-8 h-8 text-[#059669] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-body text-sm text-[#0A0A0A] leading-relaxed">
            {language === 'hi'
              ? 'हम आपके अनुभव को बेहतर बनाने के लिए कुकीज़ और एनालिटिक्स का उपयोग करते हैं। आपका डेटा कभी बेचा नहीं जाता। '
              : 'We use cookies and analytics to improve your experience. Your data is never sold. '}
            <Link to="/privacy" className="text-[#059669] font-semibold hover:underline">
              {language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => handleConsent(false)} className="rounded-full font-body text-xs text-[#9CA3AF]" data-testid="consent-decline">
            {language === 'hi' ? 'अस्वीकार' : 'Decline'}
          </Button>
          <Button size="sm" onClick={() => handleConsent(true)} className="bg-[#059669] hover:bg-[#047857] text-white rounded-full px-5 font-body text-xs font-semibold" data-testid="consent-accept">
            {language === 'hi' ? 'स्वीकार करें' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
}
