import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { match, MatchFunction } from 'path-to-regexp';
import createHttpError from 'http-errors';

type RolesFileEntry = { roleName: string; roleDesc?: string; policy: string[] };
type ApiFileEntry = { apiId: string; apiEndpoint: string; policyName: string[] };
type ReqUser = { uuid?: string; role?: string; name: string, email?: string, belongsToId: number, createdBy: number };

declare module 'fastify' {
  interface FastifyRequest {
    user?: ReqUser;
  }
  interface FastifyInstance {
    accessControl: {
      check: (policy: string) => (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
      checkByEndpoint: () => (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
      reloadConfig: () => void;
    };
  }
}

export default fp(async function (fastify: FastifyInstance) {
  const configDir = path.join(__dirname, '..', 'config', 'access-control');
  const rolesFile = path.join(configDir, 'roles.json');
  const apisFile = path.join(configDir, 'api.json');

  let rolesMap: Record<string, string[]> = {};
  let apiMatchers: Array<{
    apiId: string;
    policyNames: string[];
    matcher: MatchFunction<Record<string, string>>;
  }> = [];

  function loadConfig() {
    console.log('[AccessControl] 🔄 Loading configuration...');
    if (!fs.existsSync(rolesFile) || !fs.existsSync(apisFile)) {
      rolesMap = {};
      apiMatchers = [];
      console.warn('[AccessControl] ⚠️ Config files not found. Access control will deny by default.');
      return;
    }

    // Load and normalize roles keys (uppercase + trim)
    const rolesRaw = JSON.parse(fs.readFileSync(rolesFile, 'utf8')) as RolesFileEntry[];
    rolesMap = rolesRaw.reduce((acc, r) => {
      const key = String(r.roleName).trim().toUpperCase();
      acc[key] = r.policy || [];
      return acc;
    }, {} as Record<string, string[]>);

    // Load api mappings
    const apis = JSON.parse(fs.readFileSync(apisFile, 'utf8')) as ApiFileEntry[];
    apiMatchers = apis.map(a => ({
      apiId: a.apiId,
      policyNames: a.policyName,
      matcher: match<Record<string, string>>(a.apiEndpoint, { decode: decodeURIComponent, end: true })
    }));

    console.log(`[AccessControl] ✅ Loaded roles: ${Object.keys(rolesMap).join(', ')}`);
    console.log(`[AccessControl] ✅ Loaded ${apis.length} API mappings.`);
  }

  loadConfig();

  function getRequestPath(req: FastifyRequest): string {
    const rawUrl = (req.raw && (req.raw as any).url) || req.url || '';
    const rawString = String(rawUrl);
    const qIdx = rawString.indexOf('?');
    return qIdx >= 0 ? rawString.substring(0, qIdx) : rawString;
  }

  fastify.decorate('accessControl', {

    reloadConfig: loadConfig,

    /* ───────── Check by policy ───────── */
    check: (requiredPolicy: string) => {
      return async (req: FastifyRequest) => {

        if (!req.user) {
          const err = createHttpError(401, 'Unauthorized');
          (err as any).code = 'UNAUTHORIZED';
          throw err;
        }

        const role = req.user.role?.trim().toUpperCase();
        if (!role) {
          const err = createHttpError(403, 'Missing role');
          (err as any).code = 'ROLE_MISSING';
          throw err;
        }

        const allowed = rolesMap[role] || [];
        if (!allowed.includes(requiredPolicy)) {
          const err = createHttpError(403, 'Access denied');
          (err as any).code = 'POLICY_DENIED';
          throw err;
        }
      };
    },

    /* ───────── Check by endpoint ───────── */
    checkByEndpoint: () => {
      return async (req: FastifyRequest) => {

        if (!req.user) {
          const err = createHttpError(401, 'Unauthorized');
          (err as any).code = 'UNAUTHORIZED';
          throw err;
        }

        const role = req.user.role?.trim().toUpperCase();
        if (!role) {
          const err = createHttpError(403, 'Missing role');
          (err as any).code = 'ROLE_MISSING';
          throw err;
        }

        const pathname = getRequestPath(req);

        const mapping = apiMatchers.find(m => m.matcher(pathname));
        if (!mapping) {
          const err = createHttpError(403, 'No API policy mapping');
          (err as any).code = 'API_POLICY_MISSING';
          throw err;
        }

        const allowed = rolesMap[role] || [];
        const permitted = allowed.some(p => mapping.policyNames.includes(p));

        if (!permitted) {
          const err = createHttpError(403, 'Access denied');
          (err as any).code = 'POLICY_DENIED';
          throw err;
        }
      };
    }
  });
});
