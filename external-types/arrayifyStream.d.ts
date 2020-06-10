declare module 'arrayify-stream' {
  import { Readable } from 'stream';

  function arrayifyStream(input: Readable): Promise<any[]>;
  export = arrayifyStream;
}
