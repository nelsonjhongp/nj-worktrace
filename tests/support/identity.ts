import { expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/platform/database/client';
import { auth } from '@/modules/identity/server';
import { domainUsers } from '@/modules/identity';

const PASSWORD = 'password123';

export type TestUser = {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly headers: Headers;
};

/**
 * Crea una identidad real con Better Auth y devuelve sus cabeceras con la cookie de sesión
 * emitida por la propia biblioteca. Nunca se insertan filas en `user`, `account`, `session`
 * ni contraseñas a mano (ADR-008 T8-R1): `domain_users` aparece por el trigger de
 * provisión, igual que en producción.
 */
export async function createAuthenticatedUser(prefix = 'access'): Promise<TestUser> {
  const email = `${prefix}-${randomUUID()}@example.com`;
  const name = `Access ${randomUUID().slice(0, 8)}`;

  const response = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name },
    asResponse: true,
  });

  expect(response.status).toBe(200);

  const setCookie = response.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();

  const headers = new Headers();
  headers.set('cookie', setCookie!.split(';', 1)[0]!);

  const body = (await response.json()) as { user: { id: string } };
  const userId = body.user.id;

  const [domainUser] = await getDb()
    .select({ id: domainUsers.id })
    .from(domainUsers)
    .where(eq(domainUsers.id, userId));

  expect(domainUser).toBeDefined();

  return { userId, email, name, headers };
}

/** Revoca la sesión de un usuario. La cookie sigue existiendo; deja de valer. */
export async function signOut(user: TestUser): Promise<void> {
  await auth.api.signOut({ headers: user.headers });
}

/** Archiva la identidad de dominio sin tocar la sesión de Better Auth. */
export async function archiveDomainUser(userId: string): Promise<void> {
  await getDb()
    .update(domainUsers)
    .set({ archivedAt: new Date() })
    .where(eq(domainUsers.id, userId));
}

/** Borra la fila de `domain_users`, reproduciendo el invariante roto de `R-14`. */
export async function deleteDomainUser(userId: string): Promise<void> {
  await getDb().delete(domainUsers).where(eq(domainUsers.id, userId));
}
