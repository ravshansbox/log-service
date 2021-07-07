const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { json } = require('body-parser');

const { HTTP_PORT = '80', MONGODB_URL = 'mongodb://localhost:27017' } = process.env;

const app = express();
app.set('etag', false);
app.set('x-powered-by', false);
app.set('trust proxy', true);
app.use(json({ limit: '64kb' }));

const mongoClient = new MongoClient(MONGODB_URL, { useUnifiedTopology: true });

const prefixKeys = (source, prefix, separator = '.') => {
  return Object.keys(source).reduce((agg, key) => {
    agg[`${prefix}${separator}${key}`] = source[key];
    return agg;
  }, {});
};

(async () => {
  await mongoClient.connect();

  console.info('Connected to database.');

  app.get('/:db/:collection', async (request, response, next) => {
    const { query } = request;
    const { db: dbName, collection: collectionName } = request.params;
    try {
      const collection = mongoClient.db(dbName).collection(collectionName);
      const result = await collection.find(query).toArray();
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/:db/:collection/:id', async (request, response, next) => {
    const { db: dbName, collection: collectionName, id } = request.params;
    try {
      const collection = mongoClient.db(dbName).collection(collectionName);
      const result = await collection.findOne({ _id: ObjectId(id) });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/:db/:collection', async (request, response, next) => {
    const { db: dbName, collection: collectionName } = request.params;
    const { ip, headers, body } = request;
    try {
      const collection = mongoClient.db(dbName).collection(collectionName);
      const { ops } = await collection.insertOne({ ip, headers, body, created_at: new Date() });
      response.json(ops);
    } catch (error) {
      next(error);
    }
  });

  app.put('/:db/:collection/:id', async (request, response, next) => {
    const { db: dbName, collection: collectionName, id } = request.params;
    const { body } = request;
    const $setBody = prefixKeys(body, 'body');
    try {
      const collection = mongoClient.db(dbName).collection(collectionName);
      const { value } = await collection.findOneAndUpdate(
        { _id: ObjectId(id) },
        { $set: { ...$setBody, updated_at: new Date() } },
        { returnDocument: 'after' }
      );
      response.json(value);
    } catch (error) {
      next(error);
    }
  });

  const server = app.listen(HTTP_PORT, () => {
    console.info('Listening on %s', server.address());
  });
})().catch(console.error);
