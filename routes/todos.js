import { Router } from 'express';
import { ObjectId } from 'mongodb';

export const router = Router();

const MAX_TASKS_PER_USER = 200;

function objectIdOrNull(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function normalizeTask(body, { partial = false } = {}) {
  const task = {};

  if (!partial || Object.hasOwn(body, 'description')) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) return { error: 'タスクを入力してください' };
    if (description.length > 200) return { error: 'タスクは200文字以内で入力してください' };
    task.description = description;
  }

  if (Object.hasOwn(body, 'completed')) {
    task.completed = Boolean(body.completed);
  } else if (!partial) {
    task.completed = false;
  }

  if (Object.hasOwn(body, 'deadline')) {
    const deadline = typeof body.deadline === 'string' ? body.deadline : '';
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return { error: '締切日の形式が正しくありません' };
    }
    task.deadline = deadline;
  }

  if (Object.hasOwn(body, 'memo')) {
    const memo = typeof body.memo === 'string' ? body.memo.trim() : '';
    if (memo.length > 500) return { error: 'メモは500文字以内で入力してください' };
    task.memo = memo;
  }

  return { task };
}

router.get('/', async (req, res, next) => {
  try {
    const tasks = await req.app.locals.db.collection('todos')
      .find({ owner: req.user.username })
      .sort({ _id: 1 })
      .toArray();
    return res.json(tasks);
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const todos = req.app.locals.db.collection('todos');
    const count = await todos.countDocuments({ owner: req.user.username });
    if (count >= MAX_TASKS_PER_USER) {
      return res.status(400).json({ message: `タスクは最大${MAX_TASKS_PER_USER}件までです` });
    }

    const normalized = normalizeTask(req.body || {});
    if (normalized.error) return res.status(400).json({ message: normalized.error });

    const result = await todos.insertOne({
      ...normalized.task,
      owner: req.user.username,
      createdAt: new Date()
    });
    return res.status(201).json({ id: result.insertedId });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const _id = objectIdOrNull(req.params.id);
    if (!_id) return res.status(400).json({ message: '不正なIDです' });

    const normalized = normalizeTask(req.body || {}, { partial: true });
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    if (Object.keys(normalized.task).length === 0) {
      return res.status(400).json({ message: '更新内容がありません' });
    }

    const result = await req.app.locals.db.collection('todos').updateOne(
      { _id, owner: req.user.username },
      { $set: normalized.task }
    );
    if (result.matchedCount === 0) return res.sendStatus(404);
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

router.delete('/completed', async (req, res, next) => {
  try {
    await req.app.locals.db.collection('todos').deleteMany({
      owner: req.user.username,
      completed: true
    });
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const _id = objectIdOrNull(req.params.id);
    if (!_id) return res.status(400).json({ message: '不正なIDです' });

    const result = await req.app.locals.db.collection('todos').deleteOne({
      _id,
      owner: req.user.username
    });
    if (result.deletedCount === 0) return res.sendStatus(404);
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});
