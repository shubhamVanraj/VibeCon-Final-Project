// Shared helpers used across landing sub-components.
export function calcEmi(principal, annualRate, months) {
  if (!principal || !months) return { emi: 0, total: 0, interest: 0 };
  const r = annualRate / (12 * 100);
  if (r === 0) return { emi: Math.round(principal / months), total: principal, interest: 0 };
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = Math.round(emi * months);
  return { emi: Math.round(emi), total, interest: total - principal };
}

export const fmtRs = (n) => '₹' + Number(n).toLocaleString('en-IN');

export const CATEGORIES = [
  { key: null, tKey: 'catAll' },
  { key: 'personal', tKey: 'catPersonal' },
  { key: 'home', tKey: 'catHome' },
  { key: 'car', tKey: 'catCar' },
  { key: 'business', tKey: 'catBusiness' },
  { key: 'education', tKey: 'catEducation' },
  { key: 'gold', tKey: 'catGold' },
  { key: 'msme', tKey: 'catMsme' },
  { key: 'bike', tKey: 'catBike' },
  { key: 'refinance', tKey: 'catRefinance' },
  { key: 'lap', tKey: 'catLap' },
  { key: 'working_capital', tKey: 'catWorkingCapital' },
  { key: 'plot', tKey: 'catPlot' },
  { key: 'used_vehicle', tKey: 'catUsedVehicle' },
  { key: 'mutual_funds', tKey: 'catMutualFunds' },
];
