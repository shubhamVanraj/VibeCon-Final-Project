import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  return (
    <div className="min-h-screen bg-white" data-testid="privacy-policy-page">
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
            <Shield className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#0A0A0A] tracking-tight" data-testid="privacy-title">
              {isHi ? 'गोपनीयता नीति' : 'Privacy Policy'}
            </h1>
            <p className="font-body text-sm text-[#9CA3AF]">{isHi ? 'अंतिम अपडेट: अप्रैल 2026' : 'Last updated: April 2026'}</p>
          </div>
        </div>

        <div className="prose-custom space-y-8">
          <section>
            <h2>{isHi ? '1. हम कौन हैं' : '1. Who We Are'}</h2>
            <p>{isHi
              ? 'रिंकोश ("हम", "हमारा", "प्लेटफॉर्म") भारत का पारदर्शी लोन खोज प्लेटफॉर्म है। हम उधारकर्ताओं को बैंकों और NBFC की लोन पेशकशों की तुलना करने में मदद करते हैं — बिना स्पैम, बिना छिपे शुल्क।'
              : 'Rinkosh ("we", "our", "platform") is India\'s transparent loan discovery platform. We help borrowers compare loan offerings across banks and NBFCs — without spam, without hidden charges.'}</p>
            <p>{isHi
              ? 'संपर्क: support@rinkosh.com'
              : 'Contact: support@rinkosh.com'}</p>
          </section>

          <section>
            <h2>{isHi ? '2. हम कौन सा डेटा एकत्र करते हैं' : '2. What Data We Collect'}</h2>
            <p>{isHi ? 'हम केवल वही डेटा एकत्र करते हैं जो लोन तुलना के लिए आवश्यक है:' : 'We collect only the data necessary for loan comparison:'}</p>
            <ul>
              <li><strong>{isHi ? 'खाता जानकारी:' : 'Account Information:'}</strong> {isHi ? 'नाम, ईमेल पता, पासवर्ड (एन्क्रिप्टेड)' : 'Name, email address, password (encrypted with bcrypt)'}</li>
              <li><strong>{isHi ? 'लोन प्रोफाइल:' : 'Loan Profile:'}</strong> {isHi ? 'लोन प्रकार, रोजगार प्रकार, मासिक आय, मौजूदा लोन, क्रेडिट स्कोर जागरूकता, वांछित राशि, अवधि' : 'Loan type, employment type, monthly income, existing loans, credit score awareness, desired amount, preferred tenure'}</li>
              <li><strong>{isHi ? 'उपयोग डेटा:' : 'Usage Data:'}</strong> {isHi ? 'पृष्ठ दृश्य, सत्र जानकारी, लॉगिन प्रयास (एनालिटिक्स के लिए)' : 'Page views, session information, login attempts (for analytics and security)'}</li>
              <li><strong>{isHi ? 'स्थान:' : 'Location:'}</strong> {isHi ? 'केवल आपकी अनुमति से ब्राउज़र जियोलोकेशन (शहर स्तर तक)' : 'Browser geolocation only with your permission (city-level only)'}</li>
            </ul>
            <p className="bg-[#059669]/5 border border-[#059669]/10 rounded-xl p-4 text-sm">
              <strong>{isHi ? 'हम क्या एकत्र नहीं करते:' : 'What we do NOT collect:'}</strong> {isHi
                ? 'आधार नंबर, पैन कार्ड, बैंक खाता विवरण, वास्तविक क्रेडिट स्कोर, या कोई वित्तीय लेनदेन डेटा।'
                : 'Aadhaar number, PAN card, bank account details, actual credit score, or any financial transaction data.'}
            </p>
          </section>

          <section>
            <h2>{isHi ? '3. हम आपका डेटा कैसे उपयोग करते हैं' : '3. How We Use Your Data'}</h2>
            <ul>
              <li>{isHi ? 'आपकी प्रोफाइल के आधार पर व्यक्तिगत लोन सिफारिशें प्रदान करना' : 'Provide personalized loan recommendations based on your profile'}</li>
              <li>{isHi ? 'अनुमोदन संभावना और बचत की गणना करना' : 'Calculate approval probability and potential savings'}</li>
              <li>{isHi ? 'AI-आधारित लोन सलाह देना (Claude Sonnet 4.5)' : 'Deliver AI-powered loan advice (Claude Sonnet 4.5)'}</li>
              <li>{isHi ? 'प्लेटफॉर्म सुरक्षा और धोखाधड़ी रोकथाम' : 'Platform security and fraud prevention'}</li>
              <li>{isHi ? 'एनालिटिक्स के माध्यम से उपयोगकर्ता अनुभव में सुधार' : 'Improve user experience through analytics'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '4. डेटा शेयरिंग — आपका नियंत्रण' : '4. Data Sharing — Your Control'}</h2>
            <div className="bg-[#059669]/5 border border-[#059669]/10 rounded-xl p-5">
              <p className="font-semibold text-[#059669] mb-2">{isHi ? 'हमारी मुख्य प्रतिबद्धता:' : 'Our Core Promise:'}</p>
              <p>{isHi
                ? 'आपका डेटा कभी भी किसी बैंक, NBFC, या तीसरे पक्ष के साथ साझा नहीं किया जाता — जब तक आप "I\'m Interested" बटन नहीं दबाते। यह पूरी तरह से आपके नियंत्रण में है।'
                : 'Your data is NEVER shared with any bank, NBFC, or third party — unless YOU explicitly click "I\'m Interested" on a specific lender. This is entirely in your control.'}</p>
            </div>
            <ul className="mt-4">
              <li>{isHi ? 'प्रत्येक बैंक को व्यक्तिगत सहमति की आवश्यकता होती है' : 'Each bank requires individual, explicit consent from you'}</li>
              <li>{isHi ? 'आप किसी भी समय अपनी सहमति वापस ले सकते हैं' : 'You can revoke your consent at any time'}</li>
              <li>{isHi ? 'हम आपका डेटा कभी नहीं बेचते' : 'We never sell your data to anyone'}</li>
              <li>{isHi ? 'कोई बल्क डेटा ट्रांसफर नहीं — केवल आपके द्वारा चुने गए बैंक' : 'No bulk data transfers — only the banks you specifically choose'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '5. डेटा सुरक्षा' : '5. Data Security'}</h2>
            <ul>
              <li>{isHi ? 'bcrypt एन्क्रिप्शन के साथ पासवर्ड हैशिंग' : 'Passwords hashed with bcrypt encryption'}</li>
              <li>{isHi ? 'JWT HTTP-only कुकीज़ के माध्यम से सुरक्षित प्रमाणीकरण' : 'Secure authentication via JWT HTTP-only cookies'}</li>
              <li>{isHi ? 'ब्रूट फोर्स सुरक्षा (10 प्रयास सीमा)' : 'Brute force protection (10 attempt threshold with lockout)'}</li>
              <li>{isHi ? 'HTTPS एन्क्रिप्टेड कनेक्शन' : 'HTTPS encrypted connections'}</li>
              <li>{isHi ? 'भारतीय सर्वर पर डेटा संग्रहण — कोई सीमापार स्थानांतरण नहीं' : 'Data stored on Indian servers — no cross-border transfer'}</li>
            </ul>
          </section>

          <section>
            <h2>{isHi ? '6. आपके अधिकार (DPDP Act 2023)' : '6. Your Rights (DPDP Act 2023)'}</h2>
            <p>{isHi ? 'भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 के अनुसार, आपको निम्नलिखित अधिकार हैं:' : 'Under India\'s Digital Personal Data Protection Act 2023, you have the right to:'}</p>
            <ul>
              <li><strong>{isHi ? 'पहुंच:' : 'Access:'}</strong> {isHi ? 'अपने डैशबोर्ड पर अपना सभी डेटा देखें' : 'View all your data on your dashboard'}</li>
              <li><strong>{isHi ? 'सुधार:' : 'Correction:'}</strong> {isHi ? 'किसी भी समय अपनी प्रोफाइल अपडेट करें' : 'Update your profile at any time via "Change Preferences"'}</li>
              <li><strong>{isHi ? 'मिटाना:' : 'Erasure:'}</strong> {isHi ? 'अपना खाता और सभी डेटा हटाने का अनुरोध करें' : 'Request deletion of your account and all associated data'}</li>
              <li><strong>{isHi ? 'सहमति वापसी:' : 'Withdraw Consent:'}</strong> {isHi ? 'किसी भी बैंक लीड पर सहमति वापस लें' : 'Revoke consent on any bank lead at any time'}</li>
            </ul>
            <p>{isHi ? 'अपने अधिकारों का प्रयोग करने के लिए, support@rinkosh.com पर संपर्क करें।' : 'To exercise your rights, contact support@rinkosh.com.'}</p>
          </section>

          <section>
            <h2>{isHi ? '7. कुकीज़ और एनालिटिक्स' : '7. Cookies & Analytics'}</h2>
            <p>{isHi
              ? 'हम प्रमाणीकरण (लॉगिन सत्र) और एनालिटिक्स (पृष्ठ दृश्य, यात्रा ट्रैकिंग) के लिए कुकीज़ का उपयोग करते हैं। कोई तृतीय-पक्ष विज्ञापन ट्रैकर नहीं।'
              : 'We use cookies for authentication (login sessions) and analytics (page views, journey tracking). No third-party ad trackers.'}</p>
          </section>

          <section>
            <h2>{isHi ? '8. शिकायत निवारण' : '8. Grievance Redressal'}</h2>
            <p>{isHi ? 'किसी भी गोपनीयता संबंधित चिंता के लिए:' : 'For any privacy-related concern:'}</p>
            <div className="bg-[#F3F4F6] rounded-xl p-4 text-sm">
              <p><strong>{isHi ? 'शिकायत अधिकारी:' : 'Grievance Officer:'}</strong> Shubham Kumar</p>
              <p><strong>{isHi ? 'ईमेल:' : 'Email:'}</strong> support@rinkosh.com</p>
              <p><strong>{isHi ? 'प्रतिक्रिया समय:' : 'Response Time:'}</strong> {isHi ? '48 घंटों के भीतर स्वीकृति, 30 दिनों के भीतर समाधान' : 'Acknowledgment within 48 hours, resolution within 30 days'}</p>
            </div>
          </section>

          <section>
            <h2>{isHi ? '9. नीति में बदलाव' : '9. Changes to This Policy'}</h2>
            <p>{isHi
              ? 'हम समय-समय पर इस नीति को अपडेट कर सकते हैं। कोई भी महत्वपूर्ण बदलाव ईमेल और प्लेटफॉर्म पर सूचित किया जाएगा।'
              : 'We may update this policy from time to time. Any significant changes will be communicated via email and on the platform.'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
