import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');

    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }

    const processAuth = async () => {
      try {
        const userData = await googleLogin(sessionId);
        if (userData.has_profile) {
          navigate('/dashboard', { replace: true, state: { user: userData } });
        } else {
          navigate('/onboarding', { replace: true, state: { user: userData } });
        }
      } catch (error) {
        console.error('Google auth failed:', error);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [navigate, googleLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB]" data-testid="auth-callback">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#059669] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[#4B5563] font-body">Completing sign in...</p>
      </div>
    </div>
  );
}
