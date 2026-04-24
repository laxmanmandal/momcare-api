"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUser = exports.isPartnerAdmin = exports.isChannelAdmin = exports.isOrgAdmin = void 0;
// Accept either enum-member values or raw string role names
function roleOf(u) {
    console.log(u);
    return (u && u.role) ?? '';
}
function entityOf(u) {
    return (u && u.entityType) ?? '';
}
const isOrgAdmin = (u) => {
    if (!u)
        return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === ( /*enum*/u.role)) && (e === 'Organization' || e === u.entityType);
};
exports.isOrgAdmin = isOrgAdmin;
const isChannelAdmin = (u) => {
    if (!u)
        return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'CHANNEL_SUPER_ADMIN' || r === 'CHANNEL_ADMIN') && (e === 'Channel' || e === u.entityType);
};
exports.isChannelAdmin = isChannelAdmin;
const isPartnerAdmin = (u) => {
    if (!u)
        return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'PARTNER_SUPER_ADMIN' || r === 'PARTNER_ADMIN') && (e === 'Partner' || e === u.entityType);
};
exports.isPartnerAdmin = isPartnerAdmin;
const isUser = (u) => {
    if (!u)
        return false;
    const r = roleOf(u);
    return r === 'USER' || r === u.role;
};
exports.isUser = isUser;
//# sourceMappingURL=auth.js.map