export type PricingType = 'Free' | 'Freemium' | 'Paid' | 'Enterprise' | 'Free Trial' | 'Open Source';

export interface ToolPricingPlan {
  id: string;
  name: string;
  price: string;
  billingPeriod: string;
  description: string;
  features: string[];
  ctaText: string;
  isPopular?: boolean;
}

export interface ToolReview {
  id: string;
  authorName: string;
  authorRole?: string;
  authorCompany?: string;
  authorAvatar: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
  helpfulCount?: number;
}

export interface ToolTrafficStats {
  monthlyVisits: number; // e.g. 18500000 -> 18.5M
  monthlyVisitsFormatted: string; // "18.5M"
  trafficGrowth: number; // e.g. +34.8%
  globalRank: number; // #14
  categoryRank: number; // #1 in Coding
  topCountry: string; // "United States (42%)"
  avgDuration: string; // "04:32"
  bounceRate: string; // "32.4%"
}

export interface AIDeal {
  id: string;
  toolId: string;
  toolName: string;
  toolLogo: string;
  discount: string; // "50% OFF" or "LIFETIME DEAL"
  code: string; // "FLUX50"
  description: string;
  originalPrice?: string;
  dealPrice: string;
  expiresIn: string; // "3 days left"
  dealType: 'Lifetime' | 'Discount' | 'Free Trial' | 'Free Credits';
  verified: boolean;
  claimedCount: number;
  url: string;
}

export interface AIPrompt {
  id: string;
  title: string;
  category: 'Coding & Architecture' | 'Marketing & SEO' | 'Midjourney & Image' | 'Productivity & Work' | 'Business & Growth' | 'Writing & Content';
  targetModel: 'ChatGPT / GPT-4o' | 'Claude 3.7 / 3.5' | 'Midjourney v6' | 'Cursor AI' | 'Universal AI';
  promptText: string;
  description: string;
  tags: string[];
  upvotes: number;
  author: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface AITool {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  url: string;
  category: 'Copywriting' | 'Video AI' | 'Coding' | 'Productivity' | 'Image AI' | 'Audio AI' | 'Data & Analytics' | 'Agents' | '3D & Design' | 'Marketing';
  logoUrl: string;
  thumbnailVideoUrl?: string;
  videoDuration?: string;
  rating: number;
  reviewCount: number;
  pricingType: PricingType;
  isOpenSource?: boolean;
  hasApi?: boolean;
  isFeatured?: boolean;
  featuredRank?: number;
  isVerified?: boolean;
  verifiedBadgeText?: string;
  monthlyVisits?: number;
  monthlyVisitsFormatted?: string;
  trafficGrowth?: number;
  globalRank?: number;
  categoryRank?: number;
  topCountries?: string[];
  trafficStats?: ToolTrafficStats;
  platforms?: ('Web' | 'Mac' | 'Windows' | 'Chrome Extension' | 'Discord' | 'API' | 'iOS' | 'Android')[];
  targetAudience?: ('Developers' | 'Designers' | 'Marketers' | 'Students' | 'Founders' | 'Creators' | 'Researchers' | 'Enterprise')[];
  pros?: string[];
  cons?: string[];
  alternatives?: string[];
  deal?: {
    discount: string;
    code: string;
    description: string;
    validUntil?: string;
  };
  upvotes?: number;
  launchedDate?: string;
  keyFeatures: string[];
  pricingPlans: ToolPricingPlan[];
  reviews: ToolReview[];
  createdAt: string;
  submittedBy?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: 'AI News' | 'Guides & Tutorials' | 'Product Updates' | 'Founder Interviews' | 'Case Studies';
  readTime: string;
  publishedDate: string;
  isFeatured?: boolean;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
}

export interface MembershipPlan {
  id: 'basic' | 'featured' | 'enterprise';
  name: string;
  price: number;
  billingPeriod: string;
  subheading: string;
  description: string;
  features: string[];
  ctaText: string;
  badge?: string;
  isHighlighted?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceNumber: string;
  planName: string;
}

export interface UserSubscription {
  planId: 'basic' | 'featured' | 'enterprise';
  planName: string;
  status: 'active' | 'canceled' | 'past_due';
  amount: number;
  currentPeriodEnd: string;
  cardBrand?: string;
  cardLast4?: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  subscription?: UserSubscription;
  bookmarkedToolIds: string[];
  submittedToolIds: string[];
  invoices: Invoice[];
}

export interface SubmissionFormData {
  toolName: string;
  toolUrl: string;
  description: string;
  category: string;
  logoUrl: string;
  pricingModel: PricingType;
  keyFeatures: string[];
  tags: string[];
  submitterEmail: string;
}

export interface ToolSubmission {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  category: AITool['category'];
  imageUrl: string;
  pricingType?: PricingType;
  submitterEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedToolId?: string;
}

export type ActiveTab = 
  | 'directory' 
  | 'rankings' 
  | 'compare' 
  | 'deals' 
  | 'prompts' 
  | 'categories' 
  | 'blog' 
  | 'tool-detail'
  | 'admin';

