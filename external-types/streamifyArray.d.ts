declare module 'streamify-array' {
  import { Readable } from 'stream';

  function streamifyArray(input: any[]): Readable;
  export = streamifyArray;
}
