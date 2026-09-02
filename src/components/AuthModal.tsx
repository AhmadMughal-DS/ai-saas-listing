import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Sparkles, Mail, Lock, User, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const demoUser: UserAccount = {
        uid: 'user-ahmad-zafar',
        email: 'ma.ahmadzafar@gmail.com',
        displayName: 'Ahmad Zafar',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        subscription: {
          planId: 'featured',
          planName: 'Featured',
          status: 'active',
          amount: 20,
          currentPeriodEnd: 'Sep 30, 2026',
          stripeSubscriptionId: 'sub_aiflux_pro_993',
          cardBrand: 'Visa',
          cardLast4: '4242',
        },
        bookmarkedToolIds: ['tool-lumina-ai', 'tool-codebrain'],
        submittedToolIds: ['tool-neurowrite'],
        invoices: [
          {
            id: 'inv-1',
            date: 'Aug 24, 2026',
            amount: '$20.00',
            status: 'paid',
            invoiceNumber: 'AIFLUX-892104',
            planName: 'Featured Membership',
          },
        ],
      };
      onLoginSuccess(demoUser);
      onClose();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user: UserAccount = {
        uid: `user-${Date.now()}`,
        email: email || 'ma.ahmadzafar@gmail.com',
        displayName: name || (email.split('@')[0] || 'AI Explorer'),
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        bookmarkedToolIds: [],
        submittedToolIds: [],
        invoices: [],
      };
      onLoginSuccess(user);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            {isSignUp ? 'Create your AIFlux Account' : 'Welcome to AIFlux'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Real-time authentication and directory synchronization
          </p>
        </div>

        {/* One Click Demo Sign In */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 mb-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>⚡ One-Click Demo Sign-in (Ahmad Zafar)</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase font-semibold">Or Email Sign In</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmad Zafar"
                  required
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pl-10 focus:outline-none transition-all placeholder:text-slate-400"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pl-10 focus:outline-none transition-all placeholder:text-slate-400"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pl-10 focus:outline-none transition-all placeholder:text-slate-400"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl btn-cyan font-semibold flex items-center justify-center gap-2 shadow-xs transition-all mt-6 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In to AIFlux'}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 text-center text-xs text-slate-500 font-normal">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-600 font-semibold hover:underline ml-1 cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Sign Up Free'}
          </button>
        </div>
      </div>
    </div>
  );
};
