const BANK_DATA = {
  'SBI': { color: '#0B3D91', text: 'SBI' },
  'HDFC Bank': { color: '#004C8F', text: 'HDFC' },
  'ICICI Bank': { color: '#F47920', text: 'ICICI' },
  'Bajaj Finserv': { color: '#003D6D', text: 'BF' },
  'Kotak Mahindra': { color: '#ED1C24', text: 'KM' },
  'LIC Housing': { color: '#0066B3', text: 'LIC' },
  'Axis Bank': { color: '#97144D', text: 'AXIS' },
  'HDFC Credila': { color: '#004C8F', text: 'HC' },
  'Mahindra Finance': { color: '#E31937', text: 'MF' },
  'PNB': { color: '#800020', text: 'PNB' },
  'Bank of Baroda': { color: '#F15A22', text: 'BOB' },
  'Union Bank': { color: '#003DA5', text: 'UBI' },
  'IndusInd Bank': { color: '#98002E', text: 'IIB' },
  'Tata Capital': { color: '#003DA5', text: 'TATA' },
  'IDFC First': { color: '#9A1750', text: 'IDFC' },
  'Yes Bank': { color: '#0039A6', text: 'YES' },
  'Federal Bank': { color: '#003366', text: 'FED' },
  'Canara Bank': { color: '#FFD700', text: 'CAN', textColor: '#333' },
};

export function BankLogo({ bankName, size = 'md' }) {
  const data = BANK_DATA[bankName] || { color: '#6B7280', text: (bankName || '?').charAt(0) };
  const sizes = { sm: 'w-8 h-8 text-[9px]', md: 'w-10 h-10 text-[10px]', lg: 'w-12 h-12 text-xs' };
  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-heading font-bold flex-shrink-0 shadow-sm`}
      style={{ backgroundColor: data.color, color: data.textColor || '#fff' }}
      data-testid={`bank-logo-${bankName?.replace(/\s/g, '-').toLowerCase()}`}
    >
      {data.text}
    </div>
  );
}
