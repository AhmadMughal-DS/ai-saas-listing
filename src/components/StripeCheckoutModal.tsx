import React, { useState } from 'react';
import { MembershipPlan, UserAccount, Invoice } from '../types';
import { Lock, CheckCircle2, ShieldCheck, CreditCard, Sparkles, X, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StripeCheckoutModalProps {
  plan: MembershipPlan | { name: string; price: number; billingPeriod: string; description: string };
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: UserAccount) => void;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  plan,
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(user?.displayName || 'Ahmad Zafar');
  const [billingZip, setBillingZip] = useState('94103');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFillDemoCard = () => {
    setCardNumber('4242 •••• •••• 4242');
    setCardExpiry('12/28');
    setCardCvc('888');
    setCardName(user?.displayName || 'Ahmad Zafar');
    setBillingZip('94103');
    setErrorMessage('');
  };

  const handleFormatCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleFormatExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardExpiry(val);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      setErrorMessage('Please complete all cardholder details.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#10b981', '#6366f1'],
        });
      } catch (err) {
        // Fallback
      }

      const planId = (plan as MembershipPlan).id || 'featured';
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: `$${plan.price}.00`,
        status: 'paid',
        invoiceNumber: `TOOLVER-${Math.floor(100000 + Math.random() * 900000)}`,
        planName: plan.name,
      };

      const baseUser: UserAccount = user || {
        uid: `user-${Date.now()}`,
        email: 'ma.ahmadzafar@gmail.com',
        displayName: cardName || 'Ahmad Zafar',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        bookmarkedToolIds: [],
        submittedToolIds: [],
        invoices: [],
      };

      const updatedUser: UserAccount = {
        ...baseUser,
        subscription: {
          planId: planId as 'basic' | 'featured' | 'enterprise',
          planName: plan.name,
          status: 'active',
          amount: plan.price,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          stripeSubscriptionId: `sub_${Math.random().toString(36).substring(2, 12)}`,
          cardBrand: 'Visa',
          cardLast4: '4242',
        },
        invoices: [newInvoice, ...(baseUser.invoices || [])],
      };

      setTimeout(() => {
        onSuccess(updatedUser);
        onClose();
        setIsSuccess(false);
      }, 1800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-slate-900 mb-2">
              Subscription Activated!
            </h3>
            <p className="text-sm text-slate-600 max-w-xs mb-4">
              Welcome to <span className="text-indigo-600 font-semibold">{plan.name} Membership</span>. Your VIP badges and privileges are now live.
            </p>
            <div className="text-xs text-indigo-600 animate-pulse font-medium">
              Finalizing your directory dashboard...
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                    Stripe Secure Checkout
                  </h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-bit SSL Encrypted
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemoCard}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all font-semibold cursor-pointer"
              >
                ⚡ Fill Test Card
              </button>
            </div>

            {/* Plan Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 flex justify-between items-center">
              <div>
                <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Plan Selected
                </div>
                <div className="text-lg font-heading font-bold text-slate-900">
                  {plan.name} Membership
                </div>
                <div className="text-xs text-slate-500 font-normal">{plan.description}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  ${plan.price}
                </div>
                <div className="text-xs text-slate-500">Billed monthly</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Ahmad Zafar"
                  required
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleFormatCardNumber}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 pl-10 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                    VISA / MC / AMEX
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={handleFormatExpiry}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    CVC / CVV
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value)}
                  placeholder="94103"
                  className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl btn-cyan font-semibold flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-all mt-6 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authorizing with Stripe...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ${plan.price}.00 & Activate Subscription</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2 font-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Powered by Stripe. Cancel or upgrade anytime in your account.
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
