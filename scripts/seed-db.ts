import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { INITIAL_TOOLS } from '../src/data/initialData';

dotenv.config();

const uri = process.env.MONGODB_URI;

async function seed() {
  if (!uri) throw new Error('No MONGODB_URI in .env');
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db('test');
  const col = db.collection('tools');

  await col.deleteMany({});
  const result = await col.insertMany(INITIAL_TOOLS.map((t) => ({ ...t, _id: t.id as any })));
  console.log(`✅ Successfully seeded ${result.insertedCount} tools into MongoDB!`);

  const categoryCounts = await col.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]).toArray();

  console.log('\nCategory breakdown in MongoDB:');
  categoryCounts.forEach((c) => console.log(`  - ${c._id}: ${c.count} tool(s)`));

  await client.close();
}

seed().catch((e) => {
  console.error('Seed Error:', e);
  process.exit(1);
});
