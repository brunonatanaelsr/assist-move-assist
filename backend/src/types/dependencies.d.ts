declare module 'winston-daily-rotate-file';
declare module 'xss-clean';
declare module 'express-mongo-sanitize';

declare module 'ioredis' {
  export default class Redis {
    constructor(options?: any);
    set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
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
