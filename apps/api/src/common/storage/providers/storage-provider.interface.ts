export interface IStorageProvider {
  /** true once the provider has initialised and is ready to accept uploads */
  readonly isReady: boolean;

  /**
   * Upload a file buffer and return its publicly accessible URL.
   * @param buffer    Raw file bytes
   * @param mimeType  e.g. "image/jpeg", "video/mp4"
   * @param filename  Optional hint used to derive the file extension
   */
  upload(buffer: Buffer, mimeType: string, filename?: string): Promise<string>;
}
