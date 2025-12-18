import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to .env.local');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export default { then: (resolve: (value: MongoClient) => void, reject: (reason: any) => void) => getClientPromise().then(resolve, reject) } as Promise<MongoClient>;

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  VENDORS: 'vendors',
  STYLES: 'styles',
  FABRIC_CUTTING: 'fabricCutting',
  TAILOR_JOBS: 'tailorJobs',
  SHIPMENTS: 'shipments',
  RATES: 'rates',
  EVENTS: 'events',
} as const;

