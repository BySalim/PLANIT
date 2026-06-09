import { describe, expect, it, vi } from 'vitest';
import type { JwtService } from '@nestjs/jwt';
import type { Logger } from 'pino';
import { AuthService } from '../../src/auth/auth.service';
import type { PrismaService } from '../../src/common/prisma.service';

/**
 * Unit test de `AuthService.revokeAllSessions` (CLI déco globale, VOEU-002).
 * PrismaService/JwtService/logger mockés — pas de DB. On vérifie le `where`
 * (tous les refresh NON révoqués) et le count remonté.
 */
function buildLogger(): Logger {
  return { warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as Logger;
}

describe('AuthService.revokeAllSessions', () => {
  it('révoque tous les refresh actifs et renvoie le count', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 7 });
    const prisma = { refreshToken: { updateMany } } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as unknown as JwtService, buildLogger());

    const result = await service.revokeAllSessions();

    expect(result).toEqual({ revoked: 7 });
    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = updateMany.mock.calls[0]?.[0] as {
      where: { revokedAt: null };
      data: { revokedAt: Date };
    };
    expect(arg.where).toEqual({ revokedAt: null });
    expect(arg.data.revokedAt).toBeInstanceOf(Date);
  });

  it('renvoie 0 quand aucune session active', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = { refreshToken: { updateMany } } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as unknown as JwtService, buildLogger());

    expect(await service.revokeAllSessions()).toEqual({ revoked: 0 });
  });
});
