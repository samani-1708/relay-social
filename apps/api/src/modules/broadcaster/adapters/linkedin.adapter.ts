import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

@Injectable()
export class LinkedinAdapter {
  private readonly logger = new Logger(LinkedinAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    // LinkedIn doesn't support threads — use first chunk only (already truncated by content-adapter)
    const { accessToken, platformUserId } = account;
    const text = chunks[0].text;
    this.logger.debug(`Posting to LinkedIn as ${platformUserId}, text length: ${text.length}`);

    const images = media.filter((m) => m.kind === 'image').slice(0, 9);

    if (images.length > 0) {
      return this.postWithImages(accessToken, platformUserId, text, images);
    }

    return this.postText(accessToken, platformUserId, text);
  }

  private async postText(accessToken: string, platformUserId: string, text: string): Promise<string[]> {
    try {
    const res = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${platformUserId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      },
    );
    return [res.headers['x-restli-id'] || res.data.id];
    } catch (err: any) {
      this.logger.error(`LinkedIn postText failed — type: ${err?.constructor?.name}, message: ${err?.message}, code: ${err?.code}, status: ${err?.response?.status}, response: ${JSON.stringify(err?.response?.data)}, stack: ${err?.stack?.split('\n')[1]}`);
      throw err;
    }
  }

  private async postWithImages(
    accessToken: string,
    platformUserId: string,
    text: string,
    images: MediaItem[],
  ): Promise<string[]> {
    // Step 1: register + upload each image asset
    const assetUrns = await Promise.all(
      images.map((img) => this.uploadImageAsset(accessToken, platformUserId, img)),
    );

    // Step 2: create the UGC post referencing the assets
    const mediaObjects = assetUrns.map((urn) => ({
      status: 'READY',
      media: urn,
    }));

    const res = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${platformUserId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'IMAGE',
            media: mediaObjects,
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      },
    );
    return [res.headers['x-restli-id'] || res.data.id];
  }

  /** Register an upload slot and PUT the image bytes, returning the asset URN. */
  private async uploadImageAsset(
    accessToken: string,
    platformUserId: string,
    item: MediaItem,
  ): Promise<string> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    };

    // Register
    const registerRes = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${platformUserId}`,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      },
      { headers },
    );

    const uploadMechanism =
      registerRes.data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ];
    const uploadUrl: string = uploadMechanism.uploadUrl;
    const assetUrn: string = registerRes.data.value.asset;

    // Upload binary
    await axios.put(uploadUrl, item.buffer, {
      headers: { 'Content-Type': item.mimeType },
    });

    this.logger.debug(`LinkedIn image asset uploaded: ${assetUrn}`);
    return assetUrn;
  }
}
