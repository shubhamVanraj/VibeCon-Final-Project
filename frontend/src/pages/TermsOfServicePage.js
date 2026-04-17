import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  return (
    <div className="min-h-screen bg-white" data-testid="terms-of-service-page">
      <nav className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="https://static.prod-images.emergentagent.com/jobs/46236293-45eb-486f-8de9-3cfd3f7e2526/images/251ac3f41bd806cd53ef74f0a949d1a3be51ac19219729fbf89fb0dba4f12b85.png" alt="Rinkosh" className="w-9 h-9 object-contain" />
            <span className="font-heading font-bold text-xl text-[#0A0A0A] tracking-tight">Rinkosh</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 font-body text-sm text-[#4B5563] hover:text-[#059669] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {isHi ? 'होम पर वापस' : 'Back to Home'}
          </Link>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#059669]/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight" data-testid="terms-title">
              {isHi ? 'सेवा की शर्तें' : 'Terms of Service'}
            </h1>
            <p className="font-body text-sm text-[#9CA3AF]">{isHi ? 'अंतिम अपडेट: अप्रैल 2026' : 'Last updated: April 2026'}</p>
          </div>
        </div>

        <div className="prose-custom space-y-8">
          <section>
            <h2>{isHi ? '1. सेवा का विवरण' : '1. About the Service'}</h2>
            <p>{isHi
              ? 'रिंकोश एक लोन खोज और तुलना प्लेटफॉर्म है। हम बैंकों और NBFC की लोन पेशकशों को एकत्र करते हैं और उपयोगकर्ताओं को ब्याज दरों, शुल्कों और कुल लागत के आधार पर तुलना करने में मदद करते हैं।'
              : 'Rinkosh is a loan discovery and comparison platform. We aggregate loan offerings from banks and NBFCs and help users compare them based on interest rates, fees, and total cost of ownership.'}</p>
            <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/10 rounded-xl p-4 text-sm">
              <p className="font-semibold text-[#92400E] mb-1">{isHi ? 'महत्वपूर्ण:' : 'Important:'}</p>
              <p>{isHi
                ? 'रिंकोश एक ऋणदाता, बैंक, या NBFC नहीं है। हम लोन स्वीकृत, संवितरित, या एकत्र नहीं करते। सभी ऋण लेनदेन सीधे संबंधित बैंक/NBFC के साथ होते हैं।'
                : 'Rinkosh is NOT a lender, bank, or NBFC. We do not approve, disburse, or collect loans. All loan transactions happen directly with the respective bank/NBFC.'}</p>
            </div>
          </section>

          <section>
            <h2>{isHi ? '2. पात्रता' : '2. Eligibility'}</h2>
            <ul>
              <li>{isHi ? 'आपकी आयु कम से कम 18 वर्ष होनी चाहिए' : 'You must be at least 18 years old'}</li>
              <li>{isHi ? 'आप भारत के निवासी होने चाहिए' : 'You must be a resident of India'}</li>
              <li>{isHi ? 'आप वैध जानकारी प्रदान करने के लिए सहमत हैं' : 'You agree to provide accurate and truthful information'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '3. उपयोगकर्ता खाता' : '3. User Account'}</h2>
            <ul>
              <li>{isHi ? 'आप अपने खाते की सुरक्षा के लिए जिम्मेदार हैं' : 'You are responsible for maintaining the security of your account'}</li>
              <li>{isHi ? 'एक ईमेल पते से एक ही खाता बनाया जा सकता है' : 'One account per email address'}</li>
              <li>{isHi ? 'गलत या भ्रामक जानकारी प्रदान करने पर खाता निलंबित किया जा सकता है' : 'Providing false or misleading information may result in account suspension'}</li>
              <li>{isHi ? 'आप किसी भी समय अपना खाता हटाने का अनुरोध कर सकते हैं' : 'You can request account deletion at any time'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '4. लोन तुलना और सिफारिशें' : '4. Loan Comparison & Recommendations'}</h2>
            <ul>
              <li>{isHi ? 'सभी ब्याज दरें और शुल्क सार्वजनिक रूप से उपलब्ध जानकारी पर आधारित हैं' : 'All interest rates and fees are based on publicly available information'}</li>
              <li>{isHi ? 'वास्तविक दरें और शर्तें बैंक/NBFC के विवेक पर निर्भर करती हैं' : 'Actual rates and terms are subject to bank/NBFC discretion and may vary'}</li>
              <li>{isHi ? 'अनुमोदन संभावना केवल अनुमानित है — वास्तविक अनुमोदन बैंक द्वारा तय किया जाता है' : 'Approval probability is an estimate only — actual approval is decided by the bank'}</li>
              <li>{isHi ? 'EMI गणना गणितीय सूत्रों पर आधारित है और सांकेतिक है' : 'EMI calculations are based on mathematical formulas and are indicative'}</li>
              <li>{isHi ? 'हम किसी विशिष्ट लोन अनुमोदन या संवितरण की गारंटी नहीं देते' : 'We do not guarantee any specific loan approval or disbursement'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '5. लीड शेयरिंग और सहमति' : '5. Lead Sharing & Consent'}</h2>
            <div className="bg-[#059669]/5 border border-[#059669]/10 rounded-xl p-5 mb-4">
              <p className="font-semibold text-[#059669] mb-2">{isHi ? 'हमारी प्रतिबद्धता:' : 'Our Promise:'}</p>
              <p>{isHi
                ? 'आपकी जानकारी कभी भी बिना आपकी स्पष्ट सहमति के किसी बैंक या तीसरे पक्ष के साथ साझा नहीं की जाएगी।'
                : 'Your information will NEVER be shared with any bank or third party without your explicit consent.'}</p>
            </div>
            <ul>
              <li>{isHi ? '"I\'m Interested" क्लिक करने पर ही आपका डेटा चुने हुए बैंक के साथ साझा होगा' : 'Your data is shared with a bank ONLY when you click "I\'m Interested" on that specific bank'}</li>
              <li>{isHi ? 'आप किसी भी समय अपनी सहमति वापस ले सकते हैं' : 'You can revoke consent at any time from your dashboard'}</li>
              <li>{isHi ? 'सहमति वापस लेने के बाद, बैंक को आपसे संपर्क बंद करने के लिए सूचित किया जाएगा' : 'After revoking consent, the bank will be notified to cease contact'}</li>
              <li>{isHi ? 'हम कभी भी आपके डेटा को बल्क में नहीं बेचते या स्थानांतरित करते' : 'We never sell or transfer your data in bulk to any party'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '6. AI सुविधाएं' : '6. AI Features'}</h2>
            <p>{isHi
              ? 'रिंकोश AI-आधारित सुविधाएं प्रदान करता है जिसमें चैटबॉट सलाह और वॉइस इनपुट शामिल हैं:'
              : 'Rinkosh provides AI-powered features including chatbot advice and voice input:'}</p>
            <ul>
              <li>{isHi ? 'AI सलाह सामान्य वित्तीय मार्गदर्शन है, पेशेवर वित्तीय सलाह नहीं' : 'AI advice is general financial guidance, not professional financial advice'}</li>
              <li>{isHi ? 'महत्वपूर्ण वित्तीय निर्णयों के लिए CA/वित्तीय सलाहकार से परामर्श लें' : 'For important financial decisions, consult a CA/financial advisor'}</li>
              <li>{isHi ? 'वॉइस इनपुट आपकी अनुमति से ही सक्रिय होता है और डेटा संग्रहीत नहीं किया जाता' : 'Voice input is activated only with your permission and audio is not stored'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '7. बौद्धिक संपदा' : '7. Intellectual Property'}</h2>
            <p>{isHi
              ? 'रिंकोश प्लेटफॉर्म पर सभी सामग्री, डिज़ाइन, लोगो, और सॉफ्टवेयर रिंकोश की संपत्ति है और कॉपीराइट कानूनों द्वारा संरक्षित है। बिना अनुमति के इसकी प्रतिलिपि, वितरण, या संशोधन निषिद्ध है।'
              : 'All content, design, logos, and software on the Rinkosh platform are property of Rinkosh and protected by copyright laws. Reproduction, distribution, or modification without permission is prohibited.'}</p>
          </section>

          <section>
            <h2>{isHi ? '8. निषिद्ध उपयोग' : '8. Prohibited Use'}</h2>
            <ul>
              <li>{isHi ? 'प्लेटफॉर्म का उपयोग किसी अवैध उद्देश्य के लिए करना' : 'Using the platform for any illegal purpose'}</li>
              <li>{isHi ? 'गलत या भ्रामक जानकारी प्रदान करना' : 'Providing false or misleading information'}</li>
              <li>{isHi ? 'प्लेटफॉर्म को हैक, स्क्रैप, या बाधित करने का प्रयास' : 'Attempting to hack, scrape, or disrupt the platform'}</li>
              <li>{isHi ? 'अन्य उपयोगकर्ताओं का प्रतिरूपण करना' : 'Impersonating other users'}</li>
              <li>{isHi ? 'प्लेटफॉर्म डेटा का व्यावसायिक उपयोग बिना अनुमति' : 'Commercial use of platform data without authorization'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '9. दायित्व की सीमा' : '9. Limitation of Liability'}</h2>
            <ul>
              <li>{isHi ? 'रिंकोश लोन अनुमोदन या अस्वीकृति के लिए जिम्मेदार नहीं है' : 'Rinkosh is not liable for loan approvals or rejections by banks'}</li>
              <li>{isHi ? 'ब्याज दरें और शुल्क बिना पूर्व सूचना बदल सकते हैं' : 'Interest rates and fees are subject to change without notice'}</li>
              <li>{isHi ? 'प्लेटफॉर्म "जैसा है" आधार पर प्रदान किया जाता है' : 'The platform is provided on an "as-is" basis'}</li>
              <li>{isHi ? 'हम तृतीय-पक्ष बैंक/NBFC सेवाओं के लिए जिम्मेदार नहीं हैं' : 'We are not responsible for third-party bank/NBFC services'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '10. शासी कानून' : '10. Governing Law'}</h2>
            <p>{isHi
              ? 'ये शर्तें भारतीय कानून के अधीन हैं। कोई भी विवाद भारत के न्यायालयों के अनन्य अधिकार क्षेत्र में होगा।'
              : 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of Indian courts.'}</p>
          </section>

          <section>
            <h2>{isHi ? '11. शर्तों में बदलाव' : '11. Changes to Terms'}</h2>
            <p>{isHi
              ? 'हम समय-समय पर इन शर्तों को अपडेट कर सकते हैं। महत्वपूर्ण बदलाव ईमेल और प्लेटफॉर्म पर सूचित किए जाएंगे। निरंतर उपयोग अपडेट की शर्तों की स्वीकृति माना जाएगा।'
              : 'We may update these terms from time to time. Significant changes will be notified via email and on the platform. Continued use constitutes acceptance of updated terms.'}</p>
          </section>

          <section>
            <h2>{isHi ? '12. संपर्क' : '12. Contact'}</h2>
            <div className="bg-[#F3F4F6] rounded-xl p-4 text-sm">
              <p><strong>{isHi ? 'ईमेल:' : 'Email:'}</strong> support@rinkosh.com</p>
              <p><strong>{isHi ? 'संस्थापक:' : 'Founder:'}</strong> Shubham Kumar</p>
              <p><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/shubhamkr0108/" target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline">linkedin.com/in/shubhamkr0108</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
