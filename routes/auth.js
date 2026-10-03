import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';

export const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'しばらく待ってからもう一度お試しください' }
});

router.use(authLimiter);

function validateCredentials(username, password) {
  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return { error: 'ユーザ名は3〜30文字で入力してください' };
  }
  if (cleanPassword.length < 6 || cleanPassword.length > 100) {
    return { error: 'パスワードは6〜100文字で入力してください' };
  }
  return { username: cleanUsername, password: cleanPassword };
}

router.post('/register', async (req, res, next) => {
  try {
    const checked = validateCredentials(req.body?.username, req.body?.password);
    if (checked.error) {
      return res.status(400).json({ message: checked.error });
    }

    const { username, password } = checked;
    const users = req.app.locals.db.collection('users');
    const existing = await users.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'そのユーザ名は既に使用されています' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await users.insertOne({ username, passwordHash, createdAt: new Date() });
    return res.status(201).json({ message: '登録しました' });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'そのユーザ名は既に使用されています' });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const user = await req.app.locals.db.collection('users').findOne({ username });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(403).json({ message: 'ユーザ名またはパスワードが違います' });
    }

    const token = jwt.sign({ username }, req.app.locals.jwtSecret, { expiresIn: '12h' });
    return res.json({ username, token });
  } catch (error) {
    return next(error);
  }
});
