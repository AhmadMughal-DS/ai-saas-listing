import React, { useState } from 'react';
import { AITool, PricingType, UserAccount } from '../types';
import { Sparkles, CheckCircle, ArrowRight, ArrowLeft, Star, Globe, Plus, Trash2, Eye } from 'lucide-react';

interface SubmitToolViewProps {
  user: UserAccount | null;
  onSubmitSuccess: (newTool: AITool) => void;
  onOpenPricing: () => void;
}

export const SubmitToolView: React.FC<SubmitToolViewProps> = ({
  user,
  onSubmitSuccess,
  onOpenPricing,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [toolName, setToolName] = useState('');
  const [toolUrl, setToolUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Copywriting' | 'Video AI' | 'Coding' | 'Productivity' | 'Image AI' | 'Audio AI' | 'Data & Analytics' | 'Agents'>('Copywriting');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80');
  const [pricingType, setPricingType] = useState<PricingType>('Freemium');
  const [featureInput, setFeatureInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([
    'Automated AI Processing',
    'High-Speed REST API',
    'Cloud Synchronization',
  ]);
  const [submitterEmail, setSubmitterEmail] = useState(user?.email || 'ma.ahmadzafar@gmail.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddFeature = () => {
    if (featureInput.trim() && !keyFeatures.includes(featureInput.trim())) {
      setKeyFeatures([...keyFeatures, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      const slug = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newTool: AITool = {
        id: `tool-${Date.now()}`,
        name: toolName || 'My New AI Tool',
        slug,
        tagline: tagline || 'Next-generation intelligence for creators and developers.',
        description: description || `${toolName} is an advanced AI platform designed to automate workflows and accelerate productivity.`,
        url: toolUrl.startsWith('http') ? toolUrl : `https://${toolUrl || 'example.com'}`,
        category,
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        thumbnailVideoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        videoDuration: '3:30',
        rating: 5.0,
        reviewCount: 1,
        pricingType,
        isFeatured: user?.subscription?.status === 'active' && user.subscription.planId === 'featured',
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : ['Fast AI Synthesis', 'REST API Support'],
        pricingPlans: [
          {
            id: 'starter',
            name: 'Starter',
            price: pricingType === 'Free' ? '$0' : '$29',
            billingPeriod: '/month',
            description: 'Standard plan for individuals and small teams.',
            features: ['Full tool capabilities', 'Standard queue', 'Community support'],
            ctaText: 'Get Started',
          },
        ],
        reviews: [
          {
            id: 'init-rev',
            authorName: user?.displayName || 'Ahmad Zafar',
            authorAvatar: user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            rating: 5,
            comment: 'Newly indexed on AIFlux. Excited to share our model with the community!',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            verified: true,
          },
        ],
        createdAt: new Date().toISOString(),
        submittedBy: submitterEmail,
      };

      onSubmitSuccess(newTool);
    }, 1200);
  };

  return (
    <div className="w-full pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Verified AI Directory Submission</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Submit Your{' '}
          <span className="text-indigo-600">
            AI Tool
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed">
          Showcase your AI product to over 500,000+ monthly active developers, founders, and creators.
        </p>
      </div>

      {isSuccess ? (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-md animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mx-auto mb-6 shadow-xs">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-900 mb-3">
            Tool Successfully Submitted!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            <strong className="text-slate-900">{toolName}</strong> has been indexed in the live directory with real-time MongoDB storage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
                setToolName('');
                setTagline('');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl btn-outline-purple text-xs font-semibold"
            >
              Submit Another Tool
            </button>
            <button
              onClick={onOpenPricing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl btn-cyan text-xs font-semibold shadow-xs cursor-pointer"
            >
              Upgrade to Featured VIP Spot
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-5xl mx-auto">
          {/* Left Form (8 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
            {/* Step Wizard Tracker */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {currentStep}
                </span>
                <div>
                  <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                    Step {currentStep} of 3
                  </div>
                  <div className="text-sm font-heading font-bold text-slate-900">
                    {currentStep === 1
                      ? 'Basic Information'
                      : currentStep === 2
                      ? 'Media & Features'
                      : 'Pricing & Review'}
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === currentStep
                        ? 'w-8 bg-indigo-600'
                        : s < currentStep
                        ? 'w-4 bg-indigo-300'
                        : 'w-4 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tool Name *
                  </label>
                  <input
                    type="text"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. NeuroWrite Pro, Lumina AI"
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Website or App URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={toolUrl}
                      onChange={(e) => setToolUrl(e.target.value)}
                      placeholder="https://your-ai-tool.com"
                      required
                      className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 pl-10 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Primary Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Copywriting">Copywriting</option>
                    <option value="Video AI">Video AI</option>
                    <option value="Coding">Coding</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Image AI">Image AI</option>
                    <option value="Audio AI">Audio AI</option>
                    <option value="Data & Analytics">Data & Analytics</option>
                    <option value="Agents">Autonomous Agents</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    One-line Tagline (Under 120 chars) *
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Next-generation image upscaling and enhancement using proprietary diffusion models."
                    maxLength={140}
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!toolName.trim()) {
                        alert('Please provide a tool name.');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="px-6 py-3 rounded-xl btn-cyan text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Next: Media & Features</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Media & Features */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Full Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a comprehensive summary of model capabilities, benchmarks, and target users..."
                    rows={4}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl p-4 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Logo / Icon Image URL
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Key Features Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="e.g. 8K Neural Upscaling"
                      className="flex-1 bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-4 py-2.5 rounded-xl btn-cyan text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {keyFeatures.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium"
                      >
                        <span>{f}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(i)}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-slate-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 rounded-xl btn-cyan text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Next: Pricing & Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pricing & Review */}
            {currentStep === 3 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                    Pricing Model *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['Free', 'Freemium', 'Paid', 'Enterprise'] as PricingType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPricingType(type)}
                        className={`p-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          pricingType === type
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Submitter / Developer Email *
                  </label>
                  <input
                    type="email"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="developer@example.com"
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-slate-600 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Want #1 VIP Homepage Placement?</strong>
                    <p className="mt-0.5">
                      You can upgrade to a Featured Subscription anytime to get top priority traffic and verified badges.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-slate-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 rounded-xl btn-cyan text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Publishing to AIFlux...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Publish AI Tool to Directory</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Live Card Preview (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                <Eye className="w-4 h-4" />
                <span>Live Card Preview</span>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="relative aspect-[16/9] w-full bg-slate-100">
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-xs">
                      {pricingType}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-heading text-xl font-bold text-slate-900">
                        {toolName || 'Your AI Tool Name'}
                      </h3>
                      <span className="text-xs text-indigo-600 font-medium">
                        {category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>5.0</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed font-normal">
                    {tagline || 'Your compelling one-line value proposition here...'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {keyFeatures.slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-2">
                  <button className="flex-1 py-2 rounded-xl btn-outline-purple text-xs font-semibold">
                    View Details
                  </button>
                  <button className="py-2 px-4 rounded-xl btn-cyan text-xs font-semibold">
                    Visit Site
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
