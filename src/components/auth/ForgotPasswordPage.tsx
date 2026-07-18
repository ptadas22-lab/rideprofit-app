import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../../utils/audio';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-white/10 rounded-[24px] p-8 shadow-2xl space-y-8">
        
        <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-black text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        {isSent ? (
          <div className="text-center space-y-5">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/20">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-[24px] font-black tracking-tight text-white mb-2">Check Your Email</h2>
              <p className="text-[14px] text-gray-400 font-medium leading-relaxed">
                We've sent password reset instructions to <br/><span className="text-white font-bold">{email}</span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-[28px] font-black tracking-tight text-white mb-1">Reset Password</h1>
              <p className="text-[14px] text-gray-400 font-medium">Enter your email address to receive a secure password reset link.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[14px] font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-green-500 hover:brightness-110 active:scale-98 text-gray-900 rounded-[16px] font-black text-[15px] uppercase tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
