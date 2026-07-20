import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

export async function createBrandOgImage(): Promise<ImageResponse> {
  let fontData: ArrayBuffer | undefined;
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&display=swap',
    ).then((r) => r.text());
    const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
    if (urlMatch?.[1]) {
      const fontRes = await fetch(urlMatch[1]);
      if (fontRes.ok) fontData = await fontRes.arrayBuffer();
    }
  } catch {
    fontData = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '72px 80px',
          background: 'linear-gradient(145deg, #07080f 0%, #0c0e1a 40%, #15102a 70%, #1a0f28 100%)',
          position: 'relative',
          fontFamily: fontData ? 'Orbitron' : 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-40%, -50%)',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            border: '2px solid rgba(124, 58, 237, 0.22)',
            boxShadow: '0 0 80px rgba(124, 58, 237, 0.15), inset 0 0 60px rgba(34, 211, 238, 0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-38%, -48%)',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            border: '1px solid rgba(34, 211, 238, 0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-36%, -46%)',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%)',
            boxShadow: '0 0 100px rgba(239, 68, 68, 0.25)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            maxWidth: '720px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.35em',
              color: '#a78bfa',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            asteroidmap.com
          </span>
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#f8fafc',
              textShadow: '0 0 40px rgba(124, 58, 237, 0.35)',
            }}
          >
            What if an asteroid
          </span>
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#67e8f9',
              textShadow: '0 0 32px rgba(34, 211, 238, 0.35)',
            }}
          >
            hit your city?
          </span>
          <div
            style={{
              marginTop: 28,
              width: 120,
              height: 4,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #7c3aed, #22d3ee)',
            }}
          />
          <span
            style={{
              marginTop: 28,
              fontSize: 28,
              fontWeight: 500,
              color: '#94a3b8',
              lineHeight: 1.35,
              maxWidth: 560,
            }}
          >
            Pick a place. Drop an asteroid. See modeled impact zones on a real map.
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 56,
            right: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            Free · Try the Dino Killer!
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: fontData
        ? [{ name: 'Orbitron', data: fontData, style: 'normal', weight: 700 }]
        : [],
    },
  );
}
