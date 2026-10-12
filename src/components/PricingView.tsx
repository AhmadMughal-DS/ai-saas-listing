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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Transparent Pro Memberships</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          ToolverAI Membership{' '}
          <span className="text-indigo-600 dark:text-indigo-400">
            Pricing
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
          The ultimate directory for developers, founders, and creators. Instant activation and guaranteed VIP indexing.
        </p>

        {user?.subscription && user.subscription.status === 'active' && (
          <div className="mt-6 inline-flex items-center gap-3 p-3 px-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300">
            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              You have an active <strong>{user.subscription.planName}</strong> subscription.
            </span>
            <button
              onClick={onOpenAccount}
              className="underline font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
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
              className={`bg-white dark:bg-slate-900 rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.isHighlighted
                  ? 'border-2 border-indigo-600 dark:border-indigo-500 shadow-lg ring-4 ring-indigo-50/80 dark:ring-indigo-950/40 md:-translate-y-2'
                  : 'border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full text-xs font-bold uppercase bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm tracking-wide">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-4">
                  {plan.subheading}
                </p>

                <div className="flex items-baseline gap-1.5 my-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                    {plan.billingPeriod}
                  </span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-normal">
                  {plan.description}
                </p>

                <div className="space-y-3.5 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.isHighlighted ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-500'
                        }`}
                      />
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-tight">
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default'
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

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Encrypted Secure Checkout
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-heading font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4 font-normal">
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
