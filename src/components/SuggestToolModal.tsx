import React, { useState } from 'react';
import { AITool, ToolSubmission, PricingType } from '../types';
import { 
  X, 
  Sparkles, 
  Send, 
  Globe, 
  Image as ImageIcon, 
  Tag, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Layers,
  DollarSign,
  Mail,
  HelpCircle
} from 'lucide-react';

interface SuggestToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolSubmitted?: (submission: ToolSubmission) => void;
}

const CATEGORIES: AITool['category'][] = [
  'Coding',
  'Productivity',
  'Video AI',
  'Copywriting',
  'Image AI',
  'Audio AI',
  'Data & Analytics',
  'Agents',
  '3D & Design',
  'Marketing',
];

const PRICING_OPTIONS: PricingType[] = [
  'Freemium',
  'Free',
  'Paid',
  'Free Trial',
  'Open Source',
  'Enterprise',
];

const SAMPLE_LOGOS = [
  { label: 'Neural', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
  { label: 'Code', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80' },
  { label: 'Creative', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=150&auto=format&fit=crop&q=80' },
  { label: 'Sound', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80' },
];

export const SuggestToolModal: React.FC<SuggestToolModalProps> = ({
  isOpen,
  onClose,
  onToolSubmitted,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [category, setCategory] = useState<AITool['category']>('Coding');
  const [imageUrl, setImageUrl] = useState('');
  const [pricingType, setPricingType] = useState<PricingType>('Freemium');
  const [submitterEmail, setSubmitterEmail] = useState('');
  
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<ToolSubmission | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setDescription('');
    setWebsiteUrl('');
    setCategory('Coding');
    setImageUrl('');
    setPricingType('Freemium');
    setSubmitterEmail('');
    setImageLoadError(false);
    setErrorMessage(null);
    setSubmittedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form field validation
    if (!name.trim()) {
      setErrorMessage('Please enter the tool name.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of the tool.');
      return;
    }
    if (!websiteUrl.trim()) {
      setErrorMessage('Please provide the tool website URL.');
      return;
    }
    if (!category) {
      setErrorMessage('Please select a relevant category.');
      return;
    }
    if (!imageUrl.trim()) {
      setErrorMessage('Please enter an image or logo URL.');
      return;
    }

    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          websiteUrl: formattedUrl,
          category,
          imageUrl: imageUrl.trim(),
          pricingType,
          submitterEmail: submitterEmail.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit tool suggestion.');
      }

      setSubmittedData(data.submission);
      if (onToolSubmitted) {
        onToolSubmitted(data.submission);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/70 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={handleClose} 
        aria-hidden="true" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-colors my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                Suggest an AI Tool
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit a new AI tool for verification and directory inclusion
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 max-h-[calc(85vh-120px)] overflow-y-auto">
          {submittedData ? (
            /* Success View */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="font-heading font-extrabold text-2xl text-slate-900 dark:text-white">
                  Submission Queued for Review!
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Thank you for contributing to ToolverAI! <strong className="text-indigo-600 dark:text-indigo-400">{submittedData.name}</strong> has been added to our administrator review queue.
                </p>
              </div>

              {/* Submitted Card Preview */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left flex items-start gap-3.5">
                <img
                  src={submittedData.imageUrl}
                  alt={submittedData.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {submittedData.name}
                    </h5>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {submittedData.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {submittedData.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                      <Globe className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{submittedData.websiteUrl}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Pending Approval
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Suggest Another Tool
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl btn-purple text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Tool Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Tool Name <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bolt.new, Perplexity AI, Claude 3.7"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              {/* 2. Website URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Website URL <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example-tool.ai"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  {websiteUrl && (
                    <a
                      href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                      title="Open URL in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* 3. Category & Pricing Model Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Category <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AITool['category'])}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Pricing Model</span>
                  </label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as PricingType)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all cursor-pointer"
                  >
                    {PRICING_OPTIONS.map((price) => (
                      <option key={price} value={price}>
                        {price}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Description <span className="text-rose-500">*</span></span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {description.length}/500
                  </span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Explain what problem this tool solves, key AI capabilities, target users, and why it belongs in the directory..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* 5. Image URL & Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Image / Logo URL <span className="text-rose-500">*</span></span>
                  </span>
                </label>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageLoadError(false);
                      }}
                      placeholder="https://example.com/logo.png or Unsplash URL"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    />

                    {/* Quick Preset Selector */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-slate-500 dark:text-slate-400 text-[11px]">
                      <span className="font-semibold">Quick sample logos:</span>
                      {SAMPLE_LOGOS.map((sample) => (
                        <button
                          key={sample.label}
                          type="button"
                          onClick={() => {
                            setImageUrl(sample.url);
                            setImageLoadError(false);
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Live Preview Thumbnail */}
                  <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {imageUrl && !imageLoadError ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Submitter Email (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Your Email <span className="text-slate-400 font-normal lowercase">(optional, for verification updates)</span></span>
                </label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="founder@mytool.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>

              {/* Notice note */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  All submitted tools are reviewed by our editorial team for safety, uptime, and AI capability verification before being published to the live directory.
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl btn-purple text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting to Queue...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit for Consideration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
