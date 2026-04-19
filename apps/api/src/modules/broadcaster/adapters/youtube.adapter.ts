import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

@Injectable()
export class YoutubeAdapter {
  private readonly logger = new Logger(YoutubeAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const videos = media.filter((m) => m.kind === 'short_video' || m.kind === 'long_video');
    if (videos.length === 0) {
      throw new Error(
        'YouTube requires a video file. Text-only broadcasts are not supported.',
      );
    }

    const description = chunks.map((c) => c.text).join('\n\n');
    const title = description.slice(0, 100).split('\n')[0] || 'Untitled';
    const sentIds: string[] = [];

    for (const video of videos) {
      const id = await this.uploadVideo(account.accessToken, video, title, description);
      sentIds.push(id);
    }

    return sentIds;
  }

  private async uploadVideo(
    accessToken: string,
    video: MediaItem,
    title: string,
    description: string,
  ): Promise<string> {
    // Step 1: initiate resumable upload session
    const initRes = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        snippet: { title, description },
        status: { privacyStatus: 'public' },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': video.mimeType,
          'X-Upload-Content-Length': video.buffer.byteLength,
        },
      },
    );

    const uploadUrl = initRes.headers['location'];
    if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

    // Step 2: upload the video bytes
    const uploadRes = await axios.put(uploadUrl, video.buffer, {
      headers: {
        'Content-Type': video.mimeType,
        'Content-Length': video.buffer.byteLength,
      },
    });

    this.logger.log(`YouTube video uploaded: ${uploadRes.data.id}`);
    return uploadRes.data.id;
  }
}
