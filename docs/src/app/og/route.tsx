import { ImageResponse } from 'next/og';
import { OGImage } from '@/lib/og-image';

export const revalidate = false;

export async function GET() {
  return new ImageResponse(
    (
      <OGImage
        title="Type-Safe API Client"
        description="A powerful plugin system for caching, invalidation, retry, polling, and more."
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
