// utils/roles.ts
import { CurrentUser } from 'fastify';

// Accept either enum-member values or raw string role names
function roleOf(u?: CurrentUser) {
    console.log(u);

    return (u && (u as any).role) ?? '';
}
function entityOf(u?: CurrentUser) {
    return (u && (u as any).entityType) ?? '';
}

export const isOrgAdmin = (u?: CurrentUser) => {
    if (!u) return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === (/*enum*/ (u as any).role)) && (e === 'Organization' || e === (u as any).entityType);
};

export const isChannelAdmin = (u?: CurrentUser) => {
    if (!u) return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'CHANNEL_SUPER_ADMIN' || r === 'CHANNEL_ADMIN') && (e === 'Channel' || e === (u as any).entityType);
};

export const isPartnerAdmin = (u?: CurrentUser) => {
    if (!u) return false;
    const r = roleOf(u);
    const e = entityOf(u);
    return (r === 'PARTNER_SUPER_ADMIN' || r === 'PARTNER_ADMIN') && (e === 'Partner' || e === (u as any).entityType);
};

export const isUser = (u?: CurrentUser) => {
    if (!u) return false;
    const r = roleOf(u);
    return r === 'USER' || r === (u as any).role;
};
