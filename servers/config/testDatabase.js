import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

let mongoServer;
let connection;
let db;

export async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  connection = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  db = connection.db();
  return db;
}

export async function closeTestDB() {
  if (connection) await connection.close();
  if (mongoServer) await mongoServer.stop();
}

export function getDB() {
  return db;
}
