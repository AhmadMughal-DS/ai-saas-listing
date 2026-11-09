import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { MongoClient, Db } from 'mongodb';
import { initializeApp as initFirebaseApp, cert, applicationDefault, App as FirebaseApp } from 'firebase-admin/app';
import dotenv from 'dotenv';
import { marked } from 'marked';
import { INITIAL_TOOLS } from './src/data/initialData';
import { buildSitemapXml, generateSitemapEntries } from './src/server/sitemap';
import { buildLlmsTxt } from './src/server/llms';
import {
  submitToIndexNow,
  triggerToolContentChange,
  getCorePublicUrls,
  INDEXNOW_DEFAULT_KEY,
} from './src/server/indexnow';
import {
  ELIGIBLE_COMPARISONS,
  ELIGIBLE_ALTERNATIVES,
  normalizeComparisonSlugs,
  parseComparisonPath,
  isEligibleComparison,
  isEligibleAlternative,
  getToolAlternatives,
  getRelatedComparisonsForPair,
  getLiveComparisons,
  getLiveAlternatives,
} from './src/utils/programmaticSeo';
import { getPublishedArticles, getArticleBySlug } from './src/data/blogData';
import {
  COMPARE_HUB_CONTENT,
  DEALS_HUB_CONTENT,
  HubSeoContent,
  hubContentToHtml,
  faqsToHtml,
  faqPageJsonLd,
  seoInlineToHtml,
} from './src/data/hubSeoContent';
import { buildToolFaqs } from './src/utils/toolFaq';
import {
  HUB_TITLES,
  toolTitle,
  compareTitle,
  alternativesTitle,
  categoryTitle,
  articleTitle,
} from './src/utils/seoTitles';

dotenv.config();

let aiClient: OpenAI | null = null;
function getAIClient(): OpenAI | null {
  if (aiClient) return aiClient;
  const rawKey = process.env.DEEPSEEK_API_KEY;
  const apiKey = rawKey ? rawKey.replace(/^["']|["']$/g, '').trim() : null;
  if (!apiKey || apiKey === 'MY_DEEPSEEK_API_KEY') {
    return null;
  }
  aiClient = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });
  return aiClient;
}

// Firebase Admin SDK Manager
let firebaseApp: FirebaseApp | null = null;
function getFirebaseAdmin(): FirebaseApp | null {
  if (firebaseApp) return firebaseApp;

  try {
    // 1. Direct JSON string in environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = initFirebaseApp({
        credential: cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT env var');
      return firebaseApp;
    }

    // 2. Candidate service account file paths
    const candidatePaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(process.cwd(), 'ai-saas-listing-firebase-adminsdk-fbsvc-743174e1f9.json'),
    ].filter(Boolean) as string[];

    for (const p of candidatePaths) {
      const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
      if (fs.existsSync(resolved)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        firebaseApp = initFirebaseApp({
          credential: cert(serviceAccount),
        });
        console.log(`✅ Firebase Admin SDK initialized with service account: ${path.basename(resolved)} (project: ${serviceAccount.project_id || 'ai-saas-listing'})`);
        return firebaseApp;
      }
    }

    // 3. Fallback to application default credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !firebaseApp) {
      firebaseApp = initFirebaseApp({
        credential: applicationDefault(),
      });
      console.log('✅ Firebase Admin SDK initialized with default credentials');
      return firebaseApp;
    }
  } catch (err: any) {
    console.warn('⚠️ Firebase Admin initialization note:', err?.message || err);
  }

  return null;
}

// MongoDB Database Manager with Strict Schema Validation & Indexes
// The connection string comes ONLY from the MONGODB_URI env var (a GitHub secret
// in production). Never hardcode it here: this repository is public.
const DEFAULT_MONGODB_URI = '';
const DEFAULT_DB_NAME = 'toolver_db';

let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;
let memoryToolsCache: any[] = [];
let memorySubscribersCache: any[] = [];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-init-1',
    name: 'Bolt.new',
    description: 'AI-powered in-browser full-stack development sandbox that prompts, builds, runs, and deploys web applications entirely in your browser using WebContainers.',
    websiteUrl: 'https://bolt.new',
    category: 'Coding',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80',
    pricingType: 'Freemium',
    submitterEmail: 'developer@bolt.new',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'sub-init-2',
    name: 'Suno v3.5',
    description: 'Generative AI music engine creating broadcast-quality, full-length 2-minute songs with vocals, instrumentals, and rich song structures from simple natural language prompts.',
    websiteUrl: 'https://suno.com',
    category: 'Audio AI',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
    pricingType: 'Freemium',
    submitterEmail: 'creator@suno.ai',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'sub-init-3',
    name: 'Ideogram 2.0',
    description: 'Frontier AI image generator specializing in photorealistic typography, graphic design, posters, and consistent text rendering inside generated artwork.',
    websiteUrl: 'https://ideogram.ai',
    category: 'Image AI',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=150&auto=format&fit=crop&q=80',
    pricingType: 'Freemium',
    submitterEmail: 'design@ideogram.ai',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  }
];

let memorySubmissionsCache: any[] = [...INITIAL_SUBMISSIONS];
let isConnectingPromise: Promise<Db | null> | null = null;
let lastConnectionAttemptTime = 0;
let lastConnectionError: string | null = null;
const CONNECTION_COOLDOWN_MS = 15000;

export const SUBSCRIBER_COLLECTION_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'subscribedAt', 'status'],
    properties: {
      email: { bsonType: 'string', description: 'Subscriber email address' },
      subscribedAt: { bsonType: 'string', description: 'Timestamp when subscriber joined' },
      status: { enum: ['active', 'unsubscribed'] },
      source: { bsonType: 'string', description: 'Origin location of the subscription' },
      topics: { bsonType: 'array', items: { bsonType: 'string' } },
      updatedAt: { bsonType: 'string' },
    },
  },
};

export const TOOL_COLLECTION_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['id', 'name', 'slug', 'category', 'pricingType', 'url', 'rating', 'reviewCount'],
    properties: {
      id: { bsonType: 'string', description: 'Unique string identifier for the tool' },
      name: { bsonType: 'string', description: 'Display name of the tool' },
      slug: { bsonType: 'string', description: 'URL-friendly slug' },
      tagline: { bsonType: 'string' },
      description: { bsonType: 'string' },
      url: { bsonType: 'string' },
      category: { bsonType: 'string' },
      logoUrl: { bsonType: 'string' },
      thumbnailVideoUrl: { bsonType: ['string', 'null'] },
      videoDuration: { bsonType: ['string', 'null'] },
      rating: { bsonType: ['double', 'int', 'decimal'], minimum: 0, maximum: 5 },
      reviewCount: { bsonType: ['int', 'long', 'double'], minimum: 0 },
      pricingType: { enum: ['Free', 'Freemium', 'Paid', 'Enterprise', 'Free Trial', 'Open Source'] },
      isOpenSource: { bsonType: 'bool' },
      hasApi: { bsonType: 'bool' },
      isFeatured: { bsonType: 'bool' },
      isVerified: { bsonType: 'bool' },
      featuredRank: { bsonType: ['int', 'long', 'double', 'null'] },
      monthlyVisits: { bsonType: ['double', 'int', 'long', 'null'] },
      monthlyVisitsFormatted: { bsonType: ['string', 'null'] },
      trafficGrowth: { bsonType: ['double', 'int', 'decimal', 'null'] },
      globalRank: { bsonType: ['int', 'long', 'double', 'null'] },
      categoryRank: { bsonType: ['int', 'long', 'double', 'null'] },
      topCountries: { bsonType: 'array', items: { bsonType: 'string' } },
      trafficStats: { bsonType: ['object', 'null'] },
      platforms: { bsonType: 'array', items: { bsonType: 'string' } },
      targetAudience: { bsonType: 'array', items: { bsonType: 'string' } },
      pros: { bsonType: 'array', items: { bsonType: 'string' } },
      cons: { bsonType: 'array', items: { bsonType: 'string' } },
      alternatives: { bsonType: 'array', items: { bsonType: 'string' } },
      deal: { bsonType: ['object', 'null'] },
      upvotes: { bsonType: ['int', 'long', 'double', 'null'] },
      launchedDate: { bsonType: ['string', 'null'] },
      keyFeatures: { bsonType: 'array', items: { bsonType: 'string' } },
      pricingPlans: { bsonType: 'array' },
      reviews: { bsonType: 'array' },
      createdAt: { bsonType: 'string' },
      updatedAt: { bsonType: ['string', 'null'] }
    }
  }
};

async function ensureMongoIndexesAndSchema(db: Db) {
  try {
    const collections = await db.listCollections({ name: 'tools' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('tools', {
        validator: TOOL_COLLECTION_SCHEMA,
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
      console.log('✅ Created tools collection with strict JSON Schema validator.');
    } else {
      try {
        await db.command({
          collMod: 'tools',
          validator: TOOL_COLLECTION_SCHEMA,
          validationLevel: 'moderate',
          validationAction: 'warn',
        });
      } catch (collErr: any) {
        // Safe if collMod lacks specific permission
      }
    }

    const collection = db.collection('tools');
    await collection.createIndex({ id: 1 }, { unique: true, name: 'idx_tool_id_unique' });
    await collection.createIndex({ slug: 1 }, { unique: true, name: 'idx_tool_slug_unique' });
    await collection.createIndex({ category: 1 }, { name: 'idx_tool_category' });
    await collection.createIndex({ monthlyVisits: -1 }, { name: 'idx_tool_monthly_visits_desc' });
    await collection.createIndex({ rating: -1 }, { name: 'idx_tool_rating_desc' });
    await collection.createIndex({ isFeatured: 1 }, { name: 'idx_tool_featured' });
    await collection.createIndex({ isVerified: 1 }, { name: 'idx_tool_verified' });
    await collection.createIndex({ category: 1, monthlyVisits: -1 }, { name: 'idx_tool_cat_visits' });

    // Initialize newsletter_subscribers collection & indexes
    const subCollections = await db.listCollections({ name: 'newsletter_subscribers' }).toArray();
    if (subCollections.length === 0) {
      await db.createCollection('newsletter_subscribers', {
        validator: SUBSCRIBER_COLLECTION_SCHEMA,
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
      console.log('✅ Created newsletter_subscribers collection in MongoDB.');
    }
    const subscribersCollection = db.collection('newsletter_subscribers');
    await subscribersCollection.createIndex({ email: 1 }, { unique: true, name: 'idx_subscriber_email_unique' });
    await subscribersCollection.createIndex({ subscribedAt: -1 }, { name: 'idx_subscriber_date_desc' });

    // Initialize tool_submissions collection & indexes
    const submissionCollections = await db.listCollections({ name: 'tool_submissions' }).toArray();
    if (submissionCollections.length === 0) {
      await db.createCollection('tool_submissions');
      console.log('✅ Created tool_submissions collection in MongoDB.');
      await db.collection('tool_submissions').insertMany(INITIAL_SUBMISSIONS.map((s) => ({ ...s, _id: s.id as any })));
    }
    const submissionsColl = db.collection('tool_submissions');
    await submissionsColl.createIndex({ id: 1 }, { unique: true, name: 'idx_submission_id_unique' });
    await submissionsColl.createIndex({ status: 1 }, { name: 'idx_submission_status' });
    await submissionsColl.createIndex({ submittedAt: -1 }, { name: 'idx_submission_date_desc' });
  } catch (err: any) {
    console.warn('⚠️ MongoDB schema index note:', err?.message || err);
  }
}

async function getMongoDb(forceReconnect = false): Promise<Db | null> {
  const rawUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  const uri = rawUri ? rawUri.replace(/^["']|["']$/g, '').trim() : '';

  if (dbInstance) return dbInstance;
  if (!uri) {
    if (!lastConnectionError) console.warn('⚠️ MONGODB_URI is not set — running on the in-memory dataset.');
    lastConnectionError = 'MONGODB_URI not set';
    return null;
  }

  // If currently in connection attempt, return ongoing promise
  if (isConnectingPromise) {
    return isConnectingPromise;
  }

  const now = Date.now();
  if (!forceReconnect && lastConnectionError && now - lastConnectionAttemptTime < CONNECTION_COOLDOWN_MS) {
    return null;
  }

  lastConnectionAttemptTime = now;

  isConnectingPromise = (async () => {
    try {
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch {
          // ignore
        }
        mongoClient = null;
      }

      const clientOptions: any = {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        maxPoolSize: 15,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
      };

      let connectionUri = uri.trim();
      if (connectionUri.startsWith('mongodb+srv://') && !connectionUri.includes('?')) {
        connectionUri = `${connectionUri}/?retryWrites=true&w=majority`;
      }

      mongoClient = new MongoClient(connectionUri, clientOptions);
      await mongoClient.connect();

      const targetDbName = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;
      dbInstance = mongoClient.db(targetDbName);
      lastConnectionError = null;
      console.log(`✅ Successfully connected to MongoDB Atlas database: ${targetDbName}`);

      // Ensure indexes and JSON Schema validation
      await ensureMongoIndexesAndSchema(dbInstance);

      // Auto-seed initial tools if collection is empty
      const collection = dbInstance.collection('tools');
      const count = await collection.countDocuments();
      if (count === 0) {
        console.log('🌱 Seeding MongoDB with initial AI tools dataset...');
        await collection.insertMany(INITIAL_TOOLS.map((t) => ({ ...t, _id: t.id as any })));
        console.log(`✅ Seeded ${INITIAL_TOOLS.length} tools into MongoDB.`);
      }

      return dbInstance;
    } catch (error: any) {
      lastConnectionError = error?.message || String(error);
      console.warn('⚠️ MongoDB connection note:', lastConnectionError);
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch {
          // ignore
        }
        mongoClient = null;
      }
      dbInstance = null;
      return null;
    } finally {
      isConnectingPromise = null;
    }
  })();

  return isConnectingPromise;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // ── High-Performance Native HTTP Compression Middleware (Brotli + Gzip) ──
  app.use((req, res, next) => {
    const acceptEncoding = (req.headers['accept-encoding'] as string) || '';
    if (!acceptEncoding || req.method === 'HEAD') return next();

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks: Buffer[] = [];
    let isIntercepting = true;

    res.write = function (chunk: any, ...args: any[]): any {
      if (!isIntercepting || !chunk) {
        return originalWrite(chunk, ...args);
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    res.end = function (chunk?: any, ...args: any[]): any {
      if (!isIntercepting) {
        return originalEnd(chunk, ...args);
      }
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      isIntercepting = false;

      const buffer = Buffer.concat(chunks);

      // Skip small payloads (< 1KB) or non-2xx statuses
      if (buffer.length < 1024 || res.statusCode < 200 || res.statusCode >= 300) {
        res.setHeader('Content-Length', buffer.length);
        return originalEnd(buffer);
      }

      const contentType = (res.getHeader('Content-Type') as string) || '';
      // Skip if already compressed upstream (prevents double-encoding)
      const existingEncoding = res.getHeader('Content-Encoding') as string | undefined;
      if (existingEncoding) {
        res.setHeader('Content-Length', buffer.length);
        return originalEnd(buffer);
      }
      // Only compress text, HTML, CSS, JavaScript, JSON, SVG, and XML
      const compressible = /text\/(html|css|plain|xml)|application\/(javascript|json|xml|x-javascript)|image\/svg\+xml/i.test(contentType);
      if (!compressible) {
        res.setHeader('Content-Length', buffer.length);
        return originalEnd(buffer);
      }

      res.setHeader('Vary', 'Accept-Encoding');

      // Brotli compression (superior compression ratio)
      if (acceptEncoding.includes('br')) {
        zlib.brotliCompress(buffer, (err, compressed) => {
          if (err || !compressed) {
            res.setHeader('Content-Length', buffer.length);
            return originalEnd(buffer);
          }
          res.setHeader('Content-Encoding', 'br');
          res.setHeader('Content-Length', compressed.length);
          originalEnd(compressed);
        });
        return;
      }

      // Gzip compression fallback
      if (acceptEncoding.includes('gzip')) {
        zlib.gzip(buffer, (err, compressed) => {
          if (err || !compressed) {
            res.setHeader('Content-Length', buffer.length);
            return originalEnd(buffer);
          }
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          originalEnd(compressed);
        });
        return;
      }

      // Deflate compression fallback
      if (acceptEncoding.includes('deflate')) {
        zlib.deflate(buffer, (err, compressed) => {
          if (err || !compressed) {
            res.setHeader('Content-Length', buffer.length);
            return originalEnd(buffer);
          }
          res.setHeader('Content-Encoding', 'deflate');
          res.setHeader('Content-Length', compressed.length);
          originalEnd(compressed);
        });
        return;
      }

      res.setHeader('Content-Length', buffer.length);
      return originalEnd(buffer);
    };

    next();
  });

  // ── SEO: Canonical Domain & Protocol Enforcement (www -> non-www, HTTP -> HTTPS) ──
  app.use((req, res, next) => {
    const hostHeader = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const protoHeader = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = hostHeader.split(':')[0].toLowerCase();

    // 1. If host begins with www., 301 permanently redirect to canonical non-www domain
    if (host.startsWith('www.')) {
      const canonicalHost = host.replace(/^www\./, '');
      const targetUrl = `https://${canonicalHost}${req.originalUrl}`;
      return res.redirect(301, targetUrl);
    }

    // 2. If behind reverse proxy and protocol is HTTP for production domain, 301 redirect to HTTPS
    if (process.env.NODE_ENV === 'production' && protoHeader === 'http' && host === 'toolverai.com') {
      const targetUrl = `https://toolverai.com${req.originalUrl}`;
      return res.redirect(301, targetUrl);
    }

    // 3. Trailing slash normalizer (strip trailing slash from paths other than '/')
    // e.g. /rankings/ -> /rankings (preserves query string)
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      const safePath = req.path.slice(0, -1);
      return res.redirect(301, safePath + query);
    }

    next();
  });

  // Try initializing MongoDB & Firebase Admin on boot
  getMongoDb().catch(() => {});
  try {
    getFirebaseAdmin();
  } catch {}

  // Helper: resolve canonical base URL for SEO indexing
  function resolveBaseUrl(req: express.Request): string {
    const envSiteUrl = process.env.SITE_URL || process.env.CANONICAL_DOMAIN;
    if (envSiteUrl && envSiteUrl.trim() && envSiteUrl !== 'http://localhost:3000') {
      const clean = envSiteUrl.trim().replace(/\/+$/, '');
      return clean.startsWith('http') ? clean : `https://${clean}`;
    }

    const hostHeader = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const host = hostHeader.split(':')[0].toLowerCase();
    if (host.includes('toolverai.com')) {
      return 'https://toolverai.com';
    }

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    return `${proto}://${host || 'toolverai.com'}`.replace(/\/+$/, '');
  }

  // In-memory TTL cache for tools (eliminates MongoDB roundtrips during SSR)
  let cachedDbTools: { data: any[]; expiresAt: number } | null = null;
  const DB_TOOLS_CACHE_TTL_MS = 60_000; // 60 seconds TTL

  function invalidateDbToolsCache() {
    cachedDbTools = null;
  }

  // Helper: fetch all tools from MongoDB Atlas or fallback to memory cache / initial dataset
  async function getToolsFromDbOrFallback(): Promise<any[]> {
    if (cachedDbTools && Date.now() < cachedDbTools.expiresAt) {
      return cachedDbTools.data;
    }

    try {
      const db = await getMongoDb();
      if (db) {
        // Exclude the heavy per-tool `blog` field from this shared cache; the
        // tool detail SSR loads the single blog it needs on its own.
        const tools = await db.collection('tools').find({}, { projection: { blog: 0 } }).toArray();
        if (tools && tools.length > 0) {
          const mapped = tools.map((t) => {
            const { _id, ...rest } = t;
            return { id: rest.id || _id?.toString(), ...rest };
          });
          cachedDbTools = { data: mapped, expiresAt: Date.now() + DB_TOOLS_CACHE_TTL_MS };
          return mapped;
        }
      }
    } catch (err) {
      console.warn('⚠️ Error fetching tools from MongoDB for sitemap:', err);
    }

    if (memoryToolsCache && memoryToolsCache.length > 0) {
      return memoryToolsCache;
    }

    return INITIAL_TOOLS;
  }

  // ── SEO: Security & Crawl Headers Middleware ──────────────────────────
  app.use((req, res, next) => {
    // Only for HTML pages, not APIs or assets
    const isHtmlReq = !req.path.startsWith('/api/') && !req.path.match(/\.(js|css|png|jpg|svg|woff2?|ico|json|xml|txt|html)$/);
    if (isHtmlReq) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      // Block indexing of admin routes at HTTP header level
      if (req.path === '/admin' || req.path.startsWith('/admin/')) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
    }
    next();
  });

  // ── SEO: Dynamic XML Sitemap ───────────────────────────────────────────
  // NO X-Robots-Tag: noindex here — the sitemap itself must be crawlable by Googlebot
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const tools = await getToolsFromDbOrFallback();
      const xml = buildSitemapXml(baseUrl, tools);

      res.header('Content-Type', 'application/xml; charset=utf-8');
      // Cache 1 hour in CDN, 4 hours in browser
      res.header('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      return res.status(200).send(xml);
    } catch (error: any) {
      console.error('Error generating dynamic sitemap.xml:', error);
      res.status(500).header('Content-Type', 'text/plain; charset=utf-8').send('Error generating XML sitemap');
    }
  });

  // ── GEO: Dynamic llms.txt ──────────────────────────────────────────────
  // Curated Markdown map of the site for answer engines / LLM crawlers
  // (ChatGPT, Perplexity, Claude, Google AI Overviews). See llmstxt.org.
  // Built from the same live DB as the sitemap, so it never goes stale.
  app.get('/llms.txt', async (req, res) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const tools = await getToolsFromDbOrFallback();
      const txt = buildLlmsTxt(baseUrl, tools);
      res.header('Content-Type', 'text/plain; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      return res.status(200).send(txt);
    } catch (error: any) {
      console.error('Error generating llms.txt:', error);
      res.status(500).header('Content-Type', 'text/plain; charset=utf-8').send('Error generating llms.txt');
    }
  });

  // ── SEO: Dynamic robots.txt ────────────────────────────────────────────
  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('text/plain');
    res.header('Cache-Control', 'public, max-age=86400');
    // AI answer-engine & LLM crawlers — explicitly welcomed (GEO). Being named
    // and allowed (rather than relying on `*`) removes any ambiguity that could
    // keep ToolverAI out of AI Overviews, ChatGPT, Perplexity, Gemini answers.
    const aiCrawlers = [
      'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',           // OpenAI
      'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', // Anthropic
      'PerplexityBot', 'Perplexity-User',                  // Perplexity
      'Google-Extended',                                    // Google Gemini / AI Overviews training
      'Applebot-Extended',                                  // Apple Intelligence
      'Amazonbot', 'Bytespider', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
      'DuckAssistBot', 'MistralAI-User', 'YouBot',
    ];
    const aiBlock = aiCrawlers.map((ua) => `User-agent: ${ua}\nAllow: /\n`).join('\n');
    res.send([
      '# ToolverAI — robots.txt',
      '# https://toolverai.com',
      '# Updated: 2026-11-09',
      '',
      aiBlock.trimEnd(),
      '',
      'User-agent: *',
      'Allow: /',
      '',
      '# Block admin and API routes',
      'Disallow: /admin',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      '# Block query-parameter duplicate-content variations',
      'Disallow: /*?sort=',
      'Disallow: /*?page=',
      'Disallow: /*?filter=',
      'Disallow: /*?search=',
      'Disallow: /*?category=',
      'Disallow: /*?pricing=',
      '',
      '# Explicitly allow all indexable content pages',
      'Allow: /tool/',
      'Allow: /categories/',
      'Allow: /compare',
      'Allow: /deals',
      'Allow: /rankings',
      'Allow: /prompts',
      'Allow: /blog',
      'Allow: /about',
      'Allow: /privacy-policy',
      'Allow: /terms',
      'Allow: /affiliate-disclosure',
      'Allow: /submit-tool',
      '',
      '# Allow important static assets (needed by Google for rendering)',
      'Allow: /assets/',
      'Allow: /manifest.json',
      '',
      '# Courtesy crawl delay (respected by Bing, Yandex — not Google)',
      'Crawl-delay: 1',
      '',
      `# Dynamic XML Sitemap — auto-generated from live MongoDB database`,
      `Sitemap: ${baseUrl}/sitemap.xml`,
      '',
      `# LLM / answer-engine content map (llmstxt.org)`,
      `# ${baseUrl}/llms.txt`,
    ].join('\n'));
  });

  // ── SEO: IndexNow Key File ─────────────────────────────────────────────
  // Serve the IndexNow key as a text file at /{key}.txt and /indexnow-key.txt
  app.get('/indexnow-key.txt', (req, res) => {
    const key = (process.env.INDEXNOW_KEY || INDEXNOW_DEFAULT_KEY).trim();
    res.type('text/plain; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(key);
  });

  // Dynamic key-based route: /{INDEXNOW_KEY}.txt (required by IndexNow spec)
  app.get('/:key.txt', (req, res, next) => {
    const configuredKey = (process.env.INDEXNOW_KEY || INDEXNOW_DEFAULT_KEY).trim();
    if (!configuredKey || req.params.key !== configuredKey) return next();
    res.type('text/plain; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(configuredKey);
  });

  // ── SEO: IndexNow Submission API ───────────────────────────────────────
  // Reusable API to submit URLs on-demand to Microsoft Bing IndexNow
  app.post('/api/indexnow/submit', requireAdmin, async (req, res) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const { urls } = req.body || {};

      let targetUrls: string[] = [];
      if (Array.isArray(urls) && urls.length > 0) {
        targetUrls = urls;
      } else {
        // Default: submit today's core public hub pages
        targetUrls = getCorePublicUrls(baseUrl);
      }

      const result = await submitToIndexNow(targetUrls, { baseUrl });
      const httpCode = result.status >= 200 && result.status < 300 ? 200 : (result.status || 500);

      return res.status(httpCode).json(result);
    } catch (error: any) {
      console.error('IndexNow submission error:', error);
      res.status(500).json({ success: false, error: error?.message || 'IndexNow submission failed' });
    }
  });

  // ── SEO: Sitemap Stats ─────────────────────────────────────────────────
  app.get('/api/sitemap/stats', async (req, res) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const tools = await getToolsFromDbOrFallback();
      const entries = generateSitemapEntries(baseUrl, tools);
      const uniqueCategories = new Set(tools.map((t) => t.category).filter(Boolean));

      res.json({
        success: true,
        totalUrls: entries.length,
        toolsCount: tools.length,
        categoriesCount: uniqueCategories.size,
        baseUrl,
        generatedAt: new Date().toISOString(),
        sitemapUrl: `${baseUrl}/sitemap.xml`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Firebase Admin Status API
  app.get('/api/firebase/status', (req, res) => {
    const fb = getFirebaseAdmin();
    if (fb) {
      return res.json({
        status: 'connected',
        provider: 'Firebase Admin SDK',
        projectId: fb.options.projectId || 'ai-saas-listing',
        configured: true,
      });
    }
    return res.json({
      status: 'unconfigured',
      provider: 'Firebase Admin SDK',
      projectId: 'ai-saas-listing',
      configured: false,
      note: 'Provide service account JSON or set FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS',
    });
  });

  // ── Admin authentication ──────────────────────────────────────────────
  // Credentials come ONLY from the environment (ADMIN_USERNAME / ADMIN_PASSWORD).
  // There are no built-in fallback passwords: the repo is public, so any
  // hardcoded password is a published password. If ADMIN_PASSWORD is not set,
  // admin login is disabled. Successful login returns an HMAC-signed,
  // expiring token which every admin/write endpoint verifies (requireAdmin).
  const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  function adminSecret(): string {
    return (process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || '').trim();
  }

  function safeEqual(a: string, b: string): boolean {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
  }

  function signAdminToken(username: string): string {
    const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + ADMIN_TOKEN_TTL_MS })).toString('base64url');
    const sig = crypto.createHmac('sha256', adminSecret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifyAdminToken(token: string): boolean {
    const secret = adminSecret();
    if (!secret || !token || !token.includes('.')) return false;
    const [payload, sig] = token.split('.', 2);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!safeEqual(sig, expected)) return false;
    try {
      const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      return typeof exp === 'number' && Date.now() < exp;
    } catch {
      return false;
    }
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (verifyAdminToken(token)) return next();
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  // Private Admin Authentication Endpoint
  app.post('/api/admin/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      const validUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const validPass = (process.env.ADMIN_PASSWORD || '').trim();
      if (!validPass) {
        return res.status(503).json({ error: 'Admin login is not configured on this server (ADMIN_PASSWORD missing).' });
      }

      const inputUser = String(username || '').trim().toLowerCase();
      const inputPass = String(password || '').trim();

      if (safeEqual(inputUser, validUser) && safeEqual(inputPass, validPass)) {
        return res.json({
          success: true,
          token: signAdminToken(inputUser),
          expiresInMs: ADMIN_TOKEN_TTL_MS,
          user: { username: inputUser, role: 'superadmin' },
        });
      }

      return res.status(401).json({ error: 'Invalid administrator credentials' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Lets the admin panel check whether its stored token is still valid.
  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.json({ success: true });
  });

  // DB Status API
  app.get('/api/db/status', async (req, res) => {
    try {
      const force = req.query.force === 'true' || req.query.refresh === 'true';
      const db = await getMongoDb(force);
      if (db) {
        const count = await db.collection('tools').countDocuments();
        return res.json({
          status: 'connected',
          provider: 'MongoDB',
          database: db.databaseName || 'toolver_db',
          collection: 'tools',
          count,
          uriConfigured: true,
        });
      }

      const hasUri = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI !== 'MY_MONGODB_URI');
      return res.json({
        status: hasUri ? 'connecting_or_failed' : 'disconnected',
        provider: 'MongoDB Atlas',
        database: 'toolver_db',
        collection: 'tools',
        count: memoryToolsCache.length,
        uriConfigured: hasUri,
        note: hasUri
          ? 'Connecting to MongoDB Atlas cluster0.00jxnf9.mongodb.net...'
          : 'Connecting to configured MongoDB database...',
      });
    } catch (err: any) {
      res.json({
        status: 'error',
        provider: 'Fallback',
        count: memoryToolsCache.length,
        error: err.message,
      });
    }
  });

  // DB Sync / Reconnect API
  app.post('/api/db/sync', requireAdmin, async (req, res) => {
    try {
      const db = await getMongoDb(true);
      if (db) {
        const count = await db.collection('tools').countDocuments();
        return res.json({
          success: true,
          status: 'connected',
          provider: 'MongoDB',
          count,
          message: `Connected to MongoDB. ${count} tools active in database.`,
        });
      }

      return res.json({
        success: true,
        status: 'local_storage_fallback',
        count: memoryToolsCache.length,
        message: 'Running in resilient in-memory store mode.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Tools
  app.get('/api/tools', async (req, res) => {
    try {
      const db = await getMongoDb();
      if (db) {
        // Exclude the large `blog` field from the list payload — it is loaded
        // on demand per tool via /api/tools/:slug/blog (keeps the list lean).
        const tools = await db.collection('tools').find({}, { projection: { blog: 0 } }).toArray();
        // Normalize _id to id and ensure isVerified/isFeatured flags
        const cleanTools = tools.map((t) => {
          const { _id, ...rest } = t;
          const initialMatch = INITIAL_TOOLS.find((it) => it.id === (rest.id || _id?.toString()));
          const isVerified = rest.isVerified !== undefined ? Boolean(rest.isVerified) : Boolean(initialMatch?.isVerified ?? (rest.isFeatured && (rest.rating || 0) >= 4.8));
          return { id: rest.id || _id?.toString(), ...rest, isVerified };
        });
        memoryToolsCache = cleanTools;
        return res.json(cleanTools);
      }

      // Return memory cache
      res.json(memoryToolsCache);
    } catch (error: any) {
      console.error('Error fetching tools:', error);
      res.json(memoryToolsCache);
    }
  });

  // Per-tool long-form blog (loaded on demand by the tool detail page)
  app.get('/api/tools/:slug/blog', async (req, res) => {
    try {
      const slug = String(req.params.slug || '').toLowerCase();
      const db = await getMongoDb();
      if (!db) return res.json({ blog: '' });
      const tool = await db.collection('tools').findOne(
        { $or: [{ slug }, { id: slug }, { id: `tool-${slug}` }] },
        { projection: { blog: 1, name: 1 } },
      );
      res.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.json({ blog: (tool && tool.blog) || '' });
    } catch (error) {
      console.error('Error fetching tool blog:', error);
      return res.json({ blog: '' });
    }
  });

  // ── Tool reviews in "News & Guides" ─────────────────────────────────
  // Every tool blog already stored in the DB is surfaced as a review article
  // at /blog/<tool-slug>-review (read-only: nothing is generated here).
  // The same text is also rendered on /tool/<slug>, so review pages declare
  // the TOOL page as canonical: one ranking URL per piece of content, while
  // the guides hub adds a crawlable internal link to every tool.
  app.get('/api/guides', async (req, res) => {
    try {
      const guides = await getToolGuides();
      res.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400');
      return res.json({ guides: guides.map(({ content, ...meta }) => meta) });
    } catch (error) {
      console.error('Error listing tool guides:', error);
      return res.json({ guides: [] });
    }
  });

  app.get('/api/guides/:slug', async (req, res) => {
    try {
      const guide = await getToolGuide(String(req.params.slug || ''));
      if (!guide) return res.status(404).json({ guide: null });
      res.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400');
      return res.json({ guide });
    } catch (error) {
      console.error('Error fetching tool guide:', error);
      return res.status(500).json({ guide: null });
    }
  });

  // Builds BlogPost-shaped review articles from the stored tool blogs.
  const GUIDE_MIN_WORDS = 600; // same quality bar the pipeline uses before publishing
  const GUIDE_CACHE_TTL_MS = 5 * 60_000;
  let toolGuidesCache: { data: any[]; expiresAt: number } | null = null;

  function stripMd(s: string): string {
    return s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`>#]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildToolGuide(t: any) {
    const md = String(t.blog || '').trim();
    const words = md.split(/\s+/).filter(Boolean).length;
    const h1Match = md.match(/^\s*#\s+(.+)$/m);
    const title = h1Match ? stripMd(h1Match[1]) : `${t.name} Review`;
    const content = md.replace(/^\s*#\s+.+\r?\n/, '').trim();
    const firstPara =
      content
        .split(/\r?\n\s*\r?\n/)
        .map((b) => b.trim())
        .find((b) => b && !/^(#|\||[-*]\s|\d+\.\s|>|---)/.test(b)) || '';
    let excerpt = stripMd(firstPara);
    if (excerpt.length > 180) excerpt = excerpt.slice(0, 177).replace(/\s+\S*$/, '') + '…';
    const toolSlug = t.slug || String(t.id || '').replace(/^tool-/, '');
    const created = t.createdAt ? new Date(t.createdAt) : null;
    const updated = t.updatedAt ? new Date(t.updatedAt) : created;
    const iso = (d: Date | null) => (d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : undefined);
    const categorySlug = String(t.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      id: `guide-${toolSlug}`,
      slug: `${toolSlug}-review`,
      title,
      seoTitle: title,
      metaDescription: excerpt,
      excerpt,
      content,
      coverImage: t.logoUrl || '',
      topic: 'AI Tool Reviews',
      category: t.category || 'AI Tools',
      readTime: `${Math.max(3, Math.round(words / 220))} min read`,
      publishedDate: created && !isNaN(created.getTime())
        ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '',
      publishedAt: iso(created),
      updatedAt: iso(updated),
      status: 'published',
      author: { name: 'ToolverAI Editorial Team', role: 'Editorial', avatar: '' },
      relatedToolSlugs: [toolSlug],
      relatedCategorySlugs: categorySlug ? [categorySlug] : [],
      isToolGuide: true,
      toolSlug,
      toolName: t.name,
      logoUrl: t.logoUrl || '',
      canonicalUrl: `${(process.env.SITE_URL || 'https://toolverai.com').replace(/\/$/, '')}/tool/${toolSlug}`,
      wordCount: words,
    };
  }

  let toolGuidesRefresh: Promise<any[]> | null = null;
  async function getToolGuides(): Promise<any[]> {
    if (toolGuidesCache && Date.now() < toolGuidesCache.expiresAt) return toolGuidesCache.data;
    // Stale-while-revalidate: serve the previous list instantly and refresh in the background.
    if (!toolGuidesRefresh) {
      toolGuidesRefresh = loadToolGuides().finally(() => {
        toolGuidesRefresh = null;
      });
    }
    if (toolGuidesCache) {
      toolGuidesRefresh.catch(() => {});
      return toolGuidesCache.data;
    }
    return toolGuidesRefresh;
  }

  async function loadToolGuides(): Promise<any[]> {
    const db = await getMongoDb();
    if (!db) return toolGuidesCache?.data || [];
    const docs = await db
      .collection('tools')
      .find(
        { blog: { $exists: true, $ne: '' } },
        { projection: { name: 1, slug: 1, id: 1, category: 1, logoUrl: 1, createdAt: 1, updatedAt: 1, blog: 1 } },
      )
      .toArray();
    const data = docs
      .map(buildToolGuide)
      .filter((g) => g.wordCount >= GUIDE_MIN_WORDS && g.toolSlug)
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
    toolGuidesCache = { data, expiresAt: Date.now() + GUIDE_CACHE_TTL_MS };
    return data;
  }

  async function getToolGuide(slug: string): Promise<any | null> {
    const s = slug.toLowerCase();
    return (await getToolGuides()).find((g) => g.slug === s) || null;
  }

  // Add a New Tool
  app.post('/api/tools', requireAdmin, async (req, res) => {
    try {
      const toolData = req.body;
      if (!toolData.name || !toolData.category) {
        return res.status(400).json({ error: 'Tool name and category are required' });
      }

      const id = toolData.id || `tool-${Date.now()}`;
      const slug = toolData.slug || toolData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const monthlyVisits = Number(toolData.monthlyVisits) || 120000;
      let monthlyVisitsFormatted = toolData.monthlyVisitsFormatted;
      if (!monthlyVisitsFormatted) {
        if (monthlyVisits >= 1000000) {
          monthlyVisitsFormatted = `${(monthlyVisits / 1000000).toFixed(1)}M`;
        } else if (monthlyVisits >= 1000) {
          monthlyVisitsFormatted = `${Math.round(monthlyVisits / 1000)}K`;
        } else {
          monthlyVisitsFormatted = `${monthlyVisits}`;
        }
      }

      const newTool = {
        id,
        name: toolData.name,
        slug,
        tagline: toolData.tagline || 'Next-generation AI platform',
        description: toolData.description || 'Comprehensive AI tool designed for high productivity and automated workflows.',
        url: toolData.url || 'https://example.com',
        category: toolData.category,
        logoUrl: toolData.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        thumbnailVideoUrl: toolData.thumbnailVideoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        videoDuration: toolData.videoDuration || '03:15',
        rating: Number(toolData.rating) || 4.8,
        reviewCount: Number(toolData.reviewCount) || 12,
        pricingType: toolData.pricingType || 'Freemium',
        isOpenSource: Boolean(toolData.isOpenSource),
        hasApi: Boolean(toolData.hasApi),
        isFeatured: Boolean(toolData.isFeatured),
        isVerified: Boolean(toolData.isVerified),
        featuredRank: toolData.isFeatured ? 1 : undefined,
        monthlyVisits,
        monthlyVisitsFormatted,
        trafficGrowth: Number(toolData.trafficGrowth) || 24.5,
        globalRank: Number(toolData.globalRank) || 142,
        categoryRank: Number(toolData.categoryRank) || 4,
        topCountries: toolData.topCountries?.length ? toolData.topCountries : ['United States (42%)', 'India (18%)', 'Germany (9%)'],
        trafficStats: {
          monthlyVisits,
          monthlyVisitsFormatted,
          trafficGrowth: Number(toolData.trafficGrowth) || 24.5,
          globalRank: Number(toolData.globalRank) || 142,
          categoryRank: Number(toolData.categoryRank) || 4,
          topCountry: toolData.topCountry || 'United States (42%)',
          avgDuration: toolData.avgDuration || '05:30',
          bounceRate: toolData.bounceRate || '32.4%',
        },
        platforms: toolData.platforms?.length ? toolData.platforms : ['Web'],
        targetAudience: toolData.targetAudience?.length ? toolData.targetAudience : ['Professionals', 'Developers'],
        pros: toolData.pros?.length ? toolData.pros : ['Intuitive interface', 'Fast execution speed', 'Comprehensive feature set'],
        cons: toolData.cons?.length ? toolData.cons : ['Free plan has basic limits'],
        alternatives: toolData.alternatives?.length ? toolData.alternatives : [],
        deal: toolData.dealCode
          ? {
              discount: toolData.dealDiscount || '20% OFF',
              code: toolData.dealCode,
              description: toolData.dealDescription || 'Special launch discount',
              validUntil: toolData.dealValidUntil,
            }
          : toolData.deal || undefined,
        upvotes: Number(toolData.upvotes) || 10,
        launchedDate: toolData.launchedDate || new Date().toISOString().split('T')[0],
        keyFeatures: toolData.keyFeatures?.length ? toolData.keyFeatures : ['AI Automation', 'Cloud Sync', 'Real-time Processing'],
        pricingPlans: toolData.pricingPlans?.length
          ? toolData.pricingPlans
          : [
              {
                id: `${id}-free`,
                name: 'Free Starter',
                price: '$0',
                period: 'forever',
                features: ['Basic AI features', 'Standard speed', 'Community support'],
              },
              {
                id: `${id}-pro`,
                name: 'Pro Tier',
                price: toolData.proPrice || '$20',
                period: 'monthly',
                features: ['Unlimited AI generation', 'High-priority GPU access', 'API Keys access', 'Priority support'],
                isPopular: true,
              },
            ],
        reviews: toolData.reviews || [],
        createdAt: new Date().toISOString(),
      };

      // Save to MongoDB if available
      const db = await getMongoDb();
      if (db) {
        await db.collection('tools').replaceOne(
          { id: newTool.id },
          { ...newTool, _id: newTool.id as any },
          { upsert: true }
        );
        console.log(`✅ Stored new tool "${newTool.name}" in MongoDB collection tools.`);
      }

      // Update memory cache
      memoryToolsCache = [newTool, ...memoryToolsCache.filter((t) => t.id !== newTool.id)];
      invalidateDbToolsCache();

      // Automatically notify IndexNow of new tool content (asynchronous fire-and-forget)
      const baseUrl = resolveBaseUrl(req);
      triggerToolContentChange(newTool, 'create', baseUrl).catch((err) =>
        console.warn('[IndexNow Trigger Warning]', err?.message)
      );

      res.status(201).json({
        success: true,
        message: db ? 'Tool successfully saved in MongoDB' : 'Tool saved (local cache fallback)',
        tool: newTool,
      });
    } catch (error: any) {
      console.error('Error in POST /api/tools:', error);
      res.status(500).json({ error: error?.message || 'Failed to save tool' });
    }
  });

  // Update a Tool
  app.put('/api/tools/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const db = await getMongoDb();
      if (db) {
        await db.collection('tools').updateOne({ id }, { $set: updates });
      }

      memoryToolsCache = memoryToolsCache.map((t) => (t.id === id ? { ...t, ...updates } : t));
      invalidateDbToolsCache();
      const updatedTool = memoryToolsCache.find((t) => t.id === id) || { id, ...updates };

      // Automatically notify IndexNow of updated tool content
      const baseUrl = resolveBaseUrl(req);
      triggerToolContentChange(updatedTool, 'update', baseUrl).catch((err) =>
        console.warn('[IndexNow Trigger Warning]', err?.message)
      );

      res.json({ success: true, message: 'Tool updated successfully' });
    } catch (error: any) {
      console.error('Error in PUT /api/tools/:id:', error);
      res.status(500).json({ error: error?.message || 'Failed to update tool' });
    }
  });

  // Public: add a user review to a tool. Accepts ONLY review fields (validated,
  // length-capped) and recomputes rating server-side — the public client can
  // no longer overwrite arbitrary tool fields.
  app.post('/api/tools/:id/reviews', async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body || {};
      const clip = (v: any, n: number) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
      const rating = Math.round(Number(b.rating));
      const comment = clip(b.comment, 2000);
      if (!comment || !(rating >= 1 && rating <= 5)) {
        return res.status(400).json({ success: false, error: 'A comment and a 1-5 rating are required.' });
      }
      const avatar = String(b.authorAvatar || '');
      const review = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        authorName: clip(b.authorName, 80) || 'Verified Member',
        authorRole: clip(b.authorRole, 80) || 'Verified User',
        authorCompany: clip(b.authorCompany, 80) || '',
        authorAvatar: /^https:\/\//i.test(avatar) ? avatar.slice(0, 500) : '',
        rating,
        comment,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        verified: false,
        helpfulCount: 0,
      };

      const db = await getMongoDb();
      if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });
      const tool = await db.collection('tools').findOne({ id }, { projection: { reviews: 1 } });
      if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
      const reviews = [review, ...(Array.isArray(tool.reviews) ? tool.reviews : [])].slice(0, 200);
      const avg = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / reviews.length;
      await db.collection('tools').updateOne(
        { id },
        { $set: { reviews, reviewCount: reviews.length, rating: parseFloat(avg.toFixed(1)) } }
      );
      invalidateDbToolsCache();
      res.status(201).json({ success: true, review, reviewCount: reviews.length, rating: parseFloat(avg.toFixed(1)) });
    } catch (error: any) {
      console.error('Error in POST /api/tools/:id/reviews:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to add review' });
    }
  });

  // Delete a Tool
  app.delete('/api/tools/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deletedTool = memoryToolsCache.find((t) => t.id === id) || { id };

      const db = await getMongoDb();
      if (db) {
        await db.collection('tools').deleteOne({ id });
      }

      memoryToolsCache = memoryToolsCache.filter((t) => t.id !== id);
      invalidateDbToolsCache();

      // Automatically notify IndexNow of removed tool content
      const baseUrl = resolveBaseUrl(req);
      triggerToolContentChange(deletedTool, 'delete', baseUrl).catch((err) =>
        console.warn('[IndexNow Trigger Warning]', err?.message)
      );

      res.json({ success: true, message: 'Tool deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/tools/:id:', error);
      res.status(500).json({ error: error?.message || 'Failed to delete tool' });
    }
  });

  // Seed MongoDB
  app.post('/api/tools/seed', requireAdmin, async (req, res) => {
    try {
      const db = await getMongoDb();
      if (!db) {
        return res.status(400).json({ error: 'MongoDB is not connected. Check MONGODB_URI.' });
      }

      const collection = db.collection('tools');
      await collection.deleteMany({});
      await collection.insertMany(INITIAL_TOOLS.map((t) => ({ ...t, _id: t.id as any })));

      memoryToolsCache = [...INITIAL_TOOLS];
      invalidateDbToolsCache();

      res.json({
        success: true,
        message: `Successfully seeded ${INITIAL_TOOLS.length} tools into MongoDB ${db.databaseName}.tools`,
      });
    } catch (error: any) {
      console.error('Error seeding MongoDB:', error);
      res.status(500).json({ error: error?.message || 'Failed to seed tools' });
    }
  });

  // Newsletter Subscription API
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email, source, topics } = req.body || {};
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      }

      const chosenTopics = Array.isArray(topics) && topics.length > 0
        ? topics
        : ['Weekly AI Roundup', 'Exclusive Deals', 'Model Benchmarks'];

      const subscriberDoc = {
        email: cleanEmail,
        source: source || 'join_newsletter_component',
        topics: chosenTopics,
        status: 'active',
        subscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const db = await getMongoDb();
      let alreadySubscribed = false;

      if (db) {
        const collection = db.collection('newsletter_subscribers');
        const existing = await collection.findOne({ email: cleanEmail });
        if (existing) {
          alreadySubscribed = true;
          await collection.updateOne(
            { email: cleanEmail },
            {
              $set: {
                status: 'active',
                updatedAt: new Date().toISOString(),
                topics: chosenTopics,
                source: subscriberDoc.source,
              },
            }
          );
          console.log(`ℹ️ Updated preferences for existing newsletter subscriber: ${cleanEmail}`);
        } else {
          await collection.insertOne({ ...subscriberDoc, _id: cleanEmail as any });
          console.log(`✅ Stored new newsletter subscriber in MongoDB: ${cleanEmail}`);
        }
      }

      // Keep resilient in-memory cache synchronized
      const existingIdx = memorySubscribersCache.findIndex((s) => s.email === cleanEmail);
      if (existingIdx >= 0) {
        alreadySubscribed = true;
        memorySubscribersCache[existingIdx] = {
          ...memorySubscribersCache[existingIdx],
          ...subscriberDoc,
        };
      } else {
        memorySubscribersCache.unshift(subscriberDoc);
      }

      return res.json({
        success: true,
        alreadySubscribed,
        message: alreadySubscribed
          ? 'Welcome back! Your newsletter preferences have been updated.'
          : 'Thank you for subscribing! You will receive our weekly curated AI breakthroughs and verified discounts.',
        subscriber: {
          email: cleanEmail,
          subscribedAt: subscriberDoc.subscribedAt,
          topics: subscriberDoc.topics,
        },
      });
    } catch (err: any) {
      console.error('Error in POST /api/newsletter/subscribe:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to register newsletter subscription. Please try again.',
      });
    }
  });

  // Newsletter Subscribers Count for Social Proof
  app.get('/api/newsletter/count', async (req, res) => {
    try {
      const db = await getMongoDb();
      let realCount = 0;
      if (db) {
        realCount = await db.collection('newsletter_subscribers').countDocuments({ status: 'active' });
      } else {
        realCount = memorySubscribersCache.length;
      }
      const displayCount = 18450 + realCount;
      res.json({
        count: realCount,
        displayCount,
        displayCountFormatted: `${(displayCount / 1000).toFixed(1)}k+`,
      });
    } catch (err: any) {
      res.json({ count: memorySubscribersCache.length, displayCount: 18450, displayCountFormatted: '18.4k+' });
    }
  });

  // Get Newsletter Subscribers (Admin / Overview)
  app.get('/api/newsletter/subscribers', requireAdmin, async (req, res) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const subscribers = await db
          .collection('newsletter_subscribers')
          .find()
          .sort({ subscribedAt: -1 })
          .limit(100)
          .toArray();
        const count = await db.collection('newsletter_subscribers').countDocuments();
        return res.json({ count, subscribers });
      }
      return res.json({ count: memorySubscribersCache.length, subscribers: memorySubscribersCache });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tool Submissions API (Community Suggestions Queue)
  app.post('/api/submissions', async (req, res) => {
    try {
      const { name, description, websiteUrl, category, imageUrl, pricingType, submitterEmail } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Tool Name is required.' });
      }
      if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ success: false, error: 'Description is required.' });
      }
      if (!websiteUrl || typeof websiteUrl !== 'string' || !websiteUrl.trim()) {
        return res.status(400).json({ success: false, error: 'Website URL is required.' });
      }
      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ success: false, error: 'Category is required.' });
      }
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return res.status(400).json({ success: false, error: 'Image URL is required.' });
      }
      // Reject markup in text fields and non-web URLs (blocks stored-XSS payloads at the door).
      if ([name, description, category].some((v) => /[<>]/.test(v)) || name.length > 120 || description.length > 3000) {
        return res.status(400).json({ success: false, error: 'Text fields may not contain HTML and must be reasonably short.' });
      }
      const webUrl = (u: string) => /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(u.trim()) && !/^\s*(javascript|data|vbscript):/i.test(u);
      if (!webUrl(websiteUrl) || !/^https?:\/\//i.test(imageUrl.trim())) {
        return res.status(400).json({ success: false, error: 'Website and image must be normal http(s) URLs.' });
      }

      const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const cleanWebsite = websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`;

      const newSubmission = {
        id,
        name: name.trim(),
        description: description.trim(),
        websiteUrl: cleanWebsite,
        category: category.trim(),
        imageUrl: imageUrl.trim(),
        pricingType: pricingType || 'Freemium',
        submitterEmail: submitterEmail?.trim() || 'community@toolverai.com',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      const db = await getMongoDb();
      if (db) {
        await db.collection('tool_submissions').replaceOne(
          { id: newSubmission.id },
          { ...newSubmission, _id: newSubmission.id as any },
          { upsert: true }
        );
        console.log(`✅ Stored new tool suggestion "${newSubmission.name}" in MongoDB collection tool_submissions.`);
      }

      memorySubmissionsCache = [newSubmission, ...memorySubmissionsCache.filter((s) => s.id !== newSubmission.id)];

      res.status(201).json({
        success: true,
        message: 'Your tool suggestion has been successfully submitted and added to the admin review queue!',
        submission: newSubmission,
      });
    } catch (err: any) {
      console.error('Error in POST /api/submissions:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to submit tool suggestion.' });
    }
  });

  // Get Tool Submissions Queue (Admin)
  app.get('/api/submissions', requireAdmin, async (req, res) => {
    try {
      const db = await getMongoDb();
      if (db) {
        const submissions = await db
          .collection('tool_submissions')
          .find({})
          .sort({ submittedAt: -1 })
          .toArray();

        const clean = submissions.map((s) => {
          const { _id, ...rest } = s;
          return { id: rest.id || _id?.toString(), ...rest };
        });

        memorySubmissionsCache = clean;
        const pendingCount = clean.filter((s: any) => s.status === 'pending').length;
        return res.json({ success: true, submissions: clean, pendingCount, totalCount: clean.length });
      }

      const pendingCount = memorySubmissionsCache.filter((s: any) => s.status === 'pending').length;
      res.json({
        success: true,
        submissions: memorySubmissionsCache,
        pendingCount,
        totalCount: memorySubmissionsCache.length,
      });
    } catch (err: any) {
      console.error('Error in GET /api/submissions:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Approve a Tool Submission (Creates tool in directory & updates queue)
  app.post('/api/submissions/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      let submission = memorySubmissionsCache.find((s) => s.id === id);

      const db = await getMongoDb();
      if (db) {
        const dbSub = await db.collection('tool_submissions').findOne({ id });
        if (dbSub) {
          submission = dbSub;
        }
      }

      if (!submission) {
        return res.status(404).json({ success: false, error: 'Submission not found in review queue.' });
      }

      const toolId = `tool-${Date.now()}`;
      const slug = submission.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const newTool = {
        id: toolId,
        name: submission.name,
        slug,
        tagline: `Innovative ${submission.category} AI tool for creators and professionals`,
        description: submission.description,
        url: submission.websiteUrl.startsWith('http') ? submission.websiteUrl : `https://${submission.websiteUrl}`,
        category: submission.category,
        logoUrl: submission.imageUrl,
        thumbnailVideoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        videoDuration: '02:45',
        rating: 4.8,
        reviewCount: 1,
        pricingType: submission.pricingType || 'Freemium',
        isOpenSource: false,
        hasApi: true,
        isFeatured: false,
        monthlyVisits: 115000,
        monthlyVisitsFormatted: '115K',
        trafficGrowth: 22.4,
        globalRank: 165,
        categoryRank: 4,
        topCountries: ['United States (40%)', 'United Kingdom (14%)', 'Germany (10%)'],
        trafficStats: {
          monthlyVisits: 115000,
          monthlyVisitsFormatted: '115K',
          trafficGrowth: 22.4,
          globalRank: 165,
          categoryRank: 4,
          topCountry: 'United States (40%)',
          avgDuration: '04:30',
          bounceRate: '34.5%',
        },
        platforms: ['Web'],
        targetAudience: ['Developers', 'Designers', 'Founders'],
        pros: ['Streamlined workflow', 'Responsive performance', 'Intuitive interface'],
        cons: ['Free plan has standard rate limits'],
        alternatives: [],
        upvotes: 8,
        launchedDate: new Date().toISOString().split('T')[0],
        keyFeatures: ['Automated AI Processing', 'High-Speed Cloud Execution', 'API Integration'],
        pricingPlans: [
          {
            id: `${toolId}-starter`,
            name: 'Free Starter',
            price: '$0',
            billingPeriod: 'forever',
            features: ['Essential capabilities', 'Standard speed', 'Community support'],
          },
          {
            id: `${toolId}-pro`,
            name: 'Pro Tier',
            price: '$19',
            billingPeriod: 'monthly',
            features: ['Unlimited generation', 'Priority speed', 'API Access', 'Priority support'],
            isPopular: true,
          },
        ],
        reviews: [
          {
            id: `rev-${Date.now()}`,
            authorName: 'ToolverAI Verification Team',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            rating: 5,
            comment: `Reviewed and approved for official ToolverAI directory indexing. High potential in the ${submission.category} space!`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            verified: true,
          },
        ],
        createdAt: new Date().toISOString(),
        submittedBy: submission.submitterEmail,
      };

      if (db) {
        // 1. Insert tool into tools collection
        await db.collection('tools').replaceOne(
          { id: newTool.id },
          { ...newTool, _id: newTool.id as any },
          { upsert: true }
        );
        // 2. Update submission status in tool_submissions
        await db.collection('tool_submissions').updateOne(
          { id },
          {
            $set: {
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              approvedToolId: newTool.id,
            },
          }
        );
      }

      // Update in-memory caches
      memoryToolsCache = [newTool, ...memoryToolsCache.filter((t) => t.id !== newTool.id)];
      invalidateDbToolsCache();
      memorySubmissionsCache = memorySubmissionsCache.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              approvedToolId: newTool.id,
            }
          : s
      );

      // Automatically notify IndexNow of approved and published tool (fire-and-forget)
      const baseUrl = resolveBaseUrl(req);
      triggerToolContentChange(newTool, 'create', baseUrl).catch((err) =>
        console.warn('[IndexNow Trigger Warning]', err?.message)
      );

      res.json({
        success: true,
        message: `Tool "${newTool.name}" has been approved and published to the live directory!`,
        tool: newTool,
      });
    } catch (err: any) {
      console.error('Error in POST /api/submissions/:id/approve:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reject a Tool Submission
  app.post('/api/submissions/:id/reject', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body || {};

      const db = await getMongoDb();
      if (db) {
        await db.collection('tool_submissions').updateOne(
          { id },
          {
            $set: {
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || 'Does not meet minimum verification criteria',
            },
          }
        );
      }

      memorySubmissionsCache = memorySubmissionsCache.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes || 'Does not meet minimum verification criteria',
            }
          : s
      );

      res.json({ success: true, message: 'Submission marked as rejected.' });
    } catch (err: any) {
      console.error('Error in POST /api/submissions/:id/reject:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a Tool Submission
  app.delete('/api/submissions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const db = await getMongoDb();
      if (db) {
        await db.collection('tool_submissions').deleteOne({ id });
      }

      memorySubmissionsCache = memorySubmissionsCache.filter((s) => s.id !== id);
      res.json({ success: true, message: 'Submission removed from queue.' });
    } catch (err: any) {
      console.error('Error in DELETE /api/submissions/:id:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // AI Tool Matcher
  app.post('/api/ai/match-tools', async (req, res) => {
    try {
      const { userGoal, budget, category, toolsData } = req.body;
      const ai = getAIClient();

      if (!ai) {
        // Fallback intelligent matching if API key not yet provided
        return res.json({
          recommendations: [
            {
              toolName: 'Cursor AI',
              matchScore: 98,
              reason: 'Best in class for AI code completion, multi-file edits, and agentic debugging with terminal integration.',
              pricingNote: '$20/mo Pro Plan fits developer workflows perfectly.',
            },
            {
              toolName: 'ChatGPT-4o',
              matchScore: 94,
              reason: 'Versatile multimodal AI supporting code, vision, documents, and real-time voice analysis.',
              pricingNote: 'Free tier available, Plus at $20/mo.',
            },
            {
              toolName: 'Perplexity AI',
              matchScore: 91,
              reason: 'Real-time citation engine ideal for technical research and API documentation lookups.',
              pricingNote: 'Free tier with daily pro searches.',
            },
          ],
          summary: `Based on your goal "${userGoal || 'AI productivity'}", here are the top matching tools based on traffic volume, features, and developer feedback.`,
        });
      }

      const prompt = `You are the chief AI Analyst for ToolverAI (toolverai.com, an AI directory combining Toolify.ai traffic intelligence and curated AI deals).
The user wants recommendations for:
- User Goal / Query: "${userGoal || 'General AI tools'}"
- Budget / Pricing Preference: "${budget || 'Any'}"
- Desired Category: "${category || 'All'}"

Available Tools in directory:
${JSON.stringify(
  (toolsData || []).slice(0, 15).map((t: any) => ({
    name: t.name,
    category: t.category,
    tagline: t.tagline,
    pricingType: t.pricingType,
    monthlyVisits: t.monthlyVisitsFormatted,
  }))
)}

Provide a structured JSON response with:
1. "summary": A brief 1-2 sentence recommendation overview.
2. "recommendations": Array of 3-4 objects, each containing:
   - "toolName": name of the tool
   - "matchScore": integer between 85 and 99
   - "reason": 1-2 sentences on why it fits the user's specific request
   - "pricingNote": short pricing advice
Only respond with valid JSON.`;

      const response = await ai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an AI analyst. Only respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/match-tools:', error);
      res.status(500).json({ error: error?.message || 'Failed to match tools' });
    }
  });

  // AI Prompt Optimizer
  app.post('/api/ai/optimize-prompt', async (req, res) => {
    try {
      const { rawPrompt, targetModel, taskType } = req.body;
      const ai = getAIClient();

      if (!ai) {
        return res.json({
          optimizedPrompt: `### ROLE & OBJECTIVE\nYou are an elite specialist in ${taskType || 'AI assistance'}.\n\n### TASK INSTRUCTIONS\n${rawPrompt}\n\n### CONSTRAINTS & FORMATTING\n- Deliver clear, production-ready output.\n- Structure findings into scannable markdown with bullet points.\n- Eliminate boilerplate and deliver concise, high-signal explanations.\n\n### OUTPUT SPECIFICATION\nProvide the final output immediately without conversational filler.`,
          tips: [
            'Includes clear system role framing to anchor model context.',
            'Adds explicit output constraints to reduce hallucination and verbose replies.',
            'Optimized for token efficiency and high output fidelity.',
          ],
        });
      }

      const prompt = `You are a world-class Prompt Engineer for top AI models (${targetModel || 'Universal LLM'}).
Improve and engineer the following raw prompt into a production-grade master prompt:

Raw Input: "${rawPrompt}"
Target Model: "${targetModel || 'Universal'}"
Task Type: "${taskType || 'General'}"

Return a JSON object with:
1. "optimizedPrompt": The complete, copyable, structured prompt (with sections like Role, Instructions, Constraints, Examples/Format).
2. "tips": Array of 3 short bullet points explaining why this prompt structure improves output quality.
Only return valid JSON.`;

      const response = await ai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a world-class Prompt Engineer. Only respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/optimize-prompt:', error);
      res.status(500).json({ error: error?.message || 'Failed to optimize prompt' });
    }
  });

  // AI Comparison Verdict
  app.post('/api/ai/compare-verdict', async (req, res) => {
    try {
      const { tool1Name, tool2Name, tool3Name, toolData } = req.body;
      const ai = getAIClient();

      if (!ai) {
        return res.json({
          verdictTitle: `${tool1Name} vs ${tool2Name}: Key Takeaway`,
          summary: `${tool1Name} leads in market traffic and ecosystem integrations, while ${tool2Name} offers specialized workflow advantages and accessible pricing.`,
          recommendation: `Choose ${tool1Name} for enterprise scalability and standard team adoption. Choose ${tool2Name} for agile workflows and cost efficiency.`,
          keyFactors: [
            { factor: 'Traffic & Community', winner: tool1Name, reason: 'Higher monthly active user volume and broader documentation.' },
            { factor: 'Value for Money', winner: tool2Name, reason: 'More generous free tier and accessible subscription tiers.' },
            { factor: 'Feature Depth', winner: 'Tie', reason: 'Both tools excel within their respective sub-niches.' }
          ]
        });
      }

      const prompt = `You are an expert AI software analyst for ToolverAI Directory (toolverai.com).
Compare these AI tools:
Tool A: ${tool1Name}
Tool B: ${tool2Name}
${tool3Name ? `Tool C: ${tool3Name}` : ''}

Tools Data:
${JSON.stringify(toolData || {})}

Return a JSON object with:
1. "verdictTitle": Catchy 4-7 word title of the verdict.
2. "summary": 2-3 sentences summarizing the major architectural and workflow differences.
3. "recommendation": Concrete guidance on who should choose which tool.
4. "keyFactors": Array of 3-4 objects with {"factor": string, "winner": string, "reason": string}.
Only return valid JSON.`;

      const response = await ai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an expert AI software analyst. Only respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/compare-verdict:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate comparison verdict' });
    }
  });

  // ── Vite / Static File Middleware ─────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // ── SSR output escaping ───────────────────────────────────────────────
    // SSR pages build HTML with template strings straight from tool data, much of
    // which comes from public submissions. Every SSR route therefore reads tools
    // through getSsrTools(), which returns copies whose strings are neutralised
    // for HTML (< > " ' encoded) and whose URLs are restricted to http(s).
    // `&` is left as-is: it cannot open a tag/attribute, and leaving it keeps
    // names like "Data & Analytics" clean inside JSON-LD.
    const escHtml = (s: string) =>
      s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const URL_KEYS = new Set(['url', 'logoUrl', 'thumbnailVideoUrl', 'imageUrl', 'websiteUrl', 'authorAvatar']);
    function sanitizeForHtml(value: any, key = ''): any {
      if (typeof value === 'string') {
        if (URL_KEYS.has(key) && value && !/^https?:\/\//i.test(value.trim())) return '';
        return escHtml(value);
      }
      if (Array.isArray(value)) return value.map((v) => sanitizeForHtml(v));
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) out[k] = sanitizeForHtml(v, k);
        return out;
      }
      return value;
    }
    let ssrToolsCache: { src: any[]; data: any[] } | null = null;
    async function getSsrTools(): Promise<any[]> {
      const src = await getToolsFromDbOrFallback();
      if (ssrToolsCache && ssrToolsCache.src === src) return ssrToolsCache.data;
      const data = src.map((t) => sanitizeForHtml(t));
      ssrToolsCache = { src, data };
      return data;
    }

    // ── Legacy Tool Slug 301 Permanent Redirect Map ─────────────────────
    const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
      'cursor-ai': 'cursor',
      'perplexity-ai': 'perplexity',
      'deepseek-r1': 'deepseek',
      'jasper-ai': 'jasper',
      'julius-ai': 'julius',
      'devin-ai': 'devin',
      apple: 'vidcap', // lead file mislabelled VidCap (vidcap.app) as "Apple"; renamed 2026-11-06
    };

    // Slugify a stored alias the same way the Python pipeline slugs a tool name,
    // so an old lead-file name ("Apple") maps to the old URL slug ("apple").
    const slugifyAlias = (s: string) =>
      String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Build {oldSlug -> currentSlug} from each tool's DB `aliases`. When the daily
    // pipeline renames a tool it records the old name in `aliases`; without this,
    // the old /tool/<oldSlug> URL 404s (a recurring Search Console "Not found"
    // source) until someone hand-edits LEGACY_SLUG_REDIRECTS. This self-heals every
    // rename, present and future. Only consulted when no live tool matches the slug,
    // so a real tool slug always wins over an alias.
    function buildAliasRedirectMap(tools: any[]): Record<string, string> {
      const map: Record<string, string> = {};
      for (const t of tools) {
        const canonical = String(t?.slug || t?.id || '').toLowerCase();
        if (!canonical) continue;
        for (const a of Array.isArray(t?.aliases) ? t.aliases : []) {
          const key = slugifyAlias(a);
          if (key && key !== canonical && !map[key]) map[key] = canonical;
        }
      }
      return map;
    }

    interface SsrMetaOptions {
      title: string;
      description: string;
      canonical: string;
      robots?: string;
      ogType?: 'website' | 'product' | 'article';
      ogImage?: string;
      jsonLd?: (string | Record<string, any>)[];
      bodyHtml?: string;
    }

    /**
     * Strips all preexisting/default title, canonical, description, robots, og, twitter, and verification tags
     * from the HTML template to guarantee exactly ONE canonical tag and zero duplicate metadata.
     */
    function cleanHtmlTemplateHead(html: string): string {
      return html
        .replace(/<meta\s+charset=["']?[^"'>\s]+["']?\s*\/?>\s*/gi, '')
        .replace(/<title>[^<]*<\/title>\s*/gi, '')
        .replace(/<meta\s+name=["']description["'][^>]*\/?>\s*/gi, '')
        .replace(/<meta\s+name=["']robots["'][^>]*\/?>\s*/gi, '')
        .replace(/<link\s+rel=["']canonical["'][^>]*\/?>\s*/gi, '')
        .replace(/<meta\s+name=["']google-site-verification["'][^>]*\/?>\s*/gi, '')
        .replace(/<meta\s+name=["']msvalidate\.01["'][^>]*\/?>\s*/gi, '')
        .replace(/<meta\s+property=["']og:[^"']+["'][^>]*\/?>\s*/gi, '')
        .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*\/?>\s*/gi, '');
    }

    /**
     * Injects exactly one canonical tag, one title, one description, and consistent OpenGraph/Twitter meta tags.
     * Optionally injects semantic pre-rendered HTML into #root for crawlers.
     */
    function renderSsrPage(htmlTemplate: string, options: SsrMetaOptions): string {
      const cleanedHtml = cleanHtmlTemplateHead(htmlTemplate);

      // Values below land in element text AND double-quoted attributes: escape both contexts.
      // (Callers pass already-escaped tool fields; the `&(?!...)` guard avoids double-encoding entities.)
      const escAttr = (s: string) =>
        String(s ?? '')
          .replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const title = escAttr(options.title);
      const desc = escAttr(options.description);
      const canonical = escAttr(options.canonical);
      const robots = options.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
      const ogType = options.ogType || 'website';
      const ogImage = options.ogImage || 'https://toolverai.com/og-banner.png';

      const tags: string[] = [
        // Must sit in the first 1024 bytes. It used to land ~3.9KB in (after these tags), and
        // crawlers that sniff the encoding showed every em dash in titles as a replacement char.
        `<meta charset="UTF-8" />`,
        `<title>${title}</title>`,
        `<meta name="description" content="${desc}" />`,
        `<meta name="robots" content="${robots}" />`,
        `<link rel="canonical" href="${canonical}" />`,
        `<meta property="og:site_name" content="ToolverAI" />`,
        `<meta property="og:type" content="${ogType}" />`,
        `<meta property="og:url" content="${canonical}" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${desc}" />`,
        `<meta property="og:image" content="${ogImage}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${title}" />`,
        `<meta property="og:locale" content="en_US" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:site" content="@toolverai" />`,
        `<meta name="twitter:creator" content="@toolverai" />`,
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${desc}" />`,
        `<meta name="twitter:image" content="${ogImage}" />`,
      ];

      // Render Google verification tag only if a real configured value exists (never output unresolved placeholders)
      const gVer = process.env.VITE_GOOGLE_SITE_VERIFICATION || process.env.GOOGLE_SITE_VERIFICATION;
      if (gVer && !gVer.startsWith('%') && gVer.trim().length > 0) {
        tags.push(`<meta name="google-site-verification" content="${gVer.trim()}" />`);
      }

      // JSON-LD Structured Data
      if (options.jsonLd && options.jsonLd.length > 0) {
        for (const schema of options.jsonLd) {
          // `<` -> < keeps JSON valid while making `</script>` break-outs impossible.
          const jsonStr = (typeof schema === 'string' ? schema : JSON.stringify(schema)).replace(/</g, '\\u003c');
          tags.push(`<script type="application/ld+json">${jsonStr}</script>`);
        }
      }

      const injectedBlock = tags.map((t) => `    ${t}`).join('\n');
      let result = cleanedHtml.replace(/<head>/i, `<head>\n${injectedBlock}`);

      if (options.bodyHtml) {
        // Crawlers that don't run JS never see the React footer, which left the trust/legal pages
        // with zero internal inlinks. Every SSR body therefore ends with the same plain footer nav.
        const body = `${options.bodyHtml}\n${SSR_FOOTER_HTML}`;
        result = result.replace(/<div id=["']root["']>\s*<\/div>/i, `<div id="root">\n${body}\n</div>`);
      }

      return result;
    }

    const SSR_FOOTER_HTML = `<footer>
  <nav aria-label="Site">
    <p>
      <a href="/">AI Tools Directory</a> | <a href="/categories">Categories</a> | <a href="/rankings">Rankings</a> |
      <a href="/compare">Compare AI Tools</a> | <a href="/alternatives">Alternatives</a> | <a href="/deals">AI Deals</a> |
      <a href="/prompts">Prompts</a> | <a href="/blog">Blog</a> | <a href="/submit-tool">Submit a Tool</a>
    </p>
    <p>
      <a href="/about">About</a> | <a href="/editorial-policy">Editorial Policy</a> | <a href="/how-we-rank-tools">How We Rank Tools</a> |
      <a href="/affiliate-disclosure">Affiliate Disclosure</a> | <a href="/privacy-policy">Privacy Policy</a> | <a href="/terms">Terms of Service</a>
    </p>
  </nav>
</footer>`;

    let cachedIndexHtmlTemplate: string | null = null;
    function getIndexHtmlTemplate(): string {
      if (process.env.NODE_ENV === 'production' && cachedIndexHtmlTemplate) {
        return cachedIndexHtmlTemplate;
      }
      const tpl = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      if (process.env.NODE_ENV === 'production') {
        cachedIndexHtmlTemplate = tpl;
      }
      return tpl;
    }

    // Serve static assets without serving default index.html on root (ensures root receives SSR canonical)
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1y',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
        } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
          // Vite generated assets have hash in filename (immutable)
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
      },
    }));

    // ── SSR Categories Definition ──────────────────────────────────────
    const SSR_CATEGORIES = [
      { name: 'Coding', slug: 'coding', desc: 'AI code completion, full repository refactoring, bug scanning, and test suite generation.' },
      { name: 'Productivity', slug: 'productivity', desc: 'Meeting notes summarization, automated email triage, calendar scheduling, and workflow AI.' },
      { name: 'Image AI', slug: 'image-ai', desc: 'Neural image upscaling, generative diffusion models, logo synthesis, and texture generation.' },
      { name: 'Video AI', slug: 'video-ai', desc: 'Text-to-video generation, cinematic b-roll synthesis, automated video editing, and avatar creators.' },
      { name: 'Audio AI', slug: 'audio-ai', desc: 'Voice cloning, AI stems separation, podcast audio cleanup, and multi-lingual voice translation.' },
      { name: 'Copywriting', slug: 'copywriting', desc: 'AI assistants for ad copy, long-form articles, technical whitepapers, and sales funnels.' },
      { name: 'Data & Analytics', slug: 'data-analytics', desc: 'Natural language SQL queries, predictive regression forecasts, and automated chart builders.' },
      { name: 'Agents', slug: 'agents', desc: 'Autonomous multi-agent swarms, browser automation bots, and self-improving reasoning loops.' },
    ];

    // ── SSR: Homepage (/) ───────────────────────────────────────────────
    app.get('/', async (req, res) => {
      try {
        const htmlTemplate = getIndexHtmlTemplate();
        const baseUrl = resolveBaseUrl(req);
        const title = HUB_TITLES.home;
        const desc = 'Explore the best AI tools in 2026. Discover, compare, and track top AI tools across coding, productivity, image, and video generation in our curated AI tools directory.';
        const canonical = `${baseUrl}/`;
        const tools = await getSsrTools();

        const homeJsonLd = [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${baseUrl}/#organization`,
            name: 'ToolverAI',
            url: baseUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/og-banner.png`,
              width: 1200,
              height: 630,
            },
            description: 'ToolverAI is the leading AI tools discovery platform with rankings, comparisons, verified deals, and reviews.',
            sameAs: ['https://x.com/toolverai'],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            url: baseUrl,
            name: 'ToolverAI',
            description: 'Discover, compare and track the best AI tools. Real traffic data, verified deals, and expert reviews.',
            publisher: { '@id': `${baseUrl}/#organization` },
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/?search={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          },
        ];

        const topTools = tools.slice(0, 12);
        const homeBodyHtml = `
<header>
  <nav aria-label="Main Navigation">
    <a href="/">Home</a>
    <a href="/rankings">Rankings</a>
    <a href="/deals">Deals</a>
    <a href="/compare">Compare</a>
    <a href="/prompts">Prompts</a>
    <a href="/categories">Categories</a>
    <a href="/blog">Blog</a>
  </nav>
</header>
<main>
  <section>
    <h1>Discover, Compare &amp; Find the Best AI Tools</h1>
    <p>ToolverAI is the premier AI tools directory and software discovery platform. Explore 120+ artificial intelligence applications, compare pricing and estimated monthly traffic rankings, discover curated deals, and supercharge your engineering, creative, and business workflows.</p>
    <nav aria-label="Explore Core Features">
      <a href="/rankings">Traffic Rankings</a>
      <a href="/deals">Exclusive AI Deals</a>
      <a href="/compare">Side-by-Side Comparison</a>
      <a href="/prompts">Prompt Library</a>
      <a href="/categories">Browse Categories</a>
    </nav>
  </section>
  <section>
    <h2>Browse AI Tools by Category</h2>
    <p>Discover specialized AI software organized across primary disciplines:</p>
    <ul>
      ${SSR_CATEGORIES.map((c) => `<li><a href="/categories/${c.slug}"><strong>${c.name}</strong></a>: ${c.desc}</li>`).join('\n      ')}
    </ul>
  </section>
  <section>
    <h2>Trending &amp; Popular AI Tools in 2026</h2>
    <p>The top artificial intelligence tools ranked by estimated monthly web visits and community engagement:</p>
    <ul>
      ${topTools.map((t) => `<li><a href="/tool/${t.slug || t.id}"><strong>${t.name}</strong></a> (${t.category}) — ${t.tagline || t.description?.slice(0, 80)} [${t.monthlyVisitsFormatted || 'N/A'} visits/mo | ${t.pricingType || 'Freemium'}]</li>`).join('\n      ')}
    </ul>
  </section>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          jsonLd: homeJsonLd,
          bodyHtml: homeBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // Legacy plural scheme safety net: 301 /tools/:slug -> /tool/:slug (and the
    // bare /tools listing -> homepage) so any old inbound/indexed plural URLs
    // consolidate onto the canonical singular page instead of 404ing.
    app.get('/tools/:slug', (req, res) => res.redirect(301, `/tool/${String(req.params.slug).toLowerCase()}`));
    app.get('/tools', (_req, res) => res.redirect(301, '/'));

    // ── SSR: Tool Detail Pages (/tool/:slug) ────────────────────────────
    app.get('/tool/:slug', async (req, res) => {
      try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase();

        // 1. Permanent redirect for legacy slug aliases (e.g. cursor-ai -> cursor)
        if (LEGACY_SLUG_REDIRECTS[normalizedSlug]) {
          const canonicalTarget = LEGACY_SLUG_REDIRECTS[normalizedSlug];
          return res.redirect(301, `/tool/${canonicalTarget}`);
        }

        // 2. Permanent redirect for case sensitivity (e.g. /tool/Cursor -> /tool/cursor)
        if (slug !== normalizedSlug) {
          return res.redirect(301, `/tool/${normalizedSlug}`);
        }

        const tools = await getSsrTools();
        const tool = tools.find(
          (t: any) =>
            t.slug?.toLowerCase() === normalizedSlug ||
            t.id?.toLowerCase() === normalizedSlug
        );

        const htmlTemplate = getIndexHtmlTemplate();
        const baseUrl = resolveBaseUrl(req);

        if (!tool) {
          // Before 404ing, honor a renamed tool's old slug (DB `aliases`) with a 301.
          const aliasTarget = buildAliasRedirectMap(tools)[normalizedSlug];
          if (aliasTarget && aliasTarget !== normalizedSlug) {
            return res.redirect(301, `/tool/${aliasTarget}`);
          }
          // Tool not found — serve 404 with noindex and self-referencing canonical
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Tool Not Found — ToolverAI',
            description: 'The requested AI tool could not be found in the ToolverAI directory.',
            canonical: `${baseUrl}/tool/${normalizedSlug}`,
            robots: 'noindex, nofollow',
          });
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).send(notFoundHtml);
        }

        const cleanName = (tool.name || '').trim();
        const title = toolTitle(cleanName);
        const desc = `${cleanName} (${tool.pricingType || 'Freemium'}): ${(tool.tagline || tool.description || '').slice(0, 130)}. Compare pricing, features, monthly traffic (${tool.monthlyVisitsFormatted || 'N/A'}) and top alternatives on ToolverAI.`.slice(0, 160);
        const canonical = `${baseUrl}/tool/${tool.slug || tool.id}`;
        const ogImage = tool.logoUrl && !tool.logoUrl.includes('unsplash') ? tool.logoUrl : `${baseUrl}/og-banner.png`;

        // JSON-LD for SoftwareApplication
        const hasRealReviews = (tool.reviewCount || 0) >= 1;
        const schemaJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: cleanName,
          description: tool.description || tool.tagline || '',
          applicationCategory: tool.category || 'Utilities',
          operatingSystem: (tool.platforms || ['Web']).join(', '),
          url: tool.url || canonical,
          image: ogImage,
          inLanguage: 'en',
          // AEO: directly answers "is <tool> free?" for AI Overviews / assistants.
          isAccessibleForFree: /free|freemium/i.test(String(tool.pricingType || 'Freemium')),
          ...(Array.isArray(tool.keyFeatures) && tool.keyFeatures.length
            ? { featureList: tool.keyFeatures.slice(0, 12) }
            : {}),
          ...(tool.updatedAt || tool.createdAt
            ? { dateModified: new Date(tool.updatedAt || tool.createdAt).toISOString().split('T')[0] }
            : {}),
          ...(tool.pricingPlans?.[0]?.price ? {
            offers: {
              '@type': 'Offer',
              price: tool.pricingPlans[0].price.replace(/[^0-9.]/g, '') || '0',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
            }
          } : {}),
          ...(hasRealReviews ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(tool.rating || 4.5),
              reviewCount: String(tool.reviewCount || 1),
              bestRating: '5',
              worstRating: '1',
            }
          } : {}),
          publisher: {
            '@type': 'Organization',
            name: 'ToolverAI',
            url: baseUrl,
          },
        };

        const categorySlug = (tool.category || 'tools').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const sameCategoryTools = tools
          .filter((t: any) => (t.slug !== tool.slug && t.id !== tool.id) && t.category?.toLowerCase() === tool.category?.toLowerCase())
          .slice(0, 6);

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'AI Tools', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 3, name: tool.category || 'Tools', item: `${baseUrl}/categories/${categorySlug}` },
            { '@type': 'ListItem', position: 4, name: cleanName, item: canonical },
          ],
        };

        // Load this tool's long-form blog on demand and render it as unique SEO body content
        let blogSectionHtml = '';
        try {
          const blogDb = await getMongoDb();
          const blogDoc = blogDb
            ? await blogDb.collection('tools').findOne({ id: tool.id }, { projection: { blog: 1 } })
            : null;
          const blogMd = (blogDoc && (blogDoc as any).blog) || '';
          if (blogMd && blogMd.split(/\s+/).length > 200) {
            // Strip the blog's leading H1 so the page keeps exactly one <h1>
            const blogBody = blogMd.replace(/^\s*#\s+.+\r?\n/, '');
            blogSectionHtml = `
    <section>
      <h2>In-Depth ${cleanName} Guide</h2>
      ${marked.parse(blogBody)}
    </section>`;
          }
        } catch (blogErr) {
          console.warn('Tool blog render skipped:', (blogErr as any)?.message);
        }

        const toolKey = String(tool.slug || tool.id);
        const hasAltPage = isEligibleAlternative(toolKey);
        // FAQ is built from the RAW (unescaped) records: faqsToHtml escapes for HTML itself and the
        // JSON-LD must carry plain text, so the pre-escaped SSR copies would double-encode.
        const rawTools = await getToolsFromDbOrFallback();
        const rawTool = rawTools.find((t: any) => t.id === tool.id) || tool;
        const toolFaqs = buildToolFaqs(rawTool, rawTools);

        // ── AEO: answer-first "at a glance" block ──────────────────────────
        // A concise, extractable Q&A summary directly under the H1. This is the
        // block AI Overviews / ChatGPT / Perplexity quote when answering
        // "what is <tool>", "is <tool> free", "is <tool> good". All fields are
        // already HTML-sanitized (getSsrTools → sanitizeForHtml).
        const tldrPrice = String(tool.pricingPlans?.[0]?.price || '').replace(/[^0-9.]/g, '');
        const tldrType = String(tool.pricingType || 'Freemium');
        const costAnswer = (/free/i.test(tldrType) && !/freemium/i.test(tldrType))
          ? `${cleanName} is free to use.`
          : (tldrPrice && Number(tldrPrice) > 0
              ? `${cleanName} uses a ${tldrType.toLowerCase()} model, with paid plans starting at $${tldrPrice}/month.`
              : `${cleanName} uses a ${tldrType.toLowerCase()} pricing model.`);
        const tldrDef = String(tool.tagline || tool.description || '').split(/(?<=[.!?])\s/)[0].slice(0, 180);
        const tldrFeature = (Array.isArray(tool.keyFeatures) && tool.keyFeatures[0]) ? String(tool.keyFeatures[0]) : '';
        const tldrVisits = (tool.monthlyVisitsFormatted && tool.monthlyVisitsFormatted !== 'N/A')
          ? ` and draws an estimated ${tool.monthlyVisitsFormatted} monthly visits` : '';
        const popAnswer = `It holds a ${tool.rating || 4.5}/5 community rating${tool.reviewCount ? ` from ${tool.reviewCount} reviews` : ''}${tldrVisits}.`;
        const tldrHtml = `
    <section class="tldr" id="summary">
      <h2>${cleanName} at a Glance</h2>
      <p><strong>What is ${cleanName}?</strong> ${cleanName} is an AI tool in the ${tool.category || 'AI'} category.${tldrDef ? ` ${tldrDef}` : ''}</p>
      <p><strong>How much does ${cleanName} cost?</strong> ${costAnswer}</p>
      ${tldrFeature ? `<p><strong>What is ${cleanName} best for?</strong> ${tldrFeature}.</p>` : ''}
      <p><strong>Is ${cleanName} any good?</strong> ${popAnswer}</p>
    </section>`;

        const toolBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/">AI Tools</a></li>
      <li><a href="/categories/${categorySlug}">${tool.category || 'Tools'}</a></li>
      <li aria-current="page">${cleanName}</li>
    </ol>
  </nav>
</header>
<main>
  <article>
    <h1>${cleanName} Review 2026: Features, Pricing &amp; Alternatives</h1>
    <p>${tool.tagline || tool.description || ''}</p>
    ${tldrHtml}
    <section>
      <h2>Overview &amp; Key Specifications</h2>
      <ul>
        <li><strong>Category:</strong> <a href="/categories/${categorySlug}">${tool.category}</a></li>
        <li><strong>Pricing Model:</strong> ${tool.pricingType || 'Freemium'}</li>
        <li><strong>Estimated Monthly Web Visits:</strong> ${tool.monthlyVisitsFormatted || 'N/A'}</li>
        <li><strong>Community Rating:</strong> ${tool.rating || 4.5} / 5 (${tool.reviewCount || 1} reviews)</li>
        <li><strong>Official Website:</strong> <a href="${tool.url}" rel="nofollow noopener noreferrer" target="_blank">${cleanName}</a></li>
      </ul>
    </section>
    ${tool.keyFeatures?.length ? `
    <section>
      <h2>Key Features</h2>
      <ul>
        ${tool.keyFeatures.map((f: string) => `<li>${f}</li>`).join('\n        ')}
      </ul>
    </section>` : ''}
    ${blogSectionHtml}
    <section>
      <h2>Top Alternatives to ${cleanName}</h2>
      <p>Explore the best alternative AI software in ${tool.category}:</p>
      ${hasAltPage ? `<p><a href="/alternatives/${toolKey}"><strong>Explore Dedicated ${cleanName} Alternatives Guide &rarr;</strong></a></p>` : ''}
      <ul>
        ${sameCategoryTools.map((alt: any) => {
          // Only link comparison pages that exist — every other pair 404s with noindex.
          const altKey = alt.slug || alt.id;
          const cmp = isEligibleComparison(toolKey, altKey)
            ? ` [<a href="/compare/${normalizeComparisonSlugs(toolKey, altKey).canonicalSlug}">Compare ${cleanName} vs ${alt.name}</a>]`
            : '';
          return `<li><a href="/tool/${altKey}"><strong>${alt.name}</strong></a> — ${alt.tagline || alt.description?.slice(0, 70)} (${alt.pricingType})${cmp}</li>`;
        }).join('\n        ')}
      </ul>
    </section>
    ${faqsToHtml(toolFaqs, `${cleanName} FAQ`)}
    <section>
      <h2>Related AI Software Comparisons</h2>
      <p>Compare ${cleanName} with industry alternatives or check current promotional pricing:</p>
      <p>
        ${hasAltPage ? `<a href="/alternatives/${toolKey}">Top ${cleanName} Alternatives</a> |` : ''}
        <a href="/compare">Compare ${cleanName} Side-by-Side</a> |
        <a href="/deals">Browse Curated AI Discounts &amp; Deals</a> |
        <a href="/categories/${categorySlug}">All ${tool.category} Tools</a>
      </p>
    </section>
  </article>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          robots: 'index, follow, max-image-preview:large, max-snippet:-1',
          ogType: 'product',
          ogImage,
          jsonLd: [schemaJsonLd, breadcrumbJsonLd, ...(toolFaqs.length ? [faqPageJsonLd(toolFaqs, canonical)] : [])],
          bodyHtml: toolBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /tool/:slug:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Category Pages (/categories/:category) ─────────────────────
    app.get('/categories/:category', async (req, res) => {
      try {
        const { category } = req.params;
        const normalizedCategory = category.toLowerCase();

        if (category !== normalizedCategory) {
          return res.redirect(301, `/categories/${normalizedCategory}`);
        }

        const baseUrl = resolveBaseUrl(req);
        const htmlTemplate = getIndexHtmlTemplate();
        const tools = await getSsrTools();

        const matchedMeta = SSR_CATEGORIES.find((c) => c.slug === normalizedCategory);
        const categoryName = matchedMeta
          ? matchedMeta.name
          : decodeURIComponent(category)
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase());

        const categoryTools = tools.filter(
          (t: any) => t.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === normalizedCategory
        );

        const canonical = `${baseUrl}/categories/${normalizedCategory}`;
        const title = categoryTitle(categoryName);
        const desc = `Discover the best ${categoryName} tools in 2026. Compare ${categoryTools.length}+ AI tools ranked by estimated monthly traffic, pricing, and authentic user reviews on ToolverAI.`;

        const relatedCategories = SSR_CATEGORIES.filter((c) => c.slug !== normalizedCategory);

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Categories', item: `${baseUrl}/categories` },
            { '@type': 'ListItem', position: 3, name: categoryName, item: canonical },
          ],
        };

        const collectionJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Best ${categoryName} Tools in 2026`,
          description: desc,
          url: canonical,
          publisher: { '@type': 'Organization', name: 'ToolverAI', url: baseUrl },
        };

        // ── AEO: answer-first Q&A for "best <category> AI tools" ───────────
        const catRanked = [...categoryTools].sort(
          (a: any, b: any) => (Number(b.monthlyVisits) || 0) - (Number(a.monthlyVisits) || 0),
        );
        const catTop = catRanked.slice(0, 5).map((t: any) => t.name);
        const catFree = catRanked
          .filter((t: any) => /free|freemium/i.test(String(t.pricingType || '')))
          .slice(0, 4)
          .map((t: any) => t.name);
        const catTopVisits = catRanked[0]?.monthlyVisitsFormatted;
        const categoryTldrHtml = catRanked.length ? `
    <section class="tldr" id="summary">
      <h2>${categoryName} AI Tools — Quick Answers</h2>
      <p><strong>What are the best ${categoryName} AI tools in 2026?</strong> ${catTop.join(', ')}${catTop.length ? '.' : ''} ToolverAI ranks them by estimated monthly traffic, pricing, and user ratings.</p>
      <p><strong>How many ${categoryName} AI tools are listed?</strong> ${categoryTools.length} ${categoryName} tools are tracked and compared on ToolverAI.</p>
      ${catRanked[0] ? `<p><strong>Which ${categoryName} AI tool is most popular?</strong> ${catRanked[0].name}${catTopVisits && catTopVisits !== 'N/A' ? `, with an estimated ${catTopVisits} monthly visits` : ''}.</p>` : ''}
      ${catFree.length ? `<p><strong>Are there free ${categoryName} AI tools?</strong> Yes — ${catFree.join(', ')} offer free or freemium plans.</p>` : ''}
    </section>` : '';

        const categoryBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/categories">Categories</a></li>
      <li aria-current="page">${categoryName}</li>
    </ol>
  </nav>
</header>
<main>
  <section>
    <h1>Best ${categoryName} Tools in 2026</h1>
    <p>Discover top ${categoryTools.length} ${categoryName} tools in 2026. Compare software features, pricing tiers, and estimated monthly traffic analytics to find the ideal AI solution for your workflow.</p>
  </section>
  ${categoryTldrHtml}
  <section>
    <h2>Top Ranked ${categoryName} Tools</h2>
    <ul>
      ${categoryTools.map((t: any) => `<li><a href="/tool/${t.slug || t.id}"><strong>${t.name}</strong></a> — ${t.tagline || t.description?.slice(0, 90)} [Traffic: ${t.monthlyVisitsFormatted || 'N/A'}/mo | Pricing: ${t.pricingType || 'Freemium'} | Rating: ${t.rating || 4.5}★]</li>`).join('\n      ')}
    </ul>
  </section>
  <section>
    <h2>Explore Related AI Categories</h2>
    <p>Browse other popular software categories on ToolverAI:</p>
    <ul>
      ${relatedCategories.map((rc) => `<li><a href="/categories/${rc.slug}"><strong>${rc.name} Tools</strong></a>: ${rc.desc}</li>`).join('\n      ')}
    </ul>
  </section>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          jsonLd: [breadcrumbJsonLd, collectionJsonLd],
          bodyHtml: categoryBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /categories/:category:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── Static Trust & Legal Pages ─────────────────────────────────────
    const staticPageMap: Record<string, string> = {
      '/about': 'about.html',
      '/privacy-policy': 'privacy-policy.html',
      '/terms': 'terms.html',
      '/affiliate-disclosure': 'affiliate-disclosure.html',
      '/editorial-policy': 'editorial-policy.html',
      '/how-we-rank-tools': 'how-we-rank-tools.html',
    };

    Object.entries(staticPageMap).forEach(([routePath, fileName]) => {
      app.get(routePath, (req, res) => {
        // The Docker image only ships dist/ (Vite copies public/* into it). Looking only in public/
        // made these pages fall back to the SPA shell in production: generic title, no canonical.
        const filePath = [path.join(distPath, fileName), path.join(process.cwd(), 'public', fileName)].find((f) =>
          fs.existsSync(f)
        );
        if (filePath) {
          res.header('Content-Type', 'text/html; charset=utf-8');
          res.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
          return res.status(200).sendFile(filePath);
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    });

    // ── SSR: Submit Tool (/submit-tool) ─────────────────────────────────
    app.get('/submit-tool', (req, res) => {
      try {
        const htmlTemplate = getIndexHtmlTemplate();
        const baseUrl = resolveBaseUrl(req);
        const title = HUB_TITLES.submit;
        const desc = 'Submit your AI tool to the ToolverAI directory. Get reviewed and listed alongside 120+ AI tools ranked by estimated monthly traffic.';
        const canonical = `${baseUrl}/submit-tool`;

        const submitBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li aria-current="page">Submit Tool</li>
    </ol>
  </nav>
</header>
<main>
  <h1>Submit an AI Tool — Get Listed on ToolverAI</h1>
  <p>${desc}</p>
  <p><a href="/">Return to Directory</a> | <a href="/categories">Browse Categories</a></p>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          bodyHtml: submitBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Major Section Hub Pages ────────────────────────────────────
    const majorPageSeo: Record<string, { title: string; desc: string; h1: string; type?: 'website' | 'article' }> = {
      '/rankings': {
        title: HUB_TITLES.rankings,
        desc: 'Explore estimated monthly traffic statistics, growth velocity, and user volume leaderboards across Coding, LLMs, Image, and Audio AI platforms. Updated weekly on ToolverAI.',
        h1: 'Top AI Tools by Monthly Traffic — Verified Rankings 2026',
      },
      '/compare': {
        title: HUB_TITLES.compare,
        desc: 'Free AI comparison tool: compare AI tools side by side on pricing, features, monthly traffic, platforms and ratings. 180+ AI tools, no sign-up.',
        h1: 'AI Comparison Tool: Compare AI Tools Side-by-Side',
      },
      '/deals': {
        title: HUB_TITLES.deals,
        desc: 'The best AI deals in one place: verified AI tool discounts, promo codes and extended free trials for ChatGPT, Claude, Cursor, ElevenLabs and more.',
        h1: 'AI Deals: Verified AI Tool Discounts & Promo Codes',
      },
      '/prompts': {
        title: HUB_TITLES.prompts,
        desc: 'Master ChatGPT, Claude, Midjourney, and Cursor AI with battle-tested prompts for coding, SEO, marketing, and workflow automation. Free prompt engineering library.',
        h1: 'AI Prompt Engineering Library',
      },
      '/categories': {
        title: HUB_TITLES.categories,
        desc: 'Browse 120+ AI tools organized across 8 core categories. Find top Coding AI, Writing AI, Image Generation, Video AI, and Marketing AI tools ranked on ToolverAI.',
        h1: 'Browse AI Tools by Category',
      },
      '/blog': {
        title: HUB_TITLES.blog,
        desc: 'Read in-depth AI tool comparisons, buyer guides, and architectural decision frameworks from the ToolverAI Editorial Team. Grounded in real data.',
        h1: 'ToolverAI Editorial Guides & Insights',
        type: 'website',
      },
    };

    Object.entries(majorPageSeo).forEach(([routePath, seo]) => {
      app.get(routePath, async (req, res) => {
        try {
          const htmlTemplate = getIndexHtmlTemplate();
          const baseUrl = resolveBaseUrl(req);
          const canonical = `${baseUrl}${routePath}`;
          const tools = await getSsrTools();

          const breadcrumbJsonLd = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
              { '@type': 'ListItem', position: 2, name: seo.h1, item: canonical },
            ],
          };

          let extraContent = '';
          const hubContent: HubSeoContent | null =
            routePath === '/compare' ? COMPARE_HUB_CONTENT : routePath === '/deals' ? DEALS_HUB_CONTENT : null;
          const hubJsonLd: Record<string, any>[] = [breadcrumbJsonLd];
          if (hubContent) hubJsonLd.push(faqPageJsonLd(hubContent.faqs, canonical));
          if (routePath === '/categories') {
            extraContent = `
    <section>
      <h2>All AI Tool Categories</h2>
      <ul>
        ${SSR_CATEGORIES.map((c) => `<li><a href="/categories/${c.slug}"><strong>${c.name}</strong></a>: ${c.desc}</li>`).join('\n        ')}
      </ul>
    </section>`;
          } else if (routePath === '/rankings') {
            extraContent = `
    <section>
      <h2>Traffic Leaderboard</h2>
      <ul>
        ${tools.slice(0, 15).map((t: any) => `<li><a href="/tool/${t.slug || t.id}"><strong>${t.name}</strong></a> — ${t.monthlyVisitsFormatted || 'N/A'} monthly visits (${t.category})</li>`).join('\n        ')}
      </ul>
    </section>`;
          } else if (routePath === '/deals') {
            const dealTools = tools.filter((t: any) => t.deal);
            extraContent = `
    <section>
      <h2>Verified Deals &amp; Discounts</h2>
      <ul>
        ${dealTools.map((t: any) => `<li><a href="/tool/${t.slug || t.id}"><strong>${t.name}</strong></a>: ${t.deal?.discount} — ${t.deal?.description}</li>`).join('\n        ')}
      </ul>
    </section>`;
          } else if (routePath === '/compare') {
            hubJsonLd.push({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Popular AI tool comparisons',
              itemListElement: getLiveComparisons(tools).map((c, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${baseUrl}/compare/${c.canonicalSlug}`,
              })),
            });
            extraContent = `
    <section>
      <h2>Featured AI Comparisons</h2>
      <p>Compare top artificial intelligence software side-by-side with estimated traffic rankings, platform compatibility, and features:</p>
      <ul>
        ${getLiveComparisons(tools).map((c) => {
          const t1 = tools.find((t: any) => t.slug === c.slug1);
          const t2 = tools.find((t: any) => t.slug === c.slug2);
          const n1 = t1?.name || c.slug1;
          const n2 = t2?.name || c.slug2;
          return `<li><a href="/compare/${c.canonicalSlug}"><strong>${n1} vs ${n2}</strong></a> (${c.category}) — ${c.focusArea}</li>`;
        }).join('\n        ')}
      </ul>
    </section>
    <section>
      <h2>Curated Tool Alternatives</h2>
      <p>Explore dedicated alternatives guides for high-volume tools:</p>
      <ul>
        ${getLiveAlternatives(tools).map((a) => {
          const t = tools.find((tl: any) => tl.slug === a.toolSlug);
          const name = t?.name || a.toolSlug;
          return `<li><a href="/alternatives/${a.toolSlug}"><strong>Best ${name} Alternatives</strong></a> (${a.category}) — ${a.reason}</li>`;
        }).join('\n        ')}
      </ul>
    </section>`;
          } else if (routePath === '/blog') {
            const articles = getPublishedArticles();
            extraContent = `
    <section>
      <h2>Editorial Guides &amp; Decision Frameworks</h2>
      <p>In-depth evaluations and architectural comparisons written by the ToolverAI Editorial Team:</p>
      <ul>
        ${articles.map((a) => `<li><a href="/blog/${a.slug}"><strong>${a.title}</strong></a> (${a.topic}) — ${a.excerpt} [Updated: ${a.updatedAt || a.publishedAt}]</li>`).join('\n        ')}
      </ul>
    </section>`;
            const guides = await getToolGuides().catch(() => []);
            if (guides.length) {
              // Link straight to the canonical tool pages (where the review text lives).
              extraContent += `
    <section>
      <h2>AI Tool Reviews (${guides.length})</h2>
      <p>Hands-on reviews of every tool in the ToolverAI directory — features, pricing, pros &amp; cons and alternatives:</p>
      <ul>
        ${guides.map((g) => `<li><a href="/tool/${g.toolSlug}"><strong>${escHtml(g.title)}</strong></a> (${escHtml(g.category)}) — ${escHtml(g.excerpt)}</li>`).join('\n        ')}
      </ul>
    </section>`;
            }
          }

          const hubBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li aria-current="page">${seo.h1}</li>
    </ol>
  </nav>
</header>
<main>
  <h1>${seo.h1}</h1>
  <p>${hubContent ? seoInlineToHtml(hubContent.answer) : seo.desc}</p>
  ${extraContent}
  ${hubContent ? hubContentToHtml(hubContent) : ''}
  <nav aria-label="Quick Navigation">
    <p><a href="/">Home</a> | <a href="/categories">All Categories</a> | <a href="/rankings">Rankings</a> | <a href="/deals">Deals</a></p>
  </nav>
</main>`;

          const finalHtml = renderSsrPage(htmlTemplate, {
            title: seo.title,
            description: seo.desc,
            canonical,
            ogType: seo.type || 'website',
            ogImage: `${baseUrl}/og-banner.png`,
            jsonLd: hubJsonLd,
            bodyHtml: hubBodyHtml,
          });

          res.header('Content-Type', 'text/html; charset=utf-8');
          // Rankings/deals/compare pages contain live traffic data — keep browser cache short
          res.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
          return res.status(200).send(finalHtml);
        } catch (err: any) {
          console.error(`SSR error for ${routePath}:`, err);
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
    });

    // ── SSR: Curated Alternatives Hub (/alternatives) ──────────────────
    app.get('/alternatives', async (req, res) => {
      try {
        const htmlTemplate = getIndexHtmlTemplate();
        const baseUrl = resolveBaseUrl(req);
        const tools = await getSsrTools();
        const canonical = `${baseUrl}/alternatives`;
        const title = HUB_TITLES.alternatives;
        const desc = 'Discover the best alternatives to leading AI tools including ChatGPT, Cursor, Copilot, Claude, Midjourney, and more. Compare features, pricing, and traffic on ToolverAI.';

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'AI Tool Alternatives', item: canonical },
          ],
        };

        const hubBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li aria-current="page">AI Tool Alternatives</li>
    </ol>
  </nav>
</header>
<main>
  <h1>Best AI Tool Alternatives</h1>
  <p>${desc}</p>
  <section>
    <h2>Curated Alternatives Guides</h2>
    <ul>
      ${getLiveAlternatives(tools).map((a) => {
        const t = tools.find((tl: any) => tl.slug === a.toolSlug);
        const name = t?.name || a.toolSlug;
        return `<li><a href="/alternatives/${a.toolSlug}"><strong>Best ${name} Alternatives</strong></a> (${a.category}) — ${a.reason}</li>`;
      }).join('\n      ')}
    </ul>
  </section>
  <nav aria-label="Quick Navigation">
    <p><a href="/">Home</a> | <a href="/compare">Compare Tools Side-by-Side</a> | <a href="/categories">All Categories</a> | <a href="/rankings">Rankings</a></p>
  </nav>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          jsonLd: [breadcrumbJsonLd],
          bodyHtml: hubBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /alternatives:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Comparison Pages (/compare/:comparison) ───────────────────
    app.get('/compare/:comparison', async (req, res) => {
      try {
        const { comparison } = req.params;
        const parsed = parseComparisonPath(comparison);

        const baseUrl = resolveBaseUrl(req);
        const htmlTemplate = getIndexHtmlTemplate();

        // 1. If format is invalid (not two slugs separated by -vs-) -> 404
        if (!parsed) {
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Comparison Not Found — ToolverAI',
            description: 'The requested AI tool comparison could not be found.',
            canonical: `${baseUrl}/compare/${comparison.toLowerCase()}`,
            robots: 'noindex, nofollow',
          });
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).send(notFoundHtml);
        }

        const { slug1, slug2, canonicalSlug, isCanonicalOrder } = parsed;

        // 2. Quality Gate: strictly index only eligible comparisons to prevent thin mass-generation
        const isEligible = isEligibleComparison(slug1, slug2);
        const tools = await getSsrTools();
        const tool1 = tools.find((t: any) => t.slug?.toLowerCase() === slug1 || t.id?.toLowerCase() === slug1);
        const tool2 = tools.find((t: any) => t.slug?.toLowerCase() === slug2 || t.id?.toLowerCase() === slug2);

        if (!isEligible || !tool1 || !tool2) {
          // Ineligible or missing tools -> 404 with noindex and self-canonical
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Comparison Not Found — ToolverAI',
            description: 'This comparison is currently unavailable or does not contain sufficient verified data.',
            canonical: `${baseUrl}/compare/${comparison.toLowerCase()}`,
            robots: 'noindex, nofollow',
          });
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).send(notFoundHtml);
        }

        // 3. For eligible pairs, enforce canonical alphabetical order:
        // 301 Permanent Redirect for reversed order (e.g. /compare/github-copilot-vs-cursor -> /compare/cursor-vs-github-copilot)
        // or casing mismatch
        if (!isCanonicalOrder || comparison !== canonicalSlug) {
          return res.redirect(301, `/compare/${canonicalSlug}`);
        }

        const name1 = tool1.name.trim();
        const name2 = tool2.name.trim();
        const category = tool1.category || tool2.category || 'AI Tools';
        const canonical = `${baseUrl}/compare/${canonicalSlug}`;

        const title = compareTitle(name1, name2);
        // Link a tool's alternatives page only if it exists (e.g. /alternatives/devin 404'd); otherwise its category.
        const altCell = (t: any, n: string) => {
          const key = String(t.slug || t.id);
          if (isEligibleAlternative(key)) return `<a href="/alternatives/${key}">Best ${n} Alternatives</a>`;
          const cat = String(t.category || 'tools').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return `<a href="/categories/${cat}">More ${t.category || 'AI'} tools</a>`;
        };
        const desc = `Detailed side-by-side comparison of ${name1} vs ${name2}. Compare monthly traffic (${tool1.monthlyVisitsFormatted || 'N/A'} vs ${tool2.monthlyVisitsFormatted || 'N/A'}), pricing tiers, features, and key differences.`.slice(0, 160);

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Compare', item: `${baseUrl}/compare` },
            { '@type': 'ListItem', position: 3, name: `${name1} vs ${name2}`, item: canonical },
          ],
        };

        const relatedComps = getRelatedComparisonsForPair(slug1, slug2, 4, tools);

        // ── AEO: answer-first "X vs Y" verdict block ───────────────────────
        // Neutral, fact-based answers to the exact questions AI engines field
        // for a comparison query. All fields are HTML-sanitized (getSsrTools).
        const cv1 = Number(tool1.monthlyVisits) || 0;
        const cv2 = Number(tool2.monthlyVisits) || 0;
        const popAns = (cv1 && cv2 && cv1 !== cv2)
          ? `${cv1 > cv2 ? name1 : name2} gets more traffic — about ${(cv1 > cv2 ? tool1 : tool2).monthlyVisitsFormatted} vs ${(cv1 > cv2 ? tool2 : tool1).monthlyVisitsFormatted} monthly visits.`
          : `Both ${name1} and ${name2} are widely used; see the traffic row below.`;
        const cr1 = Number(tool1.rating) || 4.5;
        const cr2 = Number(tool2.rating) || 4.5;
        const ratingAns = cr1 === cr2
          ? `Both hold a ${cr1}/5 user rating.`
          : `${cr1 > cr2 ? name1 : name2} has the higher user rating (${Math.max(cr1, cr2)}/5 vs ${Math.min(cr1, cr2)}/5).`;
        const cp1 = String(tool1.pricingType || 'Freemium');
        const cp2 = String(tool2.pricingType || 'Freemium');
        const priceAns = cp1.toLowerCase() === cp2.toLowerCase()
          ? `Both use a ${cp1.toLowerCase()} pricing model.`
          : `${name1} is ${cp1.toLowerCase()}, while ${name2} is ${cp2.toLowerCase()}.`;
        const d1 = String(tool1.tagline || tool1.description || '').split(/(?<=[.!?])\s/)[0].slice(0, 130);
        const d2 = String(tool2.tagline || tool2.description || '').split(/(?<=[.!?])\s/)[0].slice(0, 130);
        const compareTldrHtml = `
    <section class="tldr" id="summary">
      <h2>${name1} vs ${name2} — Quick Answers</h2>
      <p><strong>What's the difference between ${name1} and ${name2}?</strong> Both are ${category} AI tools.${d1 ? ` ${name1}: ${d1}` : ''}${d2 ? ` ${name2}: ${d2}` : ''}</p>
      <p><strong>Which is more popular, ${name1} or ${name2}?</strong> ${popAns}</p>
      <p><strong>How do they compare on price?</strong> ${priceAns}</p>
      <p><strong>Which has the better rating?</strong> ${ratingAns} The best choice depends on your specific use case — compare the full specs below.</p>
    </section>`;

        const compareBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/compare">Compare</a></li>
      <li aria-current="page">${name1} vs ${name2}</li>
    </ol>
  </nav>
</header>
<main>
  <article>
    <h1>${name1} vs ${name2} (2026): Features, Pricing &amp; Comparison</h1>
    <p>Comprehensive side-by-side evaluation of ${name1} and ${name2} across pricing, estimated web traffic volume, supported platforms, core features, and architectural strengths.</p>
    ${compareTldrHtml}

    <section>
      <h2>Quick Specification Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Specification</th>
            <th>${name1}</th>
            <th>${name2}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Category</td>
            <td>${tool1.category}</td>
            <td>${tool2.category}</td>
          </tr>
          <tr>
            <td>Pricing Model</td>
            <td>${tool1.pricingType || 'Freemium'}</td>
            <td>${tool2.pricingType || 'Freemium'}</td>
          </tr>
          <tr>
            <td>Monthly Traffic</td>
            <td>${tool1.monthlyVisitsFormatted || 'N/A'}</td>
            <td>${tool2.monthlyVisitsFormatted || 'N/A'}</td>
          </tr>
          <tr>
            <td>User Rating</td>
            <td>${tool1.rating || 4.5} / 5 (${tool1.reviewCount || 1} reviews)</td>
            <td>${tool2.rating || 4.5} / 5 (${tool2.reviewCount || 1} reviews)</td>
          </tr>
          <tr>
            <td>Supported Platforms</td>
            <td>${(tool1.platforms || ['Web']).join(', ')}</td>
            <td>${(tool2.platforms || ['Web']).join(', ')}</td>
          </tr>
          <tr>
            <td>In-Depth Review</td>
            <td><a href="/tool/${tool1.slug || tool1.id}">Read ${name1} Review</a></td>
            <td><a href="/tool/${tool2.slug || tool2.id}">Read ${name2} Review</a></td>
          </tr>
          <tr>
            <td>Alternatives</td>
            <td>${altCell(tool1, name1)}</td>
            <td>${altCell(tool2, name2)}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>About ${name1}</h2>
      <p>${tool1.tagline || ''}</p>
      <p>${tool1.description || ''}</p>
      ${tool1.keyFeatures?.length ? `
      <ul>
        ${tool1.keyFeatures.map((f: string) => `<li>${f}</li>`).join('\n        ')}
      </ul>` : ''}
    </section>

    <section>
      <h2>About ${name2}</h2>
      <p>${tool2.tagline || ''}</p>
      <p>${tool2.description || ''}</p>
      ${tool2.keyFeatures?.length ? `
      <ul>
        ${tool2.keyFeatures.map((f: string) => `<li>${f}</li>`).join('\n        ')}
      </ul>` : ''}
    </section>

    <section>
      <h2>Related AI Comparisons</h2>
      <ul>
        ${relatedComps.map((rc) => {
          const r1 = tools.find((t: any) => t.slug === rc.slug1);
          const r2 = tools.find((t: any) => t.slug === rc.slug2);
          const rn1 = r1?.name || rc.slug1;
          const rn2 = r2?.name || rc.slug2;
          return `<li><a href="/compare/${rc.canonicalSlug}"><strong>${rn1} vs ${rn2}</strong></a> (${rc.category}) — ${rc.focusArea}</li>`;
        }).join('\n        ')}
      </ul>
      <p><a href="/compare">View all side-by-side AI tool comparisons</a> | <a href="/categories">Browse categories</a></p>
    </section>
  </article>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          robots: 'index, follow, max-image-preview:large, max-snippet:-1',
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          jsonLd: [breadcrumbJsonLd],
          bodyHtml: compareBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /compare/:comparison:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Alternatives Pages (/alternatives/:slug) ──────────────────
    app.get('/alternatives/:slug', async (req, res) => {
      try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase();

        // 1. Permanent redirect for case sensitivity (e.g. /alternatives/Cursor -> /alternatives/cursor)
        if (slug !== normalizedSlug) {
          return res.redirect(301, `/alternatives/${normalizedSlug}`);
        }

        // 2. Redirect legacy aliases if applicable
        if (LEGACY_SLUG_REDIRECTS[normalizedSlug]) {
          return res.redirect(301, `/alternatives/${LEGACY_SLUG_REDIRECTS[normalizedSlug]}`);
        }

        const baseUrl = resolveBaseUrl(req);
        const htmlTemplate = getIndexHtmlTemplate();

        // Quality gate: is this tool eligible?
        const isEligible = isEligibleAlternative(normalizedSlug);
        const tools = await getSsrTools();
        const sourceTool = tools.find((t: any) => t.slug?.toLowerCase() === normalizedSlug || t.id?.toLowerCase() === normalizedSlug);

        if (!isEligible || !sourceTool) {
          // Honor a renamed tool's old slug (DB `aliases`) when the new one has a curated page.
          const aliasTarget = buildAliasRedirectMap(tools)[normalizedSlug];
          if (aliasTarget && aliasTarget !== normalizedSlug && isEligibleAlternative(aliasTarget)) {
            return res.redirect(301, `/alternatives/${aliasTarget}`);
          }
          // Ineligible or missing tool -> 404 with noindex and self-canonical
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Alternatives Not Found — ToolverAI',
            description: 'Alternatives for the requested AI tool could not be found or have not been curated yet.',
            canonical: `${baseUrl}/alternatives/${normalizedSlug}`,
            robots: 'noindex, nofollow',
          });
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).send(notFoundHtml);
        }

        const cleanName = sourceTool.name.trim();
        const category = sourceTool.category || 'AI Tools';
        const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const canonical = `${baseUrl}/alternatives/${sourceTool.slug || sourceTool.id}`;

        const alternatives = getToolAlternatives(sourceTool, tools, 6);
        const altCount = alternatives.length;

        const title = alternativesTitle(cleanName);
        const desc = `Looking for the best alternatives to ${cleanName}? Compare top ${altCount} ${category} tools ranked by real traffic, pricing models, features, and user ratings.`.slice(0, 160);

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'AI Tools', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 3, name: category, item: `${baseUrl}/categories/${categorySlug}` },
            { '@type': 'ListItem', position: 4, name: `${cleanName} Alternatives`, item: canonical },
          ],
        };

        const collectionJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Best ${cleanName} Alternatives in 2026`,
          description: desc,
          url: canonical,
          publisher: { '@type': 'Organization', name: 'ToolverAI', url: baseUrl },
        };

        const altMeta = ELIGIBLE_ALTERNATIVES.find((a) => a.toolSlug === normalizedSlug);
        const altReason = altMeta?.reason || `Users seeking alternative pricing models, open-weights deployment, or specialized workflows in ${category}.`;

        const altBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/">AI Tools</a></li>
      <li><a href="/categories/${categorySlug}">${category}</a></li>
      <li aria-current="page">${cleanName} Alternatives</li>
    </ol>
  </nav>
</header>
<main>
  <article>
    <h1>Best ${cleanName} Alternatives in 2026</h1>
    <p>Discover top competitors and alternatives to ${cleanName} in 2026. Compare feature capabilities, subscription pricing, and estimated monthly traffic to find the ideal match for your stack.</p>

    <section>
      <h2>Why Consider Alternatives to ${cleanName}?</h2>
      <p>${altReason}</p>
      <p>Source Benchmark: <a href="/tool/${sourceTool.slug || sourceTool.id}"><strong>${cleanName}</strong></a> — ${sourceTool.pricingType || 'Freemium'} | ${sourceTool.monthlyVisitsFormatted || 'N/A'} visits/mo | ${sourceTool.rating || 4.5}★ (${sourceTool.reviewCount || 1} reviews).</p>
    </section>

    <section>
      <h2>Top Ranked ${cleanName} Alternatives</h2>
      <ul>
        ${alternatives.map((alt: any) => {
          const srcKey = String(sourceTool.slug || sourceTool.id);
          const altKey = String(alt.slug || alt.id);
          // Only curated pairs have a /compare page; every other pair 404s (45 crawl errors on 2026-11-08).
          const cmp = isEligibleComparison(srcKey, altKey)
            ? `\n            [<a href="/compare/${normalizeComparisonSlugs(srcKey, altKey).canonicalSlug}">Compare ${cleanName} vs ${alt.name}</a>]`
            : '';
          return `<li>
            <a href="/tool/${altKey}"><strong>${alt.name}</strong></a> (${alt.pricingType || 'Freemium'} | ${alt.monthlyVisitsFormatted || 'N/A'} visits/mo | ${alt.rating || 4.5}★) — ${alt.tagline || alt.description?.slice(0, 80)}${cmp}
          </li>`;
        }).join('\n        ')}
      </ul>
    </section>

    <section>
      <h2>Related Categories &amp; Comparisons</h2>
      <p>
        <a href="/categories/${categorySlug}">All ${category} Tools</a> |
        <a href="/compare">Compare Tools Side-by-Side</a> |
        <a href="/deals">Verified Deals</a> |
        <a href="/">Home Directory</a>
      </p>
    </section>
  </article>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          robots: 'index, follow, max-image-preview:large, max-snippet:-1',
          ogType: 'website',
          ogImage: `${baseUrl}/og-banner.png`,
          jsonLd: [breadcrumbJsonLd, collectionJsonLd],
          bodyHtml: altBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /alternatives/:slug:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Blog Article Pages (/blog/:slug) ──────────────────────────
    app.get('/blog/:slug', async (req, res) => {
      try {
        const { slug } = req.params;
        const normalizedSlug = slug.toLowerCase();

        // 1. Permanent redirect for case sensitivity (e.g. /blog/How-To -> /blog/how-to)
        if (slug !== normalizedSlug) {
          return res.redirect(301, `/blog/${normalizedSlug}`);
        }

        const baseUrl = resolveBaseUrl(req);
        const htmlTemplate = getIndexHtmlTemplate();

        // Look up article
        const article = getArticleBySlug(normalizedSlug);

        // Tool review built from the tool's stored blog (/blog/<tool>-review)
        if (!article) {
          const guide = await getToolGuide(normalizedSlug);
          if (guide) {
            const toolUrl = `${baseUrl}/tool/${guide.toolSlug}`;
            const pageUrl = `${baseUrl}/blog/${guide.slug}`;
            const gTitle = escHtml(guide.title);
            const gName = escHtml(guide.toolName || '');
            const gCategory = escHtml(guide.category || '');
            const categorySlug = guide.relatedCategorySlugs?.[0] || '';
            const guideBreadcrumb = {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
                { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
                { '@type': 'ListItem', position: 3, name: guide.title, item: pageUrl },
              ],
            };
            const guideArticleLd = {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: guide.title,
              description: guide.excerpt,
              image: guide.logoUrl || `${baseUrl}/og-banner.png`,
              datePublished: guide.publishedAt,
              dateModified: guide.updatedAt || guide.publishedAt,
              author: { '@type': 'Organization', name: 'ToolverAI Editorial Team', url: `${baseUrl}/about` },
              publisher: { '@type': 'Organization', name: 'ToolverAI', url: baseUrl },
              mainEntityOfPage: { '@type': 'WebPage', '@id': toolUrl },
              about: { '@type': 'SoftwareApplication', name: guide.toolName, url: toolUrl },
            };
            const guideBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/blog">Blog</a></li>
      <li aria-current="page">${gTitle}</li>
    </ol>
  </nav>
</header>
<main>
  <article>
    <header>
      <span class="badge">AI Tool Review · ${gCategory}</span>
      <h1>${gTitle}</h1>
      <p class="byline">By <strong>ToolverAI Editorial Team</strong>${guide.publishedAt ? ` | Published: ${guide.publishedAt}` : ''} | ${guide.readTime}</p>
    </header>
    <div class="article-content">${marked.parse(guide.content)}</div>
    <section>
      <h2>${gName} on ToolverAI</h2>
      <p><a href="/tool/${guide.toolSlug}"><strong>See ${gName} pricing, features, traffic and alternatives &rarr;</strong></a></p>
      ${categorySlug ? `<p><a href="/categories/${categorySlug}">Browse all ${gCategory} tools</a></p>` : ''}
    </section>
    <nav aria-label="Editorial Links">
      <p><a href="/blog">All Editorial Guides &amp; Reviews</a> | <a href="/editorial-policy">Editorial Policy</a> | <a href="/">Home Directory</a></p>
    </nav>
  </article>
</main>`;
            const guideHtml = renderSsrPage(htmlTemplate, {
              title: articleTitle(guide.title),
              description: (guide.excerpt || `${guide.toolName} review`).slice(0, 160),
              // Same text lives on the tool page: consolidate ranking there.
              canonical: toolUrl,
              robots: 'index, follow, max-image-preview:large, max-snippet:-1',
              ogType: 'article',
              ogImage: guide.logoUrl || `${baseUrl}/og-banner.png`,
              jsonLd: [guideBreadcrumb, guideArticleLd],
              bodyHtml: guideBodyHtml,
            });
            res.header('Content-Type', 'text/html; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=300, s-maxage=3600');
            return res.status(200).send(guideHtml);
          }
        }

        // Quality gate: 404 for nonexistent or draft articles
        if (!article || article.status !== 'published') {
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Article Not Found — ToolverAI',
            description: 'The requested AI editorial guide could not be found.',
            canonical: `${baseUrl}/blog/${normalizedSlug}`,
            robots: 'noindex, nofollow',
          });
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).send(notFoundHtml);
        }

        const canonical = `${baseUrl}/blog/${article.slug}`;
        const title = articleTitle(article.seoTitle || article.title);
        const desc = (article.metaDescription || article.excerpt).slice(0, 160);
        const heroImage = article.heroImage || article.coverImage || `${baseUrl}/og-banner.png`;
        const tools = await getSsrTools();

        const breadcrumbJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
            { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
          ],
        };

        const blogPostingJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `${canonical}#article`,
          headline: article.title,
          description: desc,
          image: heroImage,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt || article.publishedAt,
          author: {
            '@type': 'Organization',
            name: article.author?.name || 'ToolverAI Editorial Team',
            url: `${baseUrl}/about`,
          },
          publisher: {
            '@type': 'Organization',
            name: 'ToolverAI',
            url: baseUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/og-banner.png`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonical,
          },
        };

        // Only link comparison pages that resolve (both tools live).
        const liveCompSlugs = new Set(getLiveComparisons(tools).map((c) => c.canonicalSlug));
        const liveBlogComparisons = (article.relatedComparisonSlugs || []).filter((c) => liveCompSlugs.has(c));
        const liveAltSlugs = new Set(getLiveAlternatives(tools).map((a) => a.toolSlug));

        // Render referenced tools
        const relatedTools = (article.relatedToolSlugs || [])
          .map((tSlug) => tools.find((t: any) => t.slug === tSlug || t.id === tSlug))
          .filter(Boolean);

        const articleBodyHtml = `
<header>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/blog">Blog</a></li>
      <li aria-current="page">${article.title}</li>
    </ol>
  </nav>
</header>
<main>
  <article>
    <header>
      <span class="badge">${article.topic || 'AI Guide'}</span>
      <h1>${article.title}</h1>
      <p class="byline">By <strong>ToolverAI Editorial Team</strong> | Published: ${article.publishedAt} | Updated: ${article.updatedAt || article.publishedAt} | ${article.readTime || '6 min read'}</p>
    </header>

    <div class="article-content">
      <p><strong>${article.excerpt}</strong></p>
      ${marked.parse(article.content)}
    </div>
    ${article.faqs?.length ? faqsToHtml(article.faqs) : ''}

    ${relatedTools.length > 0 ? `
    <section>
      <h2>Tools Mentioned in This Guide</h2>
      <ul>
        ${relatedTools.map((t: any) => `<li><a href="/tool/${t.slug || t.id}"><strong>${t.name}</strong></a> (${t.category} | ${t.monthlyVisitsFormatted || 'N/A'} visits/mo) — ${t.tagline || t.description?.slice(0, 80)}</li>`).join('\n        ')}
      </ul>
    </section>` : ''}

    ${liveBlogComparisons.length > 0 ? `
    <section>
      <h2>Related Head-to-Head Comparisons</h2>
      <ul>
        ${liveBlogComparisons.map((cSlug) => `<li><a href="/compare/${cSlug}">Compare ${cSlug.replace('-vs-', ' vs ')}</a></li>`).join('\n        ')}
      </ul>
    </section>` : ''}

    ${(article.relatedAlternativeSlugs || []).length > 0 ? `
    <section>
      <h2>Curated Alternatives Guides</h2>
      <ul>
        ${article.relatedAlternativeSlugs!.filter((aSlug) => liveAltSlugs.has(aSlug)).map((aSlug) => `<li><a href="/alternatives/${aSlug}">Best ${aSlug} Alternatives</a></li>`).join('\n        ')}
      </ul>
    </section>` : ''}

    ${(article.relatedCategorySlugs || []).length > 0 ? `
    <section>
      <h2>Explore Related Categories</h2>
      <ul>
        ${article.relatedCategorySlugs!.map((catSlug) => `<li><a href="/categories/${catSlug}">Browse ${catSlug.replace('-', ' ')} Tools</a></li>`).join('\n        ')}
      </ul>
    </section>` : ''}

    <nav aria-label="Editorial Links">
      <p>
        <a href="/editorial-policy">Editorial Policy</a> |
        <a href="/how-we-rank-tools">Ranking Methodology</a> |
        <a href="/blog">All Editorial Guides</a> |
        <a href="/">Home Directory</a>
      </p>
    </nav>
  </article>
</main>`;

        const finalHtml = renderSsrPage(htmlTemplate, {
          title,
          description: desc,
          canonical,
          robots: 'index, follow, max-image-preview:large, max-snippet:-1',
          ogType: 'article',
          ogImage: heroImage,
          jsonLd: [
            breadcrumbJsonLd,
            blogPostingJsonLd,
            ...(article.faqs?.length ? [faqPageJsonLd(article.faqs, canonical)] : []),
          ],
          bodyHtml: articleBodyHtml,
        });

        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        console.error('SSR error for /blog/:slug:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── SSR: Admin Console (/admin) ─────────────────────────────────────
    app.get(['/admin', '/admin/*'], (req, res) => {
      try {
        const htmlTemplate = getIndexHtmlTemplate();
        const baseUrl = resolveBaseUrl(req);
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        const finalHtml = renderSsrPage(htmlTemplate, {
          title: 'Admin Console | ToolverAI',
          description: 'Administrative control panel for ToolverAI directory.',
          canonical: `${baseUrl}/admin`,
          robots: 'noindex, nofollow',
          bodyHtml: '<main><h1>Admin Console</h1><p>Please log in to manage ToolverAI directory.</p></main>',
        });
        res.header('Content-Type', 'text/html; charset=utf-8');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).send(finalHtml);
      } catch (err: any) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // ── Catch-all: 404 handling with noindex and valid SPA fallback ─────
    app.get('*', (req, res) => {
      const knownRoutes = [
        '/', '/rankings', '/compare', '/deals', '/prompts', '/categories',
        '/blog', '/submit-tool', '/about', '/privacy-policy', '/terms', '/affiliate-disclosure',
        '/editorial-policy', '/how-we-rank-tools',
        '/alternatives',
      ];
      const isKnown = knownRoutes.includes(req.path)
        || req.path.startsWith('/tool/')
        || req.path.startsWith('/categories/')
        || req.path.startsWith('/compare/')
        || req.path.startsWith('/alternatives/')
        || req.path.startsWith('/blog/')
        || req.path.startsWith('/admin');

      if (!isKnown) {
        try {
          const htmlTemplate = getIndexHtmlTemplate();
          const baseUrl = resolveBaseUrl(req);
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          const notFoundHtml = renderSsrPage(htmlTemplate, {
            title: 'Page Not Found — ToolverAI',
            description: 'The requested page could not be found on ToolverAI.',
            canonical: `${baseUrl}${req.path}`,
            robots: 'noindex, nofollow',
          });
          res.header('Content-Type', 'text/html; charset=utf-8');
          return res.status(404).send(notFoundHtml);
        } catch {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          return res.status(404).sendFile(path.join(distPath, 'index.html'));
        }
      }

      res.status(200).sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ToolverAI Server running on http://localhost:${PORT}`);
    console.log(`📡 Sitemap: http://localhost:${PORT}/sitemap.xml`);
    console.log(`🤖 Robots: http://localhost:${PORT}/robots.txt`);
  });
}

startServer();
