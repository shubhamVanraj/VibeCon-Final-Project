import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { MapPin, X, Search, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const POPULAR_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Bhopal', 'Patna', 'Kochi', 'Indore',
];

export function LocationPicker({ location, onLocationChange, loading: detecting }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const { language } = useLanguage();
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchCity = async (query) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)},India&format=json&limit=5&accept-language=en`);
      const data = await res.json();
      setResults(data.map(d => ({
        city: d.display_name.split(',')[0],
        state: d.display_name.split(',').slice(1, 2).join('').trim(),
        full: d.display_name,
        lat: d.lat,
        lon: d.lon,
      })));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchCity(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const selectCity = (city) => {
    onLocationChange({ city: city.city, state: city.state, lat: city.lat, lon: city.lon });
    setOpen(false);
    setSearch('');
    setResults([]);
  };

  const selectPopular = (cityName) => {
    onLocationChange({ city: cityName, state: '', lat: null, lon: null });
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[#4B5563] hover:text-[#059669] transition-colors rounded-full px-2.5 py-1 hover:bg-[#059669]/5"
        data-testid="location-picker-toggle"
      >
        {detecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9CA3AF]" />
        ) : (
          <MapPin className="w-3.5 h-3.5 text-[#059669]" />
        )}
        <span className="font-body text-xs max-w-[120px] truncate">
          {location?.city || (language === 'hi' ? 'लोकेशन चुनें' : 'Set location')}
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl shadow-2xl border border-black/10 overflow-hidden z-50" data-testid="location-picker-panel">
          <div className="p-3 border-b border-black/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'hi' ? 'शहर खोजें...' : 'Search city...'}
                className="pl-9 rounded-lg border-black/10 bg-[#F9F9FB] text-sm font-body h-9"
                data-testid="location-search-input"
              />
              {search && (
                <button onClick={() => { setSearch(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-[#9CA3AF]" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#059669]" />
              </div>
            )}

            {results.length > 0 && !searching && results.map((r, i) => (
              <button
                key={i}
                onClick={() => selectCity(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-[#059669]/5 transition-colors flex items-center gap-2"
                data-testid={`location-result-${i}`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#059669] flex-shrink-0" />
                <div>
                  <div className="font-body text-sm text-[#0A0A0A]">{r.city}</div>
                  <div className="font-body text-[10px] text-[#9CA3AF]">{r.state}</div>
                </div>
              </button>
            ))}

            {!search && !searching && (
              <>
                <div className="px-4 py-2 font-body text-[10px] text-[#9CA3AF] uppercase tracking-wider">
                  {language === 'hi' ? 'लोकप्रिय शहर' : 'Popular Cities'}
                </div>
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => selectPopular(c)}
                      className={`px-2.5 py-1 rounded-full font-body text-[11px] transition-colors ${location?.city === c ? 'bg-[#059669] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#059669]/10 hover:text-[#059669]'}`}
                      data-testid={`city-${c.toLowerCase()}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
