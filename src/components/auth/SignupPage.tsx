import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User as UserIcon, Smartphone, AlertTriangle } from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../../utils/audio';

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobile || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!terms) {
      setError('You must accept the Terms & Privacy Policy.');
      return;
    }
    
    setIsLoading(true);
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);

    // Mock API Call
    setTimeout(() => {
      login({
        id: `user_${Date.now()}`,
        name,
        email,
        mobile,
        provider: 'email'
      });
      navigate('/app', { replace: true });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-white/10 rounded-[24px] p-8 shadow-2xl space-y-8 mt-8 mb-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-[28px] font-black tracking-tight text-white mb-1">Create Account</h1>
          <p className="text-[14px] text-gray-400 font-bold">Join RideProfit today.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-[12px] text-[13px] font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[14px] font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

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
                <Smartphone className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="tel" 
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile Number"
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

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-white/10 rounded-[16px] text-[14px] font-bold text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded-[6px] bg-gray-800 border-white/20 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 cursor-pointer"
            />
            <span className="text-[13px] leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors">
              I accept the <a href="#" className="text-white font-bold underline decoration-white/20 hover:text-green-400">Terms of Service</a> and <a href="#" className="text-white font-bold underline decoration-white/20 hover:text-green-400">Privacy Policy</a>
            </span>
          </label>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-green-500 hover:brightness-110 active:scale-98 text-gray-900 rounded-[16px] font-black text-[15px] uppercase tracking-wide shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[13px] text-gray-400 font-medium">Already have an account? </span>
          <Link to="/login" className="text-[13px] font-black text-white hover:text-green-400 transition-colors">
            Login
          </Link>
        </div>
        
      </div>
    </div>
  );
}
