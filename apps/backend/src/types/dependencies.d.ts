declare module 'winston-daily-rotate-file';
declare module 'xss-clean';
declare module 'express-mongo-sanitize';

declare module 'ioredis' {
  export default class Redis {
    constructor(options?: any);
    // Common methods used by the app/tests
    set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    get(key: string): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    on(event: string, listener: (...args: any[]) => void): this;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    lrem(key: string, count: number, value: string): Promise<number>;
    lpush(key: string, ...values: string[]): Promise<number>;
    multi(commands?: any[][]): any;
    expire(key: string, seconds: number): Promise<number>;
    quit(): Promise<'OK'>;
  }
}

declare module 'zxcvbn' {
  interface ZXCVBNResult {
    score: number;
    feedback: {
      warning: string;
      suggestions: string[];
    };
  }

  interface ZXCVBN {
    (password: string, userInputs?: string[]): ZXCVBNResult;
  }

  const zxcvbn: ZXCVBN;
  export = zxcvbn;
}
