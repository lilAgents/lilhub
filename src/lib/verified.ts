// Optional "verified" badge on a lilHub page.
//
// Provider-agnostic by design: it defaults to RealHandles (and build-time
// confirms the handle is real against its public API, so nobody can fake the
// badge), but you can point it at another provider by URL. Nothing here is
// locked to RealHandles; it just soft-promotes it as the default.
//
// profile.json shapes accepted:
//   "verified": "davidvkimball"                              // RealHandles handle (shorthand)
//   "verified": { "provider": "realhandles", "handle": "davidvkimball" }
//   "verified": { "provider": "keybase", "url": "https://keybase.io/you", "label": "Keybase" }

export interface VerifiedBadge {
  url: string;
  label: string;
}

type VerifiedConfig = string | { provider?: string; handle?: string; url?: string; label?: string } | undefined;

export async function resolveVerified(profile: Record<string, unknown>): Promise<VerifiedBadge | null> {
  const raw = (profile.verified as VerifiedConfig) ?? (typeof profile.realhandles === 'string' ? { provider: 'realhandles', handle: profile.realhandles } : undefined);
  if (!raw) return null;
  const cfg = typeof raw === 'string' ? { provider: 'realhandles', handle: raw } : raw;
  const provider = (cfg.provider || 'realhandles').toLowerCase();

  if (provider === 'realhandles') {
    const handle = (cfg.handle || '').replace(/^@/, '').trim().toLowerCase();
    if (!handle) return null;
    // Confirm the handle is real so the badge cannot be faked.
    try {
      const res = await fetch(`https://realhandles.com/api/profile?username=${encodeURIComponent(handle)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
    } catch {
      return null; // if RealHandles is unreachable at build, omit the badge
    }
    return { url: `https://realhandles.com/${encodeURIComponent(handle)}`, label: 'Verified on RealHandles' };
  }

  // Any other provider: link out (the visitor verifies there). Not faked by us,
  // just not build-time confirmed the way RealHandles is.
  const url = (cfg.url || '').trim();
  if (!/^https?:\/\//.test(url)) return null;
  const label = cfg.label || provider.charAt(0).toUpperCase() + provider.slice(1);
  return { url, label: `Verified on ${label}` };
}
