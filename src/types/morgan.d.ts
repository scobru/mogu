declare module 'morgan' {
  import { Handler } from 'express';

  interface Morgan {
    (format: string | Morgan.FormatFn, options?: Morgan.Options): Handler;
    compile: (format: string) => Morgan.FormatFn;
    token: (name: string, callback: Morgan.TokenCallbackFn) => Morgan;
    format: (name: string, fmt: string | Morgan.FormatFn) => Morgan;
  }

  namespace Morgan {
    export interface FormatFn {
      (tokens: TokenIndexer, req: Request, res: Response): string;
    }

    export interface TokenCallbackFn {
      (req: Request, res: Response, arg?: string): string | undefined;
    }

    export interface Options {
      immediate?: boolean;
      skip?: (req: Request, res: Response) => boolean;
      stream?: { write: (str: string) => void };
    }

    export interface TokenIndexer {
      [key: string]: string;
    }
  }

  const morgan: Morgan;
  export = morgan;
} 