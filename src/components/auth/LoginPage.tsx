import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Smartphone, Chrome, AlertTriangle } from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../../utils/audio';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    
    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    // Mock API Call
    setTimeout(() => {
      login({
        id: 'user_12345',
        name: 'Demo Driver',
        email,
        provider: 'email'
      });
      navigate('/app', { replace: true });
    }, 800);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    setTimeout(() => {
      login({
        id: 'user_google_789',
        name: 'Google Driver',
        email: 'driver@gmail.com',
        provider: 'google'
      });
      navigate('/app', { replace: true });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-white/10 rounded-[24px] p-8 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-gray-900 font-black text-3xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            RP
          </div>
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-white mb-1">Welcome Back</h1>
            <p className="text-[14px] text-gray-400 font-bold">Track every ride. Maximize every profit.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-[12px] text-[13px] font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Social Logins */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-900 hover:bg-gray-700 border border-white/10 rounded-[16px] text-[14px] font-black text-white transition-all disabled:opacity-50"
          >
            <Chrome className="w-5 h-5" /> Continue with Google
          </button>
          
          <Link 
            to="/phone-login"
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-900 hover:bg-gray-700 border border-white/10 rounded-[16px] text-[14px] font-black text-white transition-all"
          >
            <Smartphone className="w-5 h-5" /> Continue with Mobile Number
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-[12px] font-black text-gray-500 uppercase">OR</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div className="space-y-4">
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
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[14px] font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-5 h-5 rounded-[6px] bg-gray-800 border-white/20 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 cursor-pointer"
              />
              <span className="text-[13px] font-bold text-gray-400 group-hover:text-white transition-colors">Remember Me</span>
            </label>
            <Link to="/forgot-password" className="text-[13px] font-bold text-green-400 hover:text-green-300 transition-colors">
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-green-500 hover:brightness-110 active:scale-98 text-gray-900 rounded-[16px] font-black text-[15px] uppercase tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
          >
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[13px] text-gray-400 font-medium">Don't have an account? </span>
          <Link to="/signup" className="text-[13px] font-black text-white hover:text-green-400 transition-colors">
            Create Account
          </Link>
        </div>
        
      </div>
    </div>
  );
}
