import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, ArrowLeft, AlertTriangle } from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../../utils/audio';

export default function PhoneLoginPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid mobile number.');
      return;
    }
    
    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    setTimeout(() => {
      // Mock passing the phone number to the next screen via state
      navigate('/verify-otp', { state: { mobile } });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-white/10 rounded-[24px] p-8 shadow-2xl space-y-8">
        
        <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-black text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div>
          <h1 className="text-[28px] font-black tracking-tight text-white mb-1">Mobile Login</h1>
          <p className="text-[14px] text-gray-400 font-medium">We'll send you a one-time verification code.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-[12px] text-[13px] font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSendOTP} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Smartphone className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              type="tel" 
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile Number"
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[14px] font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition-colors tracking-wider"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-green-500 hover:brightness-110 active:scale-98 text-gray-900 rounded-[16px] font-black text-[15px] uppercase tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>

      </div>
    </div>
  );
}
