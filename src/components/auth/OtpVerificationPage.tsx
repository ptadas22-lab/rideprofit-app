import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../../utils/audio';

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const mobile = location.state?.mobile;
  
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // If directly navigated without state
  if (!mobile) {
    return <Navigate to="/phone-login" replace />;
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }
    
    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    setTimeout(() => {
      login({
        id: `user_phone_${Date.now()}`,
        name: 'Phone User',
        mobile,
        provider: 'phone'
      });
      navigate('/app', { replace: true });
    }, 1000);
  };

  const handleResend = () => {
    setTimer(30);
    setError('');
    // Trigger mock SMS resend here
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-white/10 rounded-[24px] p-8 shadow-2xl space-y-8">
        
        <Link to="/phone-login" className="inline-flex items-center gap-2 text-[13px] font-black text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Change Number
        </Link>

        <div>
          <h1 className="text-[28px] font-black tracking-tight text-white mb-2">Verify OTP</h1>
          <p className="text-[14px] text-gray-400 font-medium leading-relaxed">
            We've sent a one-time code to <br/><span className="text-white font-bold">{mobile}</span>
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-[12px] text-[13px] font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              type="text" 
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter Code"
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[20px] font-black tracking-[0.5em] text-white placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:border-green-500 transition-colors text-center"
              autoFocus
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading || otp.length < 4}
            className="w-full py-4 bg-green-500 hover:brightness-110 active:scale-98 text-gray-900 rounded-[16px] font-black text-[15px] uppercase tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </form>

        <div className="text-center pt-2">
          {timer > 0 ? (
            <span className="text-[13px] text-gray-400 font-medium">Resend OTP in <span className="font-mono text-white">{timer}s</span></span>
          ) : (
            <button onClick={handleResend} className="text-[13px] font-black text-white hover:text-green-400 transition-colors">
              Resend Code
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}
