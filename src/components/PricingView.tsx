import React, { useState } from 'react';
import { MEMBERSHIP_PLANS, FAQS } from '../data/initialData';
import { MembershipPlan, UserAccount } from '../types';
import { CheckCircle, Sparkles, ShieldCheck, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';

interface PricingViewProps {
  user: UserAccount | null;
  onSelectPlan: (plan: MembershipPlan) => void;
  onOpenAccount: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  user,
  onSelectPlan,
  onOpenAccount,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="w-full pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Transparent Stripe-Powered Memberships</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          ToolverAI Membership{' '}
          <span className="text-indigo-600">
            Pricing
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed">
          The ultimate directory for developers, founders, and creators. Secure payment via Stripe, instant activation, and guaranteed VIP indexing.
        </p>

        {user?.subscription && user.subscription.status === 'active' && (
          <div className="mt-6 inline-flex items-center gap-3 p-3 px-5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            <span>
              You have an active <strong>{user.subscription.planName}</strong> subscription.
            </span>
            <button
              onClick={onOpenAccount}
              className="underline font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
            >
              Manage in Account
            </button>
          </div>
        )}
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 items-stretch">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isCurrentActive =
            user?.subscription?.status === 'active' &&
            user.subscription.planId === plan.id;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.isHighlighted
                  ? 'border-2 border-indigo-600 shadow-lg ring-4 ring-indigo-50/80 md:-translate-y-2'
                  : 'border border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-bold uppercase bg-indigo-600 text-white shadow-sm tracking-wide">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-indigo-600 font-semibold mb-4">
                  {plan.subheading}
                </p>

                <div className="flex items-baseline gap-1.5 my-6 pb-6 border-b border-slate-100">
                  <span className="font-heading text-5xl font-extrabold text-slate-900">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">
                    {plan.billingPeriod}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mb-6 leading-relaxed font-normal">
                  {plan.description}
                </p>

                <div className="space-y-3.5 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.isHighlighted ? 'text-indigo-600' : 'text-emerald-500'
                        }`}
                      />
                      <span className="text-xs sm:text-sm text-slate-600 leading-tight">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => onSelectPlan(plan)}
                  disabled={isCurrentActive}
                  className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    isCurrentActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : plan.isHighlighted
                      ? 'btn-cyan'
                      : 'btn-outline-purple'
                  }`}
                >
                  {isCurrentActive ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Current Active Plan</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>{plan.ctaText}</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Encrypted Stripe Checkout
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="font-heading font-bold text-slate-900 text-base sm:text-lg">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
