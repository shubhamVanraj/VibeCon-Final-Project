import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from './api';

// Fire-and-forget event tracking
function trackEvent(eventType, data = {}) {
  api.post('/analytics/event', { event_type: eventType, data }).catch(() => {});
}

// Hook for page view tracking
export function usePageView(pageName) {
  const location = useLocation();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackEvent('page_view', { page: pageName || location.pathname });
    }
  }, [pageName, location.pathname]);
}

// Hook for general event tracking
export function useAnalytics() {
  const track = useCallback((eventType, data = {}) => {
    trackEvent(eventType, data);
  }, []);

  return { track };
}

export { trackEvent };
