// Newline-framed messages on a byte stream (the bridge's pipe), with a cap:
// a line that grows past `maxBytes` without ending is an error, never buffered on.

export class LineFramer {
  private chunks: Buffer[] = [];
  private pending = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly onLine: (line: string) => void,
    private readonly onOverflow: () => void,
  ) {}

  push(data: Buffer): void {
    let start = 0;
    for (;;) {
      const at = data.indexOf(0x0a, start);
      if (at < 0) break;
      const part = data.subarray(start, at);
      if (this.pending + part.length > this.maxBytes) {
        this.reset();
        this.onOverflow();
        return;
      }
      this.chunks.push(part);
      let line = Buffer.concat(this.chunks).toString('utf8');
      this.reset();
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.length > 0) this.onLine(line);
      start = at + 1;
    }
    const rest = data.subarray(start);
    if (rest.length === 0) return;
    if (this.pending + rest.length > this.maxBytes) {
      this.reset();
      this.onOverflow();
      return;
    }
    this.chunks.push(Buffer.from(rest)); // copied: the caller may reuse its buffer
    this.pending += rest.length;
  }

  reset(): void {
    this.chunks = [];
    this.pending = 0;
  }
}
