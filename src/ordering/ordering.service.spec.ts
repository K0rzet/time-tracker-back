import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { mergeOrder, OrderingService } from './ordering.service';
import { ReorderDto } from './reorder.dto';
import { PrismaService } from '../prisma/prisma.service';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

describe('card ordering', () => {
  it('reorders a full collection', () => {
    expect(mergeOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
  it('preserves hidden cards and newly created cards when reordering a subset', () => {
    expect(mergeOrder(['a', 'hidden', 'b', 'new'], ['b', 'a'])).toEqual([
      'b',
      'hidden',
      'a',
      'new',
    ]);
  });
  it.each([[], ['a', 'a'], ['a', 'foreign'], ['deleted']])(
    'rejects invalid order %j',
    (...args) => {
      // Jest spreads array table entries; collect them back into the requested order.
      expect(() => mergeOrder(['a', 'b'], args as string[])).toThrow(
        BadRequestException,
      );
    },
  );
  it('validates array shape, UUIDs and duplicates at the API boundary', async () => {
    for (const ids of [undefined, 'a', [], [a, a], ['bad-id'], [a, 42]]) {
      const dto = Object.assign(new ReorderDto(), { ids });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
    expect(
      await validate(Object.assign(new ReorderDto(), { ids: [a, b] })),
    ).toEqual([]);
  });
  it('rejects IDs outside the owner scope before making updates', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      project: { findMany: jest.fn().mockResolvedValue([{ id: a }]) },
    };
    const prisma = {
      $transaction: (callback) => callback(tx),
    } as unknown as PrismaService;
    await expect(
      new OrderingService(prisma).reorder('owner', 'project', [b]),
    ).rejects.toThrow(BadRequestException);
    expect(tx.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner' } }),
    );
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1); // lock only; no UPDATE
  });
  it('rejects a timer scope belonging to another user', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      project: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      $transaction: (callback) => callback(tx),
    } as unknown as PrismaService;
    await expect(
      new OrderingService(prisma).reorder(
        'owner',
        'timer',
        [a],
        'foreign-project',
      ),
    ).rejects.toThrow('Project not found');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
