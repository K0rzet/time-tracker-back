import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Kind = 'project' | 'category' | 'timer';

// Reorder only the submitted (visible) cards, keeping hidden cards in their slots.
export function mergeOrder(current: string[], requested: string[]): string[] {
  const selected = new Set(requested);
  const available = new Set(current);
  if (
    !requested.length ||
    selected.size !== requested.length ||
    requested.some((id) => !available.has(id))
  ) {
    throw new BadRequestException('Invalid card order');
  }
  let index = 0;
  return current.map((id) => (selected.has(id) ? requested[index++] : id));
}

@Injectable()
export class OrderingService {
  constructor(private readonly prisma: PrismaService) {}

  async reorder(userId: string, kind: Kind, ids: string[], projectId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize simultaneous reorder requests for the same user's collection.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ordering:${userId}:${kind}:${projectId || ''}`}))`;
      if (
        kind === 'timer' &&
        (!projectId ||
          !(await tx.project.findFirst({
            where: { id: projectId, userId },
            select: { id: true },
          })))
      ) {
        throw new NotFoundException('Project not found');
      }
      const ordinaryOrder = [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ] as const;
      const rows =
        kind === 'timer'
          ? await tx.timer.findMany({
              where: { userId, projectId },
              orderBy: [
                { sortOrder: 'asc' },
                { startTime: 'desc' },
                { id: 'asc' },
              ],
              select: { id: true },
            })
          : kind === 'project'
            ? await tx.project.findMany({
                where: { userId },
                orderBy: [...ordinaryOrder],
                select: { id: true },
              })
            : await tx.category.findMany({
                where: { userId },
                orderBy: [...ordinaryOrder],
                select: { id: true },
              });
      const ordered = mergeOrder(
        rows.map((row) => row.id),
        ids,
      );
      // Use one statement for atomic ordering; do not change timer.updatedAt.
      // Negative ranks leave new cards (default 0) at the end of the collection.
      const values = Prisma.join(
        ordered.map(
          (id, index) =>
            Prisma.sql`(${id}, ${index - ordered.length}::integer)`,
        ),
      );
      const table =
        kind === 'timer'
          ? Prisma.sql`"Timer"`
          : kind === 'project'
            ? Prisma.sql`"Project"`
            : Prisma.sql`"Category"`;
      await tx.$executeRaw(
        Prisma.sql`UPDATE ${table} AS card SET "sortOrder" = ordering.rank FROM (VALUES ${values}) AS ordering(id, rank) WHERE card.id = ordering.id AND card."userId" = ${userId}`,
      );
      return { ids: ordered };
    });
  }
}
