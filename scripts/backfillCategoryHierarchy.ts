import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function lastSegment(path: string) {
  const parts = (path || '').split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

async function main() {
  const cats = await prisma.category.findMany({ orderBy: { path: 'asc' } });
  const byPath = new Map(cats.map(c => [c.path, c]));

  // проставляем slug и parentId
  for (const c of cats) {
    const slug = lastSegment(c.path);
    const idx = c.path.lastIndexOf('/');
    if (idx >= 0) {
      const parentPath = c.path.slice(0, idx);
      const parent = byPath.get(parentPath) || null;
      await prisma.category.update({
        where: { id: c.id },
        data: {
          slug,
          parentId: parent ? parent.id : null,
        },
      });
    } else {
      // корень
      await prisma.category.update({
        where: { id: c.id },
        data: {
          slug,
          parentId: null,
        },
      });
    }
  }

  console.log('Backfill done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());