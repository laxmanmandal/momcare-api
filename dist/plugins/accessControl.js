"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const path_to_regexp_1 = require("path-to-regexp");
const http_errors_1 = __importDefault(require("http-errors"));
exports.default = (0, fastify_plugin_1.default)(async function (fastify) {
    const configDir = path_1.default.join(__dirname, '..', 'config', 'access-control');
    const rolesFile = path_1.default.join(configDir, 'roles.json');
    const apisFile = path_1.default.join(configDir, 'api.json');
    let rolesMap = {};
    let apiMatchers = [];
    function loadConfig() {
        console.log('[AccessControl] 🔄 Loading configuration...');
        if (!fs_1.default.existsSync(rolesFile) || !fs_1.default.existsSync(apisFile)) {
            rolesMap = {};
            apiMatchers = [];
            console.warn('[AccessControl] ⚠️ Config files not found. Access control will deny by default.');
            return;
        }
        // Load and normalize roles keys (uppercase + trim)
        const rolesRaw = JSON.parse(fs_1.default.readFileSync(rolesFile, 'utf8'));
        rolesMap = rolesRaw.reduce((acc, r) => {
            const key = String(r.roleName).trim().toUpperCase();
            acc[key] = r.policy || [];
            return acc;
        }, {});
        // Load api mappings
        const apis = JSON.parse(fs_1.default.readFileSync(apisFile, 'utf8'));
        apiMatchers = apis.map(a => ({
            apiId: a.apiId,
            policyNames: a.policyName,
            matcher: (0, path_to_regexp_1.match)(a.apiEndpoint, { decode: decodeURIComponent, end: true })
        }));
        console.log(`[AccessControl] ✅ Loaded roles: ${Object.keys(rolesMap).join(', ')}`);
        console.log(`[AccessControl] ✅ Loaded ${apis.length} API mappings.`);
    }
    loadConfig();
    function getRequestPath(req) {
        const rawUrl = (req.raw && req.raw.url) || req.url || '';
        const rawString = String(rawUrl);
        const qIdx = rawString.indexOf('?');
        return qIdx >= 0 ? rawString.substring(0, qIdx) : rawString;
    }
    fastify.decorate('accessControl', {
        reloadConfig: loadConfig,
        /* ───────── Check by policy ───────── */
        check: (requiredPolicy) => {
            return async (req) => {
                if (!req.user) {
                    const err = (0, http_errors_1.default)(401, 'Unauthorized');
                    err.code = 'UNAUTHORIZED';
                    throw err;
                }
                const role = req.user.role?.trim().toUpperCase();
                if (!role) {
                    const err = (0, http_errors_1.default)(403, 'Missing role');
                    err.code = 'ROLE_MISSING';
                    throw err;
                }
                const allowed = rolesMap[role] || [];
                if (!allowed.includes(requiredPolicy)) {
                    const err = (0, http_errors_1.default)(403, 'Access denied');
                    err.code = 'POLICY_DENIED';
                    throw err;
                }
            };
        },
        /* ───────── Check by endpoint ───────── */
        checkByEndpoint: () => {
            return async (req) => {
                if (!req.user) {
                    const err = (0, http_errors_1.default)(401, 'Unauthorized');
                    err.code = 'UNAUTHORIZED';
                    throw err;
                }
                const role = req.user.role?.trim().toUpperCase();
                if (!role) {
                    const err = (0, http_errors_1.default)(403, 'Missing role');
                    err.code = 'ROLE_MISSING';
                    throw err;
                }
                const pathname = getRequestPath(req);
                const mapping = apiMatchers.find(m => m.matcher(pathname));
                if (!mapping) {
                    const err = (0, http_errors_1.default)(403, 'No API policy mapping');
                    err.code = 'API_POLICY_MISSING';
                    throw err;
                }
                const allowed = rolesMap[role] || [];
                const permitted = allowed.some(p => mapping.policyNames.includes(p));
                if (!permitted) {
                    const err = (0, http_errors_1.default)(403, 'Access denied');
                    err.code = 'POLICY_DENIED';
                    throw err;
                }
            };
        }
    });
});
//# sourceMappingURL=accessControl.js.map