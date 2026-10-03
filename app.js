import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

import { router as authRouter } from './routes/auth.js';
import { router as todosRouter } from './routes/todos.js';
import { requireAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'todo_portfolio';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-change-me');

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required in production.');
}

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
await client.connect();
const db = client.db(dbName);
await db.collection('users').createIndex({ username: 1 }, { unique: true });
await db.collection('todos').createIndex({ owner: 1, _id: 1 });

app.locals.db = db;
app.locals.jwtSecret = jwtSecret;

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/todos', requireAuth, todosRouter);

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use('/api', (req, res) => res.sendStatus(404));
app.use((req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  const message = isProduction ? 'サーバでエラーが発生しました' : err.message;
  res.status(err.status || 500).json({ message });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received`);
  server.close(async () => {
    await client.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
