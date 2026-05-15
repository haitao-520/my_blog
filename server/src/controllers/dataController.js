const { PrismaClient } = require('@prisma/client');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ===================== POST /api/export =====================
async function exportJSON(req, res) {
  try {
    const { types } = req.body;
    if (!Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'types must be a non-empty array' });
    }

    const data = { exportedAt: new Date().toISOString() };
    const imageFiles = new Set(); // 收集引用的图片路径

    for (const type of types) {
      switch (type) {
        case 'posts':
          data.posts = await prisma.post.findMany({
            include: {
              category: true,
              tags: { include: { tag: true } },
              author: { select: { id: true, username: true } },
            },
            orderBy: { createdAt: 'desc' },
          });
          data.posts = data.posts.map((p) => {
            // 扫描文章内容中的图片
            collectImages(p.content, imageFiles);
            // 封面图
            if (p.cover) imageFiles.add(p.cover);
            return {
              ...p,
              tags: p.tags.map((t) => t.tag),
            };
          });
          break;
        case 'categories':
          data.categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
          break;
        case 'tags':
          data.tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
          break;
        case 'comments':
          data.comments = await prisma.comment.findMany({
            include: { post: { select: { id: true, title: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
          });
          break;
        case 'settings':
          const rows = await prisma.setting.findMany();
          data.settings = {};
          rows.forEach(r => { data.settings[r.key] = r.value; });
          break;
        default:
          break;
      }
    }

    // 创建 zip 包
    const archive = archiver('zip', { zlib: { level: 6 } });
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    const exportName = `blog-export-${dateStr}-${timeStr}`;
    res.setHeader('Content-Disposition', `attachment; filename="${exportName}.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    archive.on('error', (err) => { console.error(err); res.status(500).end(); });
    archive.pipe(res);

    // 1. 添加 data.json
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

    // 2. 添加图片文件
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    for (const imgPath of imageFiles) {
      const relPath = imgPath.replace(/^\/uploads\//, '');
      const absPath = path.join(uploadsDir, relPath);
      if (fs.existsSync(absPath)) {
        archive.file(absPath, { name: `uploads/${relPath}` });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('[export:json]', err);
    res.status(500).json({ error: 'Export failed' });
  }
}

// ===================== GET /api/export/markdown =====================
async function exportMarkdown(req, res) {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      include: {
        category: true,
        tags: { include: { tag: true } },
        author: { select: { username: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No published posts to export' });
    }

    // 创建临时目录
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-md-'));
    const files = [];
    const imageFiles = new Set();

    for (const post of posts) {
      const date = post.publishedAt
        ? new Date(post.publishedAt).toISOString().slice(0, 10)
        : new Date(post.createdAt).toISOString().slice(0, 10);

      // YAML front matter
      const frontMatter = [
        '---',
        `title: "${escapeYaml(post.title)}"`,
        `date: ${date}`,
        `slug: ${post.slug}`,
        post.excerpt ? `excerpt: "${escapeYaml(post.excerpt)}"` : '',
        post.category ? `category: ${post.category.slug}` : '',
        post.tags.length > 0
          ? `tags: [${post.tags.map((t) => t.tag.slug).join(', ')}]`
          : '',
        `author: ${post.author?.username || 'admin'}`,
        post.cover ? `cover: ${post.cover}` : '',
        '---',
        '',
      ]
        .filter((l) => l !== '')
        .join('\n');

      // 正文：简易 JSON → Markdown
      const body = tiptapToMarkdown(post.content);

      const md = frontMatter + body;
      const safeSlug = post.slug.replace(/[^a-z0-9\u4e00-\u9fff-]/g, '_');
      const filePath = path.join(tmpDir, `${safeSlug}.md`);
      fs.writeFileSync(filePath, md, 'utf-8');
      files.push({ name: `${safeSlug}.md`, path: filePath });

      // 收集文章内图片
      collectImages(post.content, imageFiles);
      if (post.cover) imageFiles.add(post.cover);
    }

    // 打包 zip
    const archive = archiver('zip', { zlib: { level: 6 } });
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename="blog-markdown-${dateStr}-${timeStr}.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    archive.on('error', (err) => { console.error(err); res.status(500).end(); });
    archive.pipe(res);

    for (const f of files) {
      archive.file(f.path, { name: f.name });
    }

    // 添加图片
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    for (const imgPath of imageFiles) {
      const relPath = imgPath.replace(/^\/uploads\//, '');
      const absPath = path.join(uploadsDir, relPath);
      if (fs.existsSync(absPath)) {
        archive.file(absPath, { name: `uploads/${relPath}` });
      }
    }

    await archive.finalize();

    // 清理
    setTimeout(() => {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    }, 5000);
  } catch (err) {
    console.error('[export:md]', err);
    res.status(500).json({ error: 'Markdown export failed' });
  }
}

// ===================== POST /api/import =====================
async function importData(req, res) {
  // 使用 multer 解析上传文件
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name: file)' });
    }

    const conflictStrategy = req.query.strategy === 'overwrite' ? 'overwrite' : 'skip';
    const report = {
      imported: { posts: 0, categories: 0, tags: 0, comments: 0 },
      skipped: { posts: 0, categories: 0, tags: 0, comments: 0 },
      errors: [],
    };

    try {
      let data;
      let zip;

      // 检测是否为 zip 文件（PK 头）
      if (req.file.buffer[0] === 0x50 && req.file.buffer[1] === 0x4b) {
        zip = new AdmZip(req.file.buffer);
        const jsonEntry = zip.getEntry('data.json');
        if (!jsonEntry) throw new Error('ZIP 中未找到 data.json');
        data = JSON.parse(jsonEntry.getData().toString('utf-8'));

        // 提取图片到 uploads 目录
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const imgEntries = zip.getEntries().filter(e => e.entryName.startsWith('uploads/') && !e.isDirectory);
        for (const entry of imgEntries) {
          const relPath = entry.entryName.replace(/^uploads\//, '');
          const destPath = path.join(uploadsDir, relPath);
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, entry.getData());
          }
        }
      } else {
        data = JSON.parse(req.file.buffer.toString('utf-8'));
      }

      // ===== 分类 =====
      const categoryMap = {}; // oldId → newId
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          try {
            const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
            if (existing) {
              categoryMap[cat.id] = existing.id;
              report.skipped.categories++;
            } else {
              const created = await prisma.category.create({
                data: {
                  name: cat.name,
                  slug: cat.slug,
                  parentId: cat.parentId && categoryMap[cat.parentId] ? categoryMap[cat.parentId] : null,
                },
              });
              categoryMap[cat.id] = created.id;
              report.imported.categories++;
            }
          } catch (e) {
            report.errors.push(`Category "${cat.name}": ${e.message}`);
          }
        }
      }

      // ===== 标签 =====
      const tagMap = {};
      if (Array.isArray(data.tags)) {
        for (const tag of data.tags) {
          try {
            const existing = await prisma.tag.findUnique({ where: { slug: tag.slug } });
            if (existing) {
              tagMap[tag.id] = existing.id;
              report.skipped.tags++;
            } else {
              const created = await prisma.tag.create({ data: { name: tag.name, slug: tag.slug } });
              tagMap[tag.id] = created.id;
              report.imported.tags++;
            }
          } catch (e) {
            report.errors.push(`Tag "${tag.name}": ${e.message}`);
          }
        }
      }

      // ===== 文章 =====
      const postMap = {}; // oldId → newId
      const serverAdmin = await prisma.user.findFirst({ where: { username: 'admin' } });
      const importAuthorId = serverAdmin?.id || req.user?.id || null;
      if (Array.isArray(data.posts)) {
        for (const post of data.posts) {
          let mappedCategoryId;
          let mappedTags;
          try {
            // 映射外键：旧ID → 新ID，无映射则丢弃（nullable）
            mappedCategoryId = post.categoryId
              ? (categoryMap[post.categoryId] || null)
              : null;
            mappedTags = (post.tags || [])
              .filter((t) => tagMap[t.id])
              .map((t) => ({ tag: { connect: { id: tagMap[t.id] } } }));

            const exists = await prisma.post.findUnique({ where: { slug: post.slug } });

            if (exists) {
              postMap[post.id] = exists.id;
              if (conflictStrategy === 'overwrite') {
                // 先清旧标签关联
                await prisma.postTag.deleteMany({ where: { postId: exists.id } });

                await prisma.post.update({
                  where: { id: exists.id },
                  data: {
                    title: post.title,
                    content: typeof post.content === 'object' ? JSON.stringify(post.content) : (post.content || ''),
                    excerpt: post.excerpt || null,
                    cover: post.cover || null,
                    likes: post.likes ?? 0,
                    status: post.status || 'draft',
                    visibility: post.visibility || 'public',
                    categoryId: mappedCategoryId,
                    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
                    tags: { create: mappedTags },
                  },
                });
                report.imported.posts++;
              } else {
                report.skipped.posts++;
              }
            } else {
              const createData = {
                  title: post.title,
                  slug: post.slug,
                  content: typeof post.content === 'object' ? JSON.stringify(post.content) : (post.content || ''),
                  excerpt: post.excerpt || null,
                  cover: post.cover || null,
                  likes: post.likes ?? 0,
                  status: post.status || 'draft',
                  visibility: post.visibility || 'public',
                  categoryId: mappedCategoryId,
                  publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
                  authorId: importAuthorId,
                  tags: { create: mappedTags },
                };
                console.error('[import:create]', JSON.stringify({
                  title: createData.title,
                  slug: createData.slug,
                  categoryId: createData.categoryId,
                  authorId: createData.authorId,
                  tagCount: mappedTags.length,
                  tagIds: mappedTags.map(t=>t.tag.connect.id),
                  contentLen: createData.content.length,
                  excerpt: createData.excerpt,
                  status: createData.status,
                }));
                const created = await prisma.post.create({ data: createData });
              postMap[post.id] = created.id;
              report.imported.posts++;
            }
          } catch (e) {
            console.error('[import:post]', post.title);
            console.error('  categoryId:', post.categoryId, '→ mapped:', mappedCategoryId);
            console.error('  tags:', JSON.stringify(post.tags?.map(t=>t.id)), '→ mapped:', JSON.stringify(mappedTags));
            console.error('  code:', e.code, 'meta:', JSON.stringify(e.meta), 'msg:', e.message);
            report.errors.push(`Post "${post.title}": ${e.message}`);
          }
        }
      }

      // ===== 评论 =====
      if (Array.isArray(data.comments)) {
        for (const comment of data.comments) {
          try {
            const mappedPostId = postMap[comment.postId];
            if (!mappedPostId) {
              report.skipped.comments++;
              report.errors.push(`Comment skipped: post "${comment.postId}" not found in import`);
              continue;
            }
            await prisma.comment.create({
              data: {
                postId: mappedPostId,
                authorName: comment.authorName || 'anonymous',
                email: comment.email || '',
                content: comment.content,
                status: comment.status || 'pending',
                createdAt: comment.createdAt ? new Date(comment.createdAt) : undefined,
              },
            });
            report.imported.comments++;
          } catch (e) {
            report.errors.push(`Comment on "${comment.postId}": ${e.message}`);
          }
        }
      }

      res.json({
        ok: true,
        strategy: conflictStrategy,
        report,
      });
    } catch (err) {
      console.error('[import]', err);
      res.status(400).json({ error: 'Invalid JSON file: ' + err.message });
    }
  });
}

// ===================== 辅助函数 =====================

function escapeYaml(str) {
  return (str || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * 简易 Tiptap JSON → Markdown 转换
 * 支持: heading, paragraph, bulletList, orderedList, blockquote, codeBlock, image, horizontalRule
 */
function tiptapToMarkdown(contentStr) {
  let doc;
  try {
    doc = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr;
  } catch {
    return '\n> (无法解析内容)\n';
  }
  if (!doc || !doc.content) return '\n';

  const lines = [];
  for (const node of doc.content) {
    renderNode(node, lines, 0);
  }
  return '\n' + lines.join('\n') + '\n';
}

function renderNode(node, lines, level) {
  if (!node.content && !node.text && node.type !== 'image' && node.type !== 'horizontalRule') return;

  switch (node.type) {
    case 'heading':
      lines.push('#'.repeat(node.attrs?.level || 1) + ' ' + getText(node));
      break;
    case 'paragraph':
      lines.push(getText(node));
      break;
    case 'bulletList':
      for (const item of (node.content || [])) {
        if (item.type === 'listItem') {
          lines.push('  '.repeat(level) + '- ' + getText(item));
        }
      }
      break;
    case 'orderedList':
      let idx = (node.attrs?.start || 1);
      for (const item of (node.content || [])) {
        if (item.type === 'listItem') {
          lines.push('  '.repeat(level) + (idx++) + '. ' + getText(item));
        }
      }
      break;
    case 'blockquote':
      for (const child of (node.content || [])) {
        const childLines = [];
        renderNode(child, childLines, level);
        for (const l of childLines) lines.push('> ' + l);
      }
      break;
    case 'codeBlock':
      lines.push('```' + (node.attrs?.language || '') + '\n' + getText(node) + '\n```');
      break;
    case 'image':
      lines.push(`![](${node.attrs?.src || ''})`);
      break;
    case 'horizontalRule':
      lines.push('---');
      break;
    default:
      // 递归处理嵌套
      for (const child of (node.content || [])) {
        renderNode(child, lines, level);
      }
  }
}

function collectImages(contentStr, imageSet) {
  try {
    const doc = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr;
    walkNodes(doc);
  } catch {}
  function walkNodes(node) {
    if (!node) return;
    if (node.type === 'image' && node.attrs?.src) {
      if (node.attrs.src.startsWith('/uploads/')) {
        imageSet.add(node.attrs.src);
      }
    }
    if (node.content) {
      for (const child of node.content) walkNodes(child);
    }
  }
}

function getText(node) {
  if (!node.content) return '';
  let result = '';
  for (const child of node.content) {
    if (child.type === 'text') {
      let t = child.text || '';
      if (child.marks) {
        for (const m of child.marks) {
          if (m.type === 'bold') t = `**${t}**`;
          if (m.type === 'italic') t = `*${t}*`;
          if (m.type === 'code') t = `\`${t}\``;
          if (m.type === 'strike') t = `~~${t}~~`;
          if (m.type === 'link') t = `[${t}](${m.attrs?.href || ''})`;
        }
      }
      result += t;
    } else if (child.type === 'hardBreak') {
      result += '\n';
    } else {
      result += getText(child);
    }
  }
  return result.trim();
}

module.exports = { exportJSON, exportMarkdown, importData };