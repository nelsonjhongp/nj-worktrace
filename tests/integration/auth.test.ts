import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getDb } from '@/platform/database/client';
import { auth } from '@/modules/identity/server';
import { authUser, authAccount, authSession } from '@/modules/identity/database-schema';
import { domainUsers } from '@/modules/identity';
import { eq, inArray } from 'drizzle-orm';
import { Pool } from 'pg';

describe('Better Auth Integration', () => {
  const db = getDb();
  const testPassword = 'password123';
  const ownedEmails = [
    'registration-success@example.com',
    'domain-shape@example.com',
    'duplicate@example.com',
    'short-password@example.com',
    'login-suite@example.com',
    'session-suite@example.com',
    'rollback-account@example.com',
    'rollback-session@example.com',
  ];

  beforeAll(async () => {
    const existingUsers = await db
      .select({ id: authUser.id })
      .from(authUser)
      .where(inArray(authUser.email, ownedEmails));
    const existingUserIds = existingUsers.map(({ id }) => id);

    if (existingUserIds.length > 0) {
      await db.delete(authUser).where(inArray(authUser.id, existingUserIds));
      await db.delete(domainUsers).where(inArray(domainUsers.id, existingUserIds));
    }
  });

  async function signUp(email: string, name: string) {
    return auth.api.signUpEmail({
      body: {
        email,
        password: testPassword,
        name,
      },
    });
  }

  describe('Registro', () => {
    it('crea usuario correctamente con todos los registros requeridos', async () => {
      const email = 'registration-success@example.com';
      const name = 'Registration Success';
      const result = await signUp(email, name);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe(name);
      expect(result.token).toBeDefined();

      // Verificar que se creó el usuario en la base de datos
      const [user] = await db
        .select()
        .from(authUser)
        .where(eq(authUser.email, email));

      expect(user).toBeDefined();
      expect(user!.name).toBe(name);

      // Verificar que se creó la cuenta credential
      const [account] = await db
        .select()
        .from(authAccount)
        .where(eq(authAccount.userId, user!.id));

      expect(account).toBeDefined();
      expect(account!.providerId).toBe('credential');
      // accountId es un identificador único, no el email
      expect(account!.accountId).toBeDefined();

      // Verificar que se creó la sesión
      const [session] = await db
        .select()
        .from(authSession)
        .where(eq(authSession.userId, user!.id));

      expect(session).toBeDefined();
      expect(session!.token).toBeDefined();

      // Verificar que se creó domain_users con el mismo ID
      const [domainUser] = await db
        .select()
        .from(domainUsers)
        .where(eq(domainUsers.id, user!.id));

      expect(domainUser).toBeDefined();
      expect(domainUser!.id).toBe(user!.id);
      expect(domainUser!.displayName).toBe(name);
    });

    it('domain_users no almacena email', async () => {
      const email = 'domain-shape@example.com';
      const name = 'Domain Shape';
      const result = await signUp(email, name);

      const [user] = await db
        .select()
        .from(authUser)
        .where(eq(authUser.id, result.user.id));

      const [domainUser] = await db
        .select()
        .from(domainUsers)
        .where(eq(domainUsers.id, user!.id));

      // domain_users no tiene campo email, solo displayName
      expect(domainUser).toBeDefined();
      expect(domainUser!.displayName).toBe(name);
      // Verificar que no hay campo email en domain_users
      expect('email' in domainUser!).toBe(false);
    });

    it('rechaza email duplicado', async () => {
      const email = 'duplicate@example.com';
      await signUp(email, 'Duplicate Original');

      await expect(
        auth.api.signUpEmail({
          body: {
            email,
            password: 'differentpassword',
            name: 'Different Name',
          },
        })
      ).rejects.toThrow();
    });

    it('rechaza contraseña menor al mínimo', async () => {
      await expect(
        auth.api.signUpEmail({
          body: {
            email: 'short@example.com',
            password: 'short',
            name: 'Short Password',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Login', () => {
    const loginEmail = 'login-suite@example.com';

    beforeAll(async () => {
      await signUp(loginEmail, 'Login Suite');
    });

    it('login correcto genera sesión', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: loginEmail,
          password: testPassword,
        },
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginEmail);
      expect(result.token).toBeDefined();
    });

    it('rechaza contraseña incorrecta', async () => {
      await expect(
        auth.api.signInEmail({
          body: {
            email: loginEmail,
            password: 'wrongpassword',
          },
        })
      ).rejects.toThrow();
    });

    it('rechaza usuario inexistente', async () => {
      await expect(
        auth.api.signInEmail({
          body: {
            email: 'nonexistent@example.com',
            password: testPassword,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Cookies y sesión', () => {
    const sessionEmail = 'session-suite@example.com';
    let sessionCookie: string;

    beforeAll(async () => {
      await signUp(sessionEmail, 'Session Suite');
    });

    beforeEach(async () => {
      const response = await auth.api.signInEmail({
        body: {
          email: sessionEmail,
          password: testPassword,
        },
        asResponse: true,
      });

      expect(response.status).toBe(200);
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      sessionCookie = setCookie!.split(';', 1)[0]!;
    });

    it('getSession devuelve usuario y sesión válidos', async () => {
      const headers = new Headers();
      headers.set('cookie', sessionCookie);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).not.toBeNull();
      expect(session!.user.email).toBe(sessionEmail);
      expect(session!.session.token).toBeDefined();
    });

    it('solicitud sin cookie devuelve sesión nula', async () => {
      const headers = new Headers();

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('logout invalida la sesión', async () => {
      const headers = new Headers();
      headers.set('cookie', sessionCookie);

      await auth.api.signOut({
        headers,
      });

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('después de logout, la cookie anterior no recupera sesión', async () => {
      const headers = new Headers();
      headers.set('cookie', sessionCookie);

      await auth.api.signOut({
        headers,
      });

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });
  });

  describe('Atomicidad', () => {
    const accountEmail = 'rollback-account@example.com';
    const sessionEmail = 'rollback-session@example.com';
    const atomicPassword = 'password123';
    let testPool: Pool;

    beforeAll(async () => {
      testPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
      });

      const connection = await testPool.query<{
        database_name: string;
        schema_name: string;
        search_path: string;
      }>(`
        SELECT
          current_database() AS database_name,
          current_schema() AS schema_name,
          current_setting('search_path') AS search_path
      `);

      expect(connection.rows[0]).toMatchObject({
        database_name: 'nj_worktrace_test',
        schema_name: 'public',
      });
      expect(connection.rows[0]!.search_path).toContain('public');

      const applicationConnection = await db.execute<{
        database_name: string;
        schema_name: string;
      }>(`
        SELECT
          current_database() AS database_name,
          current_schema() AS schema_name
      `);

      expect(applicationConnection.rows[0]).toMatchObject({
        database_name: connection.rows[0]!.database_name,
        schema_name: connection.rows[0]!.schema_name,
      });
    });

    afterAll(async () => {
      await testPool.end();
    });

    async function expectNoSignupRows(email: string, name: string) {
      const counts = await testPool.query<{
        users: string;
        domain_users: string;
        accounts: string;
        sessions: string;
      }>(`
        SELECT
          (SELECT count(*) FROM "user" WHERE email = $1)::text AS users,
          (
            SELECT count(*)
            FROM domain_users
            WHERE display_name = $2
          )::text AS domain_users,
          (
            SELECT count(*)
            FROM account a
            JOIN "user" u ON u.id = a.user_id
            WHERE u.email = $1
          )::text AS accounts,
          (
            SELECT count(*)
            FROM session s
            JOIN "user" u ON u.id = s.user_id
            WHERE u.email = $1
          )::text AS sessions
      `, [email, name]);

      expect(counts.rows[0]).toEqual({
        users: '0',
        domain_users: '0',
        accounts: '0',
        sessions: '0',
      });
    }

    async function expectTriggerInstalled(triggerName: string, functionName: string) {
      const installed = await testPool.query(`
        SELECT t.tgname, p.proname
        FROM pg_trigger t
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE t.tgname = $1
          AND p.proname = $2
          AND NOT t.tgisinternal
      `, [triggerName, functionName]);

      expect(installed.rows).toEqual([{
        tgname: triggerName,
        proname: functionName,
      }]);
    }

    it('rollback completo ante fallo durante account', async () => {
      await testPool.query(`
        CREATE OR REPLACE FUNCTION fail_reserved_auth_account()
        RETURNS trigger AS $$
        BEGIN
          IF NEW.provider_id = 'credential'
             AND EXISTS (
               SELECT 1
               FROM "user" u
               WHERE u.id = NEW.user_id
                 AND u.email = 'rollback-account@example.com'
             )
          THEN
            RAISE EXCEPTION 'forced account insertion failure';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await testPool.query(`
        CREATE TRIGGER fail_reserved_auth_account_trigger
        BEFORE INSERT ON "account"
        FOR EACH ROW
        EXECUTE FUNCTION fail_reserved_auth_account();
      `);

      try {
        await expectTriggerInstalled(
          'fail_reserved_auth_account_trigger',
          'fail_reserved_auth_account',
        );

        await expect(testPool.query('BEGIN')).resolves.toBeDefined();
        try {
          const controlUserId = 'account-trigger-control';
          await testPool.query(`
            INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
            VALUES ($1, 'Account Trigger Control', $2, false, NOW(), NOW())
          `, [controlUserId, accountEmail]);

          await expect(testPool.query(`
            INSERT INTO "account"
              (id, account_id, provider_id, user_id, created_at, updated_at)
            VALUES ('account-trigger-control', $1, 'credential', $1, NOW(), NOW())
          `, [controlUserId])).rejects.toThrow('forced account insertion failure');
        } finally {
          await testPool.query('ROLLBACK');
        }

        await expect(
          auth.api.signUpEmail({
            body: {
              email: accountEmail,
              password: atomicPassword,
              name: 'Rollback Account',
            },
          })
        ).rejects.toThrow();

        await expectNoSignupRows(accountEmail, 'Rollback Account');
      } finally {
        await testPool.query(
          'DROP TRIGGER IF EXISTS fail_reserved_auth_account_trigger ON "account"',
        );
        await testPool.query('DROP FUNCTION IF EXISTS fail_reserved_auth_account()');
      }
    });

    it('rollback completo ante fallo durante session', async () => {
      await testPool.query(`
        CREATE OR REPLACE FUNCTION fail_reserved_auth_session()
        RETURNS trigger AS $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM "user" u
            WHERE u.id = NEW.user_id
              AND u.email = 'rollback-session@example.com'
          )
          THEN
            RAISE EXCEPTION 'forced session insertion failure';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await testPool.query(`
        CREATE TRIGGER fail_reserved_auth_session_trigger
        BEFORE INSERT ON "session"
        FOR EACH ROW
        EXECUTE FUNCTION fail_reserved_auth_session();
      `);

      try {
        await expectTriggerInstalled(
          'fail_reserved_auth_session_trigger',
          'fail_reserved_auth_session',
        );

        await expect(testPool.query('BEGIN')).resolves.toBeDefined();
        try {
          const controlUserId = 'session-trigger-control';
          await testPool.query(`
            INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
            VALUES ($1, 'Session Trigger Control', $2, false, NOW(), NOW())
          `, [controlUserId, sessionEmail]);

          await expect(testPool.query(`
            INSERT INTO "session"
              (id, expires_at, token, created_at, updated_at, user_id)
            VALUES (
              'session-trigger-control',
              NOW() + INTERVAL '1 day',
              'session-trigger-control',
              NOW(),
              NOW(),
              $1
            )
          `, [controlUserId])).rejects.toThrow('forced session insertion failure');
        } finally {
          await testPool.query('ROLLBACK');
        }

        await expect(
          auth.api.signUpEmail({
            body: {
              email: sessionEmail,
              password: atomicPassword,
              name: 'Rollback Session',
            },
          })
        ).rejects.toThrow();

        await expectNoSignupRows(sessionEmail, 'Rollback Session');
      } finally {
        await testPool.query(
          'DROP TRIGGER IF EXISTS fail_reserved_auth_session_trigger ON "session"',
        );
        await testPool.query('DROP FUNCTION IF EXISTS fail_reserved_auth_session()');
      }
    });
  });
});
