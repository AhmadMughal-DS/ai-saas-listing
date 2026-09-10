import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Flame, 
  Tag, 
  Zap, 
  Bell,
  Check
} from 'lucide-react';

interface JoinNewsletterProps {
  variant?: 'section' | 'card' | 'compact';
  source?: string;
  className?: string;
}

export const JoinNewsletter: React.FC<JoinNewsletterProps> = ({
  variant = 'section',
  source = 'homepage_section',
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Weekly AI Rankings',
    'Exclusive Deals',
  ]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [subscriberCount, setSubscriberCount] = useState('18.5k+');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  // Fetch real subscriber count on mount
  useEffect(() => {
    fetch('/api/newsletter/count')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.displayCountFormatted) {
          setSubscriberCount(data.displayCountFormatted);
        }
      })
      .catch(() => {
        // graceful fallback to static count
      });
  }, []);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source,
          topics: selectedTopics,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setAlreadySubscribed(Boolean(data.alreadySubscribed));
        setMessage(data.message || 'Thank you for subscribing to ToolverAI Weekly!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 ${className}`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs mb-2">
          <Sparkles className="w-4 h-4" />
          <span>TOOLVERAI WEEKLY</span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Stay Ahead of the AI Curve
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Join {subscriberCount} builders receiving curated weekly tools and verified deals.
        </p>

        {status === 'success' ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{alreadySubscribed ? 'Preferences Saved' : 'Subscribed!'}</p>
              <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">{message}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            {status === 'error' && (
              <p className="text-[11px] text-red-600">{message}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Join Newsletter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <section className={`w-full relative py-16 px-4 sm:px-8 overflow-hidden ${className}`}>
      <div className="max-w-[1440px] mx-auto">
        {/* Main Banner Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 md:p-16 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>THE TOOLVERAI WEEKLY INTEL</span>
              <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
              <span className="text-white font-bold">{subscriberCount} Readers</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Stay Ahead of the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">Generative AI Wave</span>
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mb-8 leading-relaxed">
              Every Tuesday, get our curated breakdown of breakout AI tools, verified monthly traffic growth, benchmark results, and exclusive lifetime deals delivered straight to your inbox.
            </p>

            {/* Success State */}
            {status === 'success' ? (
              <div className="w-full max-w-lg bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {alreadySubscribed ? 'Welcome Back!' : 'You’re on the Insider List!'}
                    </h3>
                    <p className="text-xs text-emerald-300">
                      Saved to MongoDB Atlas. Check your inbox every Tuesday.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-2 pl-11">
                  {message}
                </p>
                <div className="mt-4 pl-11 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setMessage('');
                    }}
                    className="text-xs text-indigo-300 hover:text-white underline cursor-pointer"
                  >
                    Subscribe another email
                  </button>
                </div>
              </div>
            ) : (
              /* Subscription Form */
              <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
                {/* Topic selection chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">Receive updates for:</span>
                  {[
                    { id: 'Weekly AI Rankings', icon: Flame, label: 'Weekly Rankings' },
                    { id: 'Exclusive Deals', icon: Tag, label: 'Verified Deals' },
                    { id: 'Model Benchmarks', icon: Zap, label: 'Model Benchmarks' },
                  ].map((topic) => {
                    const isSelected = selectedTopics.includes(topic.id);
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400/40 shadow-xs'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 text-indigo-300" />
                        ) : (
                          <Icon className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{topic.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input + CTA row */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full bg-slate-950/70 p-2 rounded-2xl border border-slate-700/80 shadow-inner backdrop-blur-md">
                  <div className="relative flex-1 w-full">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'error') setStatus('idle');
                      }}
                      placeholder="Enter your work or personal email..."
                      required
                      className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Free</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Error message */}
                {status === 'error' && (
                  <p className="text-xs text-rose-400 text-center animate-in fade-in">
                    {message}
                  </p>
                )}

                {/* Privacy & Anti-Spam Guarantee */}
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No spam, guaranteed</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    <span>One email per week</span>
                  </div>
                  <span>•</span>
                  <span>Unsubscribe anytime</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
