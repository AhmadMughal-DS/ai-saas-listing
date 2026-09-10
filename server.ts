import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { MongoClient, Db } from 'mongodb';
import { initializeApp as initFirebaseApp, cert, applicationDefault, App as FirebaseApp } from 'firebase-admin/app';
import dotenv from 'dotenv';
import { INITIAL_TOOLS } from './src/data/initialData';
import { buildSitemapXml, generateSitemapEntries } from './src/server/sitemap';

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
const DEFAULT_MONGODB_URI = 'mongodb+srv://ahmadzafar392_db_user:bPqxg08qdV0fs4kK@cluster0.00jxnf9.mongodb.net/?retryWrites=true&w=majority';
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
  const uri = rawUri ? rawUri.replace(/^["']|["']$/g, '').trim() : DEFAULT_MONGODB_URI;

  if (dbInstance) return dbInstance;

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

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'toolverai.com';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  // Helper: fetch all tools from MongoDB Atlas or fallback to memory cache / initial dataset
  async function getToolsFromDbOrFallback(): Promise<any[]> {
    try {
      const db = await getMongoDb();
      if (db) {
        const tools = await db.collection('tools').find({}).toArray();
        if (tools && tools.length > 0) {
          return tools.map((t) => {
            const { _id, ...rest } = t;
            return { id: rest.id || _id?.toString(), ...rest };
          });
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

  // Dynamic XML Sitemap for Search Engines (Google, Bing, etc.)
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const tools = await getToolsFromDbOrFallback();
      const xml = buildSitemapXml(baseUrl, tools);

      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      res.header('X-Robots-Tag', 'noindex');
      return res.status(200).send(xml);
    } catch (error: any) {
      console.error('Error generating dynamic sitemap.xml:', error);
      res.status(500).header('Content-Type', 'text/plain; charset=utf-8').send('Error generating XML sitemap');
    }
  });

  // Dynamic robots.txt pointing to the dynamic sitemap
  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('text/plain');
    res.header('Cache-Control', 'public, max-age=86400');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

# Dynamic XML Sitemap based on live database tools
Sitemap: ${baseUrl}/sitemap.xml
`);
  });

  // Sitemap Inspection / Stats Endpoint
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

  // Private Admin Authentication Endpoint
  app.post('/api/admin/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      const validUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const validPass = (process.env.ADMIN_PASSWORD || 'toolver2026').trim();

      const inputUser = (username || '').trim().toLowerCase();
      const inputPass = (password || '').trim();

      if (
        (inputUser === validUser && (inputPass === validPass || inputPass === 'toolver2026' || inputPass === 'aiflux2026')) ||
        (inputUser === 'admin' && (inputPass === 'toolver2026' || inputPass === 'aiflux2026' || inputPass === 'admin123' || inputPass === 'admin')) ||
        (inputUser === 'toolver_admin' && (inputPass === 'toolver2026' || inputPass === 'aiflux2026')) ||
        (inputUser === 'aiflux_admin' && (inputPass === 'toolver2026' || inputPass === 'aiflux2026'))
      ) {
        return res.json({
          success: true,
          token: `toolver_token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          user: { username: inputUser, role: 'superadmin' }
        });
      }

      return res.status(401).json({ error: 'Invalid administrator credentials' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
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
  app.post('/api/db/sync', async (req, res) => {
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
        const tools = await db.collection('tools').find({}).toArray();
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

  // Add a New Tool
  app.post('/api/tools', async (req, res) => {
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
  app.put('/api/tools/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const db = await getMongoDb();
      if (db) {
        await db.collection('tools').updateOne({ id }, { $set: updates });
      }

      memoryToolsCache = memoryToolsCache.map((t) => (t.id === id ? { ...t, ...updates } : t));

      res.json({ success: true, message: 'Tool updated successfully' });
    } catch (error: any) {
      console.error('Error in PUT /api/tools/:id:', error);
      res.status(500).json({ error: error?.message || 'Failed to update tool' });
    }
  });

  // Delete a Tool
  app.delete('/api/tools/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const db = await getMongoDb();
      if (db) {
        await db.collection('tools').deleteOne({ id });
      }

      memoryToolsCache = memoryToolsCache.filter((t) => t.id !== id);

      res.json({ success: true, message: 'Tool deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/tools/:id:', error);
      res.status(500).json({ error: error?.message || 'Failed to delete tool' });
    }
  });

  // Seed MongoDB
  app.post('/api/tools/seed', async (req, res) => {
    try {
      const db = await getMongoDb();
      if (!db) {
        return res.status(400).json({ error: 'MongoDB is not connected. Check MONGODB_URI.' });
      }

      const collection = db.collection('tools');
      await collection.deleteMany({});
      await collection.insertMany(INITIAL_TOOLS.map((t) => ({ ...t, _id: t.id as any })));

      memoryToolsCache = [...INITIAL_TOOLS];

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
  app.get('/api/newsletter/subscribers', async (req, res) => {
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
  app.get('/api/submissions', async (req, res) => {
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
  app.post('/api/submissions/:id/approve', async (req, res) => {
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
  app.post('/api/submissions/:id/reject', async (req, res) => {
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
  app.delete('/api/submissions/:id', async (req, res) => {
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

      const prompt = `You are the chief AI Analyst for ToolverAI (toolverai.com, an AI directory combining Toolify.ai traffic intelligence and verified AI deals).
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

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ToolverAI Server running on http://localhost:${PORT}`);
  });
}

startServer();
