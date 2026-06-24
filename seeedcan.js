'use strict';

/**
 * seeed-can.js
 * EventEmitter-based CAN reader for Seeed Studio USB-CAN Analyzer v8 (CH340)
 *
 * Usage:
 *   const SeedCan = require('./seeed-can');
 *   const bus = new SeedCan('/dev/ttyUSB0', { bitrate: 500 });
 *   bus.on('frame', (frame) => console.log(frame));
 *   bus.on('error', (err) => console.error(err));
 *   bus.open();
 *
 * Frame object emitted:
 *   {
 *     id: number,        // CAN message ID (decimal)
 *     ext: boolean,      // true = 29-bit extended, false = 11-bit standard
 *     rtr: boolean,      // true = remote frame
 *     dlc: number,       // data length 0-8
 *     data: Buffer       // payload bytes
 *   }
 *
 * Dependencies:  npm install serialport
 */

const { EventEmitter } = require('events');
const { SerialPort } = require('serialport');

// Baud rate byte values per the Seeed protocol spec
const BITRATE_MAP = {
  1000: 0x01,
  800:  0x02,
  500:  0x03,
  400:  0x04,
  250:  0x05,
  200:  0x06,
  125:  0x07,
  100:  0x08,
  50:   0x09,
  20:   0x0A,
  10:   0x0B,
  5:    0x0C,
};

// Operation modes
const MODE_NORMAL      = 0x00;
const MODE_LOOPBACK    = 0x01;
const MODE_SILENT      = 0x02; // listen-only, safest for monitoring

// Frame markers
const FRAME_START = 0xAA;
const FRAME_END   = 0x55;

class SeedCan extends EventEmitter {
  /**
   * @param {string} port    - Serial port path, e.g. '/dev/ttyUSB0'
   * @param {object} opts
   * @param {number}  opts.bitrate       - CAN bitrate in kbps (default 500)
   * @param {boolean} opts.silent        - Listen-only mode (default true, safest)
   * @param {boolean} opts.reconnect     - Auto-reconnect on disconnect (default true)
   * @param {number}  opts.retryDelay    - Initial retry delay in ms (default 1000)
   * @param {number}  opts.retryMax      - Max retry delay in ms after backoff (default 10000)
   * @param {number}  opts.maxRetries    - Max attempts before giving up; 0 = forever (default 0)
   */
  constructor(port, opts = {}) {
    super();
    this._portPath   = port;
    this._bitrate    = opts.bitrate    ?? 500;
    this._silent     = opts.silent     ?? true;
    this._reconnect  = opts.reconnect  ?? true;
    this._retryDelay = opts.retryDelay ?? 1000;
    this._retryMax   = opts.retryMax   ?? 10000;
    this._maxRetries = opts.maxRetries ?? 0;

    this._port         = null;
    this._buf          = Buffer.alloc(0);
    this._opened       = false;
    this._closing      = false;   // true when close() was called intentionally
    this._retryCount   = 0;
    this._retryTimer   = null;
    this._currentDelay = this._retryDelay;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open() {
    if (this._opened) return;
    this._closing = false;
    this._retryCount = 0;
    this._currentDelay = this._retryDelay;
    this._connect();
  }

  close() {
    this._closing = true;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    if (this._port && this._port.isOpen) {
      this._port.close();
    }
  }

  // -------------------------------------------------------------------------
  // Internal connect / reconnect
  // -------------------------------------------------------------------------

  _connect() {
    const bitrateVal = BITRATE_MAP[this._bitrate];
    if (!bitrateVal) {
      throw new Error(`Unsupported bitrate: ${this._bitrate}. Valid: ${Object.keys(BITRATE_MAP).join(', ')} kbps`);
    }

    // Clean up any previous port instance
    if (this._port) {
      this._port.removeAllListeners();
      this._port = null;
    }
    this._buf = Buffer.alloc(0);

    this._port = new SerialPort({
      path: this._portPath,
      baudRate: 2000000,
      autoOpen: false,
    });

    this._port.on('error', (err) => {
      // Surface the error but let the close handler drive reconnect
      this.emit('error', err);
    });

    this._port.on('close', () => {
      this._opened = false;
      this._buf = Buffer.alloc(0);

      if (this._closing) {
        // Intentional close — stop here
        this.emit('close');
        return;
      }

      this.emit('disconnect');
      this._scheduleReconnect(bitrateVal);
    });

    this._port.on('data', (chunk) => this._onData(chunk));

    this._port.open((err) => {
      if (err) {
        if (this._closing) return;
        this.emit('error', new Error(`Failed to open ${this._portPath}: ${err.message}`));
        this._scheduleReconnect(bitrateVal);
        return;
      }

      // Successful open
      this._opened = true;
      this._retryCount = 0;
      this._currentDelay = this._retryDelay;

      this._sendInit(bitrateVal);

      if (this._retryCount === 0) {
        this.emit('open');
      } else {
        this.emit('reconnected');
      }
    });
  }

  _scheduleReconnect(bitrateVal) {
    if (this._closing) return;

    this._retryCount++;

    if (this._maxRetries > 0 && this._retryCount > this._maxRetries) {
      this.emit('error', new Error(
        `[seeed-can] Giving up after ${this._maxRetries} reconnect attempts`
      ));
      this.emit('close');
      return;
    }

    this.emit('reconnecting', {
      attempt: this._retryCount,
      delay:   this._currentDelay,
      max:     this._maxRetries || null,
    });

    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this._connect();
    }, this._currentDelay);

    // Exponential backoff capped at retryMax
    this._currentDelay = Math.min(this._currentDelay * 2, this._retryMax);
  }

  // -------------------------------------------------------------------------
  // Initialization frame
  // -------------------------------------------------------------------------

  _sendInit(bitrateVal) {
    // 20-byte init frame per Seeed protocol spec
    // [0xAA, 0x55, 0x12, baudrate, frameType, filter(4), mask(4), mode, 0x01, zeros(4), checksum]
    const frame = Buffer.alloc(20, 0x00);
    frame[0]  = 0xAA;             // start byte 1
    frame[1]  = 0x55;             // start byte 2
    frame[2]  = 0x12;             // init message ID
    frame[3]  = bitrateVal;       // CAN baud rate
    frame[4]  = 0x01;             // 0x01=STD frame type (transmit only, we're listen-only anyway)
    // bytes 5-8:  filter ID = 0x00000000 (accept all)
    // bytes 9-12: mask ID  = 0x00000000 (accept all)
    frame[13] = this._silent ? MODE_SILENT : MODE_NORMAL;
    frame[14] = 0x01;             // unknown, always 0x01 per spec
    // bytes 15-18: 0x00
    // checksum: sum of bytes 2..18
    let chk = 0;
    for (let i = 2; i <= 18; i++) chk += frame[i];
    frame[19] = chk & 0xFF;

    this._port.write(frame, (err) => {
      if (err) this.emit('error', new Error(`Init write failed: ${err.message}`));
    });
  }

  // -------------------------------------------------------------------------
  // Serial data handler — accumulates bytes and extracts frames
  // -------------------------------------------------------------------------

  _onData(chunk) {
    // Append new bytes to carry-over buffer
    this._buf = Buffer.concat([this._buf, chunk]);

    while (this._buf.length >= 6) {   // minimum valid frame is 6 bytes (STD, 0 data bytes)
      const startIdx = this._buf.indexOf(FRAME_START);

      if (startIdx === -1) {
        // No start byte anywhere — discard everything
        this._buf = Buffer.alloc(0);
        return;
      }

      if (startIdx > 0) {
        // Discard garbage before start byte
        this._buf = this._buf.slice(startIdx);
      }

      if (this._buf.length < 2) return; // need at least 2 bytes to read info byte

      const infoByte = this._buf[1];

      // Detect init/status frames: second byte is 0x55 (they start with 0xAA 0x55)
      // These are control frames, not data frames — skip 20 bytes
      if (infoByte === 0x55) {
        if (this._buf.length < 20) return; // wait for full control frame
        this._buf = this._buf.slice(20);
        continue;
      }

      // Validate info byte: bits 7 and 6 must both be 1 (0xC0 mask)
      if ((infoByte & 0xC0) !== 0xC0) {
        // Not a valid data frame start — skip this byte and re-scan
        this._buf = this._buf.slice(1);
        continue;
      }

      const ext = !!(infoByte & 0x20);  // bit 5: 0=STD 11-bit, 1=EXT 29-bit
      const rtr = !!(infoByte & 0x10);  // bit 4: 0=data, 1=remote
      const dlc =   infoByte & 0x0F;    // bits 3-0: data length

      if (dlc > 8) {
        // Invalid DLC — skip byte
        this._buf = this._buf.slice(1);
        continue;
      }

      // Calculate expected total frame length
      const idBytes   = ext ? 4 : 2;
      const frameLen  = 1 + 1 + idBytes + dlc + 1;  // start + info + id + data + end

      if (this._buf.length < frameLen) return; // wait for more data

      // Verify end byte
      if (this._buf[frameLen - 1] !== FRAME_END) {
        // End byte mismatch — skip start byte and re-scan
        this._buf = this._buf.slice(1);
        continue;
      }

      // Parse message ID (little-endian)
      let id = 0;
      const idOffset = 2;
      for (let i = 0; i < idBytes; i++) {
        id |= (this._buf[idOffset + i] << (8 * i));
      }
      id = id >>> 0; // treat as unsigned

      // Extract data bytes
      const dataOffset = idOffset + idBytes;
      const data = Buffer.from(this._buf.slice(dataOffset, dataOffset + dlc));

      // Emit the parsed frame
      this.emit('frame', { id, ext, rtr, dlc, data });

      // Advance buffer past this frame
      this._buf = this._buf.slice(frameLen);
    }
  }
}

module.exports = SeedCan;


// -------------------------------------------------------------------------
// Quick test — runs if executed directly:  node seeed-can.js
// -------------------------------------------------------------------------
if (require.main === module) {
  const bus = new SeedCan('/dev/ttyUSB0', { bitrate: 500, silent: true });

  bus.on('open',  ()    => console.log('[seeed-can] Port open, listening...'));
  bus.on('close', ()    => console.log('[seeed-can] Port closed'));
  bus.on('error', (err) => console.error('[seeed-can] Error:', err.message));

  bus.on('frame', (f) => {
    const hex = f.data.toString('hex').match(/.{1,2}/g)?.join(' ') ?? '';
    console.log(
      `[${f.ext ? 'EXT' : 'STD'}${f.rtr ? '/RTR' : ''}]`,
      `ID: 0x${f.id.toString(16).toUpperCase().padStart(f.ext ? 8 : 3, '0')}`,
      `DLC: ${f.dlc}`,
      `Data: ${hex || '(none)'}`
    );
  });

  bus.open();

  process.on('SIGINT', () => {
    console.log('\nClosing...');
    bus.close();
    process.exit(0);
  });
}
