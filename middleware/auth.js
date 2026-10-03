import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'ログインが必要です' });
  }

  try {
    req.user = jwt.verify(token, req.app.locals.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'ログイン情報の有効期限が切れています' });
  }
}
