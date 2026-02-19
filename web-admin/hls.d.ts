declare module 'hls.js' {
  export default class Hls {
    static isSupported(): boolean;
    constructor(config?: unknown);
    loadSource(source: string): void;
    attachMedia(media: HTMLVideoElement): void;
    destroy(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }
}

