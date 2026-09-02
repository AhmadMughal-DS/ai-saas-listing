import React, { useState } from 'react';
import { UserAccount, AITool } from '../types';
import { Sparkles, X, CheckCircle, ShieldCheck, Download, ExternalLink, PlusCircle } from 'lucide-react';

interface UserAccountModalProps {
  user: UserAccount;
  allTools: AITool[];
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpgradePlan: () => void;
  onCancelSubscription: () => void;
  onSelectTool: (tool: AITool) => void;
  onOpenSubmitTool: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  user,
  allTools,
  isOpen,
  onClose,
  onLogout,
  onUpgradePlan,
  onCancelSubscription,
  onSelectTool,
  onOpenSubmitTool,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'submissions' | 'invoices'>('overview');

  if (!isOpen) return null;

  const userSubmissions = allTools.filter(
    (t) => user.submittedToolIds?.includes(t.id) || t.submittedBy === user.email
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Info Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={user.displayName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl font-bold text-slate-900">
                  {user.displayName}
                </h2>
                {user.subscription && user.subscription.status === 'active' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" /> {user.subscription.planName} VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">{user.email}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> MongoDB Persistent Account • Firebase Real-Time Auth
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 gap-2 mb-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'subscription'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Subscription & Billing
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            My Submitted Tools ({userSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Invoices
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Membership Status</div>
                <div className="text-lg font-heading font-bold text-slate-900 mt-1 flex items-center gap-2">
                  {user.subscription?.status === 'active' ? (
                    <>
                      <span className="text-indigo-600">{user.subscription.planName} Tier</span>
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    </>
                  ) : (
                    <span className="text-slate-500 font-normal">Free Community Member</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-normal">
                  {user.subscription?.status === 'active'
                    ? `Renews on ${user.subscription.currentPeriodEnd}`
                    : 'Upgrade to Featured to rank higher'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Indexed Tools</div>
                <div className="text-lg font-heading font-bold text-slate-900 mt-1">
                  {userSubmissions.length} Tools Live
                </div>
                <div className="text-xs text-emerald-600 mt-1 font-normal">
                  All verified and searchable in directory
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-heading font-bold text-slate-900 text-sm">
                  Launch Your Next AI Breakthrough
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">
                  Submit a new AI tool or update your live directory listing.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSubmitTool();
                }}
                className="px-4 py-2 rounded-lg btn-cyan text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Submit New Tool
              </button>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs uppercase font-semibold text-indigo-600 tracking-wider">
                    Current Stripe Plan
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-slate-900 mt-1">
                    {user.subscription?.planName || 'Free'} Plan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    {user.subscription?.status === 'active'
                      ? `$${user.subscription.amount}/month • Card ending in ${user.subscription.cardLast4 || '4242'}`
                      : 'You are currently on the free tier.'}
                  </p>
                </div>
                {user.subscription?.status === 'active' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    onClose();
                    onUpgradePlan();
                  }}
                  className="px-4 py-2 rounded-lg btn-cyan text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Change / Upgrade Plan
                </button>
                {user.subscription?.status === 'active' && (
                  <button
                    onClick={onCancelSubscription}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {userSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm font-normal">
                No tools submitted yet.{' '}
                <button
                  onClick={() => {
                    onClose();
                    onOpenSubmitTool();
                  }}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Submit your first tool now
                </button>
              </div>
            ) : (
              userSubmissions.map((tool) => (
                <div
                  key={tool.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={tool.logoUrl}
                      alt={tool.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-heading font-bold text-slate-900 text-sm">
                        {tool.name}
                      </h4>
                      <span className="text-xs text-indigo-600 font-medium">{tool.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectTool(tool);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Listing
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {(!user.invoices || user.invoices.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-sm font-normal">
                No invoices generated yet.
              </div>
            ) : (
              user.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-heading font-bold text-slate-900 text-sm">
                      {inv.planName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {inv.date} • {inv.invoiceNumber}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">{inv.amount}</span>
                    <button
                      onClick={() => alert(`Downloading Invoice ${inv.invoiceNumber}...`)}
                      className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
