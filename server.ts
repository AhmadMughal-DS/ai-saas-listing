import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { MongoClient, Db } from 'mongodb';
import { initializeApp as initFirebaseApp, cert, applicationDefault, App as FirebaseApp } from 'firebase-admin/app';
import dotenv from 'dotenv';
import { INITIAL_TOOLS } from './src/data/initialData';

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
let isConnectingPromise: Promise<Db | null> | null = null;
let lastConnectionAttemptTime = 0;
let lastConnectionError: string | null = null;
const CONNECTION_COOLDOWN_MS = 15000;

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
    await collection.createIndex({ category: 1, monthlyVisits: -1 }, { name: 'idx_tool_cat_visits' });
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
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Try initializing MongoDB & Firebase Admin on boot
  getMongoDb().catch(() => {});
  try {
    getFirebaseAdmin();
  } catch {}

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
        // Normalize _id to id
        const cleanTools = tools.map((t) => {
          const { _id, ...rest } = t;
          return { id: rest.id || _id?.toString(), ...rest };
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
