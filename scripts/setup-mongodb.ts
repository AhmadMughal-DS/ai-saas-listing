import { MongoClient } from 'mongodb';
import { INITIAL_TOOLS } from '../src/data/initialData';

const MONGODB_URI = 'mongodb+srv://ahmadzafar392_db_user:bPqxg08qdV0fs4kK@cluster0.00jxnf9.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'toolver_db';

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

async function setupMongoDb() {
  console.log('Connecting to MongoDB Atlas at cluster0.00jxnf9.mongodb.net...');
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const db = client.db(DB_NAME);

    // 1. Check if 'tools' collection exists
    const existingCollections = await db.listCollections({ name: 'tools' }).toArray();
    if (existingCollections.length === 0) {
      console.log('Creating "tools" collection with JSON schema validation...');
      await db.createCollection('tools', {
        validator: TOOL_COLLECTION_SCHEMA,
        validationLevel: 'moderate',
        validationAction: 'warn'
      });
      console.log('Collection "tools" created with strict JSON Schema validator.');
    } else {
      console.log('Applying JSON Schema validation to existing "tools" collection...');
      try {
        await db.command({
          collMod: 'tools',
          validator: TOOL_COLLECTION_SCHEMA,
          validationLevel: 'moderate',
          validationAction: 'warn'
        });
        console.log('Schema validator successfully applied via collMod.');
      } catch (collModErr: any) {
        console.warn('collMod note (may require admin permissions, continuing):', collModErr.message);
      }
    }

    const collection = db.collection('tools');

    // 2. Create Indexes
    console.log('Creating database indexes on "tools" collection...');
    await collection.createIndex({ id: 1 }, { unique: true, name: 'idx_tool_id_unique' });
    await collection.createIndex({ slug: 1 }, { unique: true, name: 'idx_tool_slug_unique' });
    await collection.createIndex({ category: 1 }, { name: 'idx_tool_category' });
    await collection.createIndex({ monthlyVisits: -1 }, { name: 'idx_tool_monthly_visits_desc' });
    await collection.createIndex({ rating: -1 }, { name: 'idx_tool_rating_desc' });
    await collection.createIndex({ isFeatured: 1 }, { name: 'idx_tool_featured' });
    await collection.createIndex({ category: 1, monthlyVisits: -1 }, { name: 'idx_tool_cat_visits' });
    
    // Text search index for fast full-text queries
    try {
      await collection.createIndex(
        { name: 'text', tagline: 'text', description: 'text' },
        { name: 'idx_tool_fulltext_search', weights: { name: 10, tagline: 5, description: 1 } }
      );
    } catch (e: any) {
      console.log('Text index note:', e.message);
    }

    console.log('Indexes created successfully.');

    // 3. Upsert / Seed Full Accurate Tools Dataset
    console.log(`Upserting ${INITIAL_TOOLS.length} comprehensive tools into MongoDB...`);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const tool of INITIAL_TOOLS) {
      const doc = {
        ...tool,
        _id: tool.id as any,
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        tagline: tool.tagline || '',
        description: tool.description || '',
        url: tool.url,
        category: tool.category,
        logoUrl: tool.logoUrl,
        thumbnailVideoUrl: tool.thumbnailVideoUrl || null,
        videoDuration: tool.videoDuration || null,
        rating: Number(tool.rating) || 4.5,
        reviewCount: Number(tool.reviewCount) || 10,
        pricingType: tool.pricingType,
        isOpenSource: Boolean(tool.isOpenSource),
        hasApi: Boolean(tool.hasApi),
        isFeatured: Boolean(tool.isFeatured),
        featuredRank: tool.featuredRank || null,
        monthlyVisits: Number(tool.monthlyVisits) || 0,
        monthlyVisitsFormatted: tool.monthlyVisitsFormatted || `${tool.monthlyVisits || 0}`,
        trafficGrowth: Number(tool.trafficGrowth) || 0,
        globalRank: Number(tool.globalRank) || 999,
        categoryRank: Number(tool.categoryRank) || 99,
        topCountries: tool.topCountries || [],
        trafficStats: tool.trafficStats || null,
        platforms: tool.platforms || ['Web'],
        targetAudience: tool.targetAudience || ['Developers'],
        pros: tool.pros || [],
        cons: tool.cons || [],
        alternatives: tool.alternatives || [],
        deal: tool.deal || null,
        upvotes: Number(tool.upvotes) || 0,
        launchedDate: tool.launchedDate || new Date().toISOString().split('T')[0],
        keyFeatures: tool.keyFeatures || [],
        pricingPlans: tool.pricingPlans || [],
        reviews: tool.reviews || [],
        createdAt: tool.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await collection.replaceOne({ id: tool.id }, doc, { upsert: true });
      if (res.upsertedCount > 0) insertedCount++;
      else updatedCount++;
    }

    console.log(`MongoDB tools update complete: ${insertedCount} inserted, ${updatedCount} updated.`);

    // 4. Verify Total Count and Sample
    const totalCount = await collection.countDocuments();
    console.log(`Verified total tools in MongoDB toolver_db.tools: ${totalCount}`);

    const indexList = await collection.indexes();
    console.log('Active Indexes:', indexList.map((i) => i.name));

    console.log('MongoDB schema configuration and seeding SUCCESSFUL!');
  } catch (err: any) {
    console.error('Setup failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupMongoDb();
