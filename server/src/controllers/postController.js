const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --------------- GET /api/posts ---------------
async function listPosts(req, res) {
  try {
    const {
      status = 'published',
      category,
      tag,
      search,
      page = '1',
      limit = '10',
      sort = 'date',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // 排序：date=按发布日期倒序，likes=按点赞数倒序
    const orderBy = sort === 'likes' ? { likes: 'desc' } : { publishedAt: 'desc' };

    // 构建 where 条件
    const where = {};

    // status 筛选
    // 未认证者只能看 published；认证后可指定 status 参数
    if (req.user) {
      if (status && status !== 'all') where.status = status;
    } else {
      where.status = 'published';
      where.visibility = 'public'; // 未登录只看公开文章
    }

    // 分类筛选
    if (category) {
      where.category = { slug: category };
    }

    // 标签筛选
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }

    // 全文搜索（标题 & 摘要 & 内容）
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          cover: true,
          likes: true,
          status: true,
          visibility: true,
          publishedAt: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // 展平 tag 嵌套结构
    const result = posts.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.tag),
    }));

    res.json({
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[posts:list]', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}

// --------------- GET /api/posts/:slug ---------------
async function getPost(req, res) {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        tags: { include: { tag: true } },
        author: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // 未登录不能看私有/加密文章
    if (!req.user && post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!req.user && post.visibility !== 'public') {
      return res.status(404).json({ error: 'Post not found' });
    }

    // content 是 JSON 字符串，解析后返回
    const result = {
      ...post,
      tags: post.tags.map((t) => t.tag),
      content: safeJsonParse(post.content),
      commentCount: post._count.comments,
      _count: undefined,
    };

    res.json(result);
  } catch (err) {
    console.error('[posts:get]', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
}

// --------------- POST /api/posts ---------------
async function createPost(req, res) {
  try {
    const { title, content, excerpt, cover, categoryId, tags, status, visibility, publishedAt } =
      req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const slug = generateSlug(title);

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: JSON.stringify(content ?? {}),
        excerpt: excerpt ?? null,
        cover: cover ?? null,
        categoryId: categoryId ?? null,
        status: status ?? 'draft',
        visibility: visibility ?? 'public',
        publishedAt: status === 'published' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        authorId: req.user.id,
        tags: tags?.length
          ? {
              create: await resolveTags(tags),
            }
          : undefined,
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json({
      ...post,
      tags: post.tags.map((t) => t.tag),
      content: safeJsonParse(post.content),
    });
  } catch (err) {
    console.error('[posts:create]', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already exists, try a different title' });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
}

// --------------- PUT /api/posts/:id ---------------
async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const { title, content, excerpt, cover, categoryId, tags, status, visibility, publishedAt } =
      req.body;

    // 构建更新数据
    const data = {};

    if (title !== undefined) {
      data.title = title;
      data.slug = generateSlug(title);
    }
    if (content !== undefined) data.content = JSON.stringify(content);
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (cover !== undefined) data.cover = cover;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (status !== undefined) {
      data.status = status;
      if (status === 'published' && !publishedAt) data.publishedAt = new Date();
      if (publishedAt) data.publishedAt = new Date(publishedAt);
    }
    if (visibility !== undefined) data.visibility = visibility;

    // 标签：先删后建
    if (tags !== undefined) {
      await prisma.postTag.deleteMany({ where: { postId: id } });
      if (tags.length) {
        data.tags = {
          create: await resolveTags(tags),
        };
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    res.json({
      ...post,
      tags: post.tags.map((t) => t.tag),
      content: safeJsonParse(post.content),
    });
  } catch (err) {
    console.error('[posts:update]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug conflict' });
    res.status(500).json({ error: 'Failed to update post' });
  }
}

// --------------- DELETE /api/posts/:id ---------------
async function deletePost(req, res) {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[posts:delete]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

// --------------- 辅助函数 ---------------

/** 简易 slug 生成 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || Date.now().toString(36);
}

/** 安全 JSON 解析 */
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * 解析 tags 数组为 PostTag create 数据
 * tags 可传 [{ id, name, slug }] 或 纯字符串数组 ["tag1","tag2"]
 */
async function resolveTags(tags) {
  const result = [];
  for (const t of tags) {
    if (typeof t === 'string') {
      // 查找或创建
      let tag = await prisma.tag.findUnique({ where: { slug: t } });
      if (!tag) {
        tag = await prisma.tag.create({ data: { name: t, slug: t } });
      }
      result.push({ tag: { connect: { id: tag.id } } });
    } else if (t.id) {
      result.push({ tag: { connect: { id: t.id } } });
    } else if (t.name) {
      const slug = t.slug || generateSlug(t.name);
      let tag = await prisma.tag.findUnique({ where: { slug } });
      if (!tag) {
        tag = await prisma.tag.create({ data: { name: t.name, slug } });
      }
      result.push({ tag: { connect: { id: tag.id } } });
    }
  }
  return result;
}

// --------------- POST /api/posts/:id/like ---------------
async function likePost(req, res) {
  try {
    const { anonId } = req.body;
    if (!anonId) return res.status(400).json({ error: 'anonId is required' });

    const postId = req.params.id;

    // 检查是否已赞
    const existing = await prisma.like.findUnique({
      where: { anonId_postId: { anonId, postId } },
    });

    if (existing) {
      // 取消赞：删记录，减计数
      await prisma.like.delete({ where: { id: existing.id } });
      const post = await prisma.post.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
        select: { id: true, likes: true },
      });
      res.json({ id: post.id, likes: post.likes, liked: false });
    } else {
      // 点赞：加记录，增计数
      await prisma.like.create({ data: { anonId, postId } });
      const post = await prisma.post.update({
        where: { id: postId },
        data: { likes: { increment: 1 } },
        select: { id: true, likes: true },
      });
      res.json({ id: post.id, likes: post.likes, liked: true });
    }
  } catch (err) {
    console.error('[posts:like]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to like post' });
  }
}

// --------------- POST /api/posts/:slug/view ---------------
async function viewPost(req, res) {
  try {
    const post = await prisma.post.update({
      where: { slug: req.params.slug },
      data: { viewCount: { increment: 1 } },
      select: { id: true, slug: true, viewCount: true },
    });
    res.json(post);
  } catch (err) {
    console.error('[posts:view]', err);
    if (err.code === 'P2025') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to record view' });
  }
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, likePost, viewPost };