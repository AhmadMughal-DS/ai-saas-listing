import React from 'react';
import { AITool } from '../types';
import { Sparkles, FileText, Video, Code, Zap, Image, Mic, BarChart3, Bot, ChevronRight } from 'lucide-react';

interface CategoriesViewProps {
  tools: AITool[];
  onSelectCategory: (categoryName: string) => void;
}

const CATEGORY_META = [
  {
    name: 'Copywriting',
    icon: FileText,
    description: 'AI assistants for ad copy, long-form articles, technical whitepapers, and sales funnels.',
  },
  {
    name: 'Video AI',
    icon: Video,
    description: 'Text-to-video generation, cinematic b-roll synthesis, automated video editing, and avatar creators.',
  },
  {
    name: 'Coding',
    icon: Code,
    description: 'AI code completion, full repository refactoring, bug scanning, and test suite generation.',
  },
  {
    name: 'Productivity',
    icon: Zap,
    description: 'Meeting notes summarization, automated email triage, calendar scheduling, and workflow AI.',
  },
  {
    name: 'Image AI',
    icon: Image,
    description: 'Neural image upscaling, generative diffusion models, logo synthesis, and texture generation.',
  },
  {
    name: 'Audio AI',
    icon: Mic,
    description: 'Voice cloning, AI stems separation, podcast audio cleanup, and multi-lingual voice translation.',
  },
  {
    name: 'Data & Analytics',
    icon: BarChart3,
    description: 'Natural language SQL queries, predictive regression forecasts, and automated chart builders.',
  },
  {
    name: 'Agents',
    icon: Bot,
    description: 'Autonomous multi-agent swarms, browser automation bots, and self-improving reasoning loops.',
  },
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  tools,
  onSelectCategory,
}) => {
  return (
    <div className="w-full pt-32 pb-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Curated Ecosystem Taxonomy</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Browse by{' '}
          <span className="text-indigo-600">
            Category
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed">
          Navigate the complete landscape of artificial intelligence models and developer frameworks.
        </p>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORY_META.map((cat) => {
          const Icon = cat.icon;
          const count = tools.filter(
            (t) =>
              t.category.toLowerCase().includes(cat.name.toLowerCase()) ||
              cat.name.toLowerCase().includes(t.category.toLowerCase())
          ).length;

          return (
            <div
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="bg-white rounded-2xl p-6 flex flex-col justify-between card-3d group cursor-pointer border border-slate-200 hover:border-indigo-200 shadow-xs hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-600 transition-all group-hover:scale-105">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                    {count} {count === 1 ? 'Tool' : 'Tools'}
                  </span>
                </div>

                <h3 className="font-heading text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                  {cat.name}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-normal">
                  {cat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Explore Category</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
