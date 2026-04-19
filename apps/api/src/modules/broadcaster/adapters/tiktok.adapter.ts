import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

@Injectable()
export class TiktokAdapter {
  private readonly logger = new Logger(TiktokAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const videos = media.filter((m) => m.kind === 'short_video');
    if (videos.length === 0) {
      throw new Error('TikTok requires a short video. Text-only broadcasts are not supported.');
    }

    const caption = chunks.map((c) => c.text).join(' ').slice(0, 2200);
    const sentIds: string[] = [];

    for (const video of videos) {
      // TikTok PULL_FROM_URL: TikTok fetches the video from our URL directly.
      // Prefer publicUrl (uploaded to MinIO/object storage) for reliability.
      // Falls back to originalUrl for long-lived CDN URLs.
      const videoUrl = video.publicUrl ?? video.originalUrl;
      const initRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: caption,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        },
      );

      const publishId = initRes.data.data?.publish_id;
      if (!publishId) throw new Error('TikTok did not return a publish_id');

      sentIds.push(publishId);
      this.logger.log(`TikTok video publish initiated: ${publishId}`);
    }

    return sentIds;
  }
}
