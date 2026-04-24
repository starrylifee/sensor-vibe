/**
 * SerialManager — Web Serial API wrapper for EZMaker Arduino boards.
 * Arduino sends one value per line via Serial.println() at 115200 baud.
 */
class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.active = false;
    this.lastValue = 0;
    this._callbacks = [];
    this._connectCbs = [];
    this._disconnectCbs = [];
    this._pipePromise = null;
    this._sessionToken = 0;
  }

  get supported() {
    return 'serial' in navigator;
  }

  async connect(baudRate = 115200) {
    if (!this.supported) throw new Error('Web Serial API not supported. Use Chrome or Edge.');
    if (this.active || this.port) await this.disconnect();
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate });
    this.active = true;
    const token = ++this._sessionToken;
    this._connectCbs.forEach(cb => cb());
    this._readLoop(token);
  }

  async disconnect() {
    if (!this.active && !this.port && !this.reader) return;

    this.active = false;
    this._sessionToken++;

    const reader = this.reader;
    const port = this.port;
    const pipePromise = this._pipePromise;

    this.reader = null;
    this.port = null;
    this._pipePromise = null;

    try { if (reader) await reader.cancel(); } catch {}
    try { if (reader?.releaseLock) reader.releaseLock(); } catch {}
    try { if (pipePromise) await pipePromise; } catch {}
    try { if (port) await port.close(); } catch {}

    this._disconnectCbs.forEach(cb => cb());
  }

  async _readLoop(token) {
    const decoder = new TextDecoderStream();
    const port = this.port;

    if (!port?.readable) {
      this.active = false;
      return;
    }

    this._pipePromise = port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();
    let buf = '';
    try {
      while (this.active) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split('\n');
        buf = lines.pop(); // keep partial line
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') continue;
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            this.lastValue = num;
            this._callbacks.forEach(cb => cb(num));
          }
        }
      }
    } catch (e) {
      if (this.active) console.warn('Serial read error:', e);
    } finally {
      try { if (this.reader?.releaseLock) this.reader.releaseLock(); } catch {}
      if (this.reader) this.reader = null;
      try { if (this._pipePromise) await this._pipePromise; } catch {}
      this._pipePromise = null;

      if (token !== this._sessionToken) return;

      this.active = false;
      this.port = null;
      this._disconnectCbs.forEach(cb => cb());
    }
  }

  onData(callback)       { this._callbacks.push(callback); return this; }
  onConnect(callback)    { this._connectCbs.push(callback); return this; }
  onDisconnect(callback) { this._disconnectCbs.push(callback); return this; }

  removeOnData(callback) {
    this._callbacks = this._callbacks.filter(cb => cb !== callback);
  }
}

window.SerialManager = SerialManager;
