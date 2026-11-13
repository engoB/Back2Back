// Placeholder replaced by the full cinematic engine (see scenes.js).
export class Cinema {
  constructor(ctx) { this.ctx = ctx; this.active = false; }
  play(id, done) { if (done) done(); }
  update() {}
  skip() {}
}
