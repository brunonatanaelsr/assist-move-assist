import 'ioredis';

declare module 'ioredis' {
  interface Redis {
    scan(
      cursor: number | string,
      ...args: Array<string | number>
    ): Promise<[cursor: string, keys: string[]]>;
  }
}
