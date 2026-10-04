import React from 'react';
import { Flame, Tag, Terminal, GitCompare, Lock, Twitter, Linkedin, Youtube, Globe, BookOpen, Sparkles, BarChart3, Instagram, Facebook, Mail } from 'lucide-react';
import { ActiveTab } from '../types';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenSuggestTool?: () => void;
}

// Social links — pull from env vars where available, otherwise use defaults
const viteEnv = (import.meta as any).env || {};

const SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/toolverai/',
    label: 'Follow ToolverAI on Instagram',
    icon: Instagram,
    show: true,
  },
  {
    href: 'https://www.facebook.com/profile.php?id=61594866789975',
    label: 'ToolverAI on Facebook',
    icon: Facebook,
    show: true,
  },
  {
    href: viteEnv.VITE_SOCIAL_TWITTER || 'https://x.com/toolverai',
    label: 'Follow ToolverAI on X (Twitter)',
    icon: Twitter,
    show: true,
  },
  {
    href: 'mailto:marketing@toolverai.com',
    label: 'Email us at marketing@toolverai.com',
    icon: Mail,
    show: true,
  },
  {
    href: viteEnv.VITE_SOCIAL_LINKEDIN || '',
    label: 'ToolverAI on LinkedIn',
    icon: Linkedin,
    show: !!viteEnv.VITE_SOCIAL_LINKEDIN,
  },
  {
    href: viteEnv.VITE_SOCIAL_YOUTUBE || '',
    label: 'ToolverAI on YouTube',
    icon: Youtube,
    show: !!viteEnv.VITE_SOCIAL_YOUTUBE,
  },
].filter((s) => s.show && s.href);


export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSuggestTool }) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 w-full py-14 px-4 sm:px-8 mt-auto relative z-10 transition-colors duration-200"
      role="contentinfo"
      aria-label="Site Footer"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Top row: Brand + Social */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-10">
          <div className="flex flex-col items-center sm:items-start gap-3">
            <Logo size="md" showText={true} onClick={() => onNavigate('directory')} />
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs text-center sm:text-left leading-relaxed">
              The leading AI tools directory — discover, compare, and track 1000+ AI tools by real monthly traffic, pricing, and verified deals.
            </p>
            <a
              href="mailto:marketing@toolverai.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer"
              title="Contact ToolverAI via email"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>marketing@toolverai.com</span>
            </a>
          </div>

          {/* Social Icons */}
          {SOCIAL_LINKS.length > 0 && (
            <div className="flex items-center gap-3" aria-label="ToolverAI social profiles">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <social.icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Navigation grid */}
        <nav aria-label="Footer navigation">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 mb-10 text-sm">
            {/* Discover */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">Discover</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('directory')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer"
                  >
                    AI Tools Directory
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('categories')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer"
                  >
                    Browse Categories
                  </button>
                </li>
              </ul>
            </div>

            {/* Analytics */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">Analytics</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('rankings')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
                    Traffic Rankings
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('compare')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5"
                  >
                    <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
                    Compare Tools
                  </button>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('deals')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    AI Deals
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('prompts')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                    Prompt Library
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('blog')}
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full cursor-pointer flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    AI Blog
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/privacy-policy"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/affiliate-disclosure"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Affiliate Disclosure
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    About ToolverAI
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:marketing@toolverai.com"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    title="Send an email to ToolverAI"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Technical */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-xs uppercase tracking-wider">Technical</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-sm"
                    title="XML Sitemap — Search Engine Index"
                  >
                    <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                    XML Sitemap
                  </a>
                </li>
                <li>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                    Robots.txt
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('admin')}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 text-sm"
                    title="Restricted Administrator Area"
                    aria-label="Admin Login — Restricted Area"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Admin Login
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Bottom: Copyright */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
            © {year} ToolverAI Intelligence Directory (
            <a href="https://toolverai.com" className="hover:text-indigo-600 transition-colors">
              toolverai.com
            </a>
            ). Real-time traffic data, model comparisons, and verified AI deals.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-right">
            Rankings based on real monthly web traffic.{' '}
            <span className="opacity-60">Not affiliated with listed AI tools.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
