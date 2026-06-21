'use strict';

// -- SocketCAN (kept for reference, not used while running Seeed adapter) --
// const can = require('socketcan');

const { exec }           = require('child_process');
const struct             = require('@binary-files/structjs');
const { SerialPort }     = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express            = require('express');
const socket             = require('socket.io');
const SeedCan            = require('./seeedcan');

const Struct = struct.Struct;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const HTTP_PORT              = 3000;
const GAUGE_DISPLAY_PATH     = '/gauge-display';
const GAUGE_DISPLAY_DIR      = __dirname + '/gauge-display';
const GAUGE_DISPLAY_INDEX    = __dirname + '/gauge-display/index.html';

const CAN_PORT               = '/dev/ttyUSB0';
const CAN_BITRATE_KBPS       = 500;

const ARDUINO_PORT_PATH      = process.platform === 'win32' ? 'COM3' : '/dev/ttyACM0';
const ARDUINO_BAUD_RATE      = 9600;

const WEBSOCKET_INTERVAL_MS  = 100;

const GPIO_PIN               = 19;
const GPIO_PWM_DIM_VALUE     = 21;
const GPIO_PWM_BRIGHT_VALUE  = 1023;

const ARDUINO_MSG_LIGHTS_ON  = 'dash-lights-on';
const ARDUINO_MSG_LIGHTS_OFF = 'dash-lights-off';
const ARDUINO_MSG_SHUTDOWN   = 'power-disconnected';

// Minimum expected payload bytes per CAN frame ID
const FRAME_MIN_BYTES = {
  1: 8,
  2: 8,
  3: 2,
  4: 7,
};

// ---------------------------------------------------------------------------
// HTTP / WebSocket server
// ---------------------------------------------------------------------------
const app    = express();
const server = app.listen(HTTP_PORT, () => console.log(`[server] Listening on :${HTTP_PORT}`));
const io     = socket(server);

app.use(GAUGE_DISPLAY_PATH, express.static(GAUGE_DISPLAY_DIR));
app.get(GAUGE_DISPLAY_PATH, (_req, res) => {
  res.sendFile(GAUGE_DISPLAY_INDEX);
});

io.sockets.on('connection', (connectedSocket) => {
  console.log('[ws] Client connected:', connectedSocket.id);
});

// ---------------------------------------------------------------------------
// CAN state — raw values, updated by frame parsers
// ---------------------------------------------------------------------------
let rpm          = 0;
let boost        = 0;
let tps          = 0;
let coolantTemp  = 0;
let iat          = 0;
let voltage      = 0;
let oilTemp      = 0;
let oilPressure  = 0;
let fuelPressure = 0;
let lambda       = 0;
let knockLevel   = 0;
let faultCode    = 0;
let gearPosition = 0;

// Gate flag — don't broadcast until at least one valid CAN frame has arrived
let hasData = false;

// ---------------------------------------------------------------------------
// Struct definitions
// ---------------------------------------------------------------------------
const frame2Struct = new Struct(
    Struct.Uint16('engineSpeed'),
    Struct.Uint16('map'),
    Struct.Uint8('ect'),
    Struct.Uint8('iat'),
    Struct.Uint8('ecuVolts'),
    Struct.Uint8('oilTemp')
);

const frame3Struct = new Struct(
    Struct.Uint16('tps'),
    Struct.Uint16('ignitionAngle'),
    Struct.Uint8('wheelSpeed'),
    Struct.Uint8('oilPressure'),
    Struct.Uint8('fuelPressure'),
    Struct.Uint8('ecuTemp')
);

const frame4Struct = new Struct(
    Struct.Uint16('lambda')
);

// ---------------------------------------------------------------------------
// Frame parsers
// ---------------------------------------------------------------------------
function parseFrame2(frameData) {
  const p = frame2Struct.createObject(frameData.buffer, 0);

  return {
    rpm: p.engineSpeed,
    map: p.map,
    coolantTemp: p.ect - 50,
    iat: p.iat - 50,
    voltage: p.ecuVolts * 0.1,
    oilTemp: p.oilTemp - 50,
  };
}

function parseFrame3(frameData) {
  const p = frame3Struct.createObject(frameData.buffer, 0);

  return {
    tps: p.tps * 0.1,
    ignitionAngle: p.ignitionAngle * 0.1,
    wheelSpeed: p.wheelSpeed,
    oilPressure: p.oilPressure * 10,
    fuelPressure: p.fuelPressure * 10,
    ecuTemp: p.ecuTemp - 20,
  };
}

function parseFrame4(frameData) {
  const p = frame4Struct.createObject(frameData.buffer, 0);

  return {
    lambda: p.lambda * 0.001,
  };
}

// SeedCan frame shape: { id, ext, rtr, dlc, data }
// socketcan frame shape was: { id, data } — same field names, drop-in compatible
function handleRawMessages(message) {
  try {
    switch (message.id) {
    case 2:
      parseFrame2(message.data);
      break;
    case 3:
      parseFrame3(message.data);
      break;
    case 4:
      parseFrame4(message.data);
      break;
    }
    hasData = true;
  } catch (error) {
    console.error('[can] Frame parse error:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Seeed CAN adapter
// ---------------------------------------------------------------------------
const canBus = new SeedCan(CAN_PORT, { bitrate: CAN_BITRATE_KBPS, silent: true });

canBus.on('open', () => {
  console.log('[can] Adapter open, listening...');
});

canBus.on('close', () => {
  console.log('[can] Adapter closed');
});

canBus.on('disconnect', () => {
  console.log('[can] Adapter disconnected, will retry...');
});

canBus.on('reconnecting', (reconnectInfo) => {
  console.log(`[can] Reconnect attempt ${reconnectInfo.attempt} in ${reconnectInfo.delay}ms`);
});

canBus.on('reconnected', () => {
  console.log('[can] Adapter reconnected');
});

canBus.on('error', (error) => {
  console.error('[can] Error:', error.message);
});

canBus.on('frame', handleRawMessages);

canBus.open();

// -- SocketCAN equivalent (kept for reference) --
// async function main() {
//   const channel = can.createRawChannel('can0');
//   channel.addListener('onMessage', handleRawMessages);
//   channel.addListener('onStopped', (err) => console.log(err));
//   channel.start();
// }
// main();

// ---------------------------------------------------------------------------
// WebSocket broadcast — 10Hz, gated until first CAN frame arrives
// ---------------------------------------------------------------------------
function sendWebsocketData() {
  if (!hasData) {
    return;
  }
  try {
    io.emit('sensor', {
      rpm:          rpm.toString(),
      boost:        kpaToPsi(boost).toFixed(1),
      iat:          celciusToDegF(iat).toFixed(),
      voltage:      voltage.toFixed(1),
      oilTemp:      celciusToDegF(oilTemp).toFixed(),
      coolantTemp:  celciusToDegF(coolantTemp).toFixed(),
      oilPressure:  kpaToPsi(oilPressure).toFixed(),
      fuelPressure: kpaToPsi(fuelPressure).toFixed(),
      tps:          tps.toFixed(1),
      lambda:       lambda.toFixed(2),
      knockLevel:   knockLevel.toString(),
      faultCode:    faultCode.toString(),
      gearPosition: gearPosition.toString(),
      timestamp:    new Date(),
    });
  } catch (error) {
    console.error('[ws] Broadcast error:', error.message);
  }
}

setInterval(sendWebsocketData, WEBSOCKET_INTERVAL_MS);

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
function celciusToDegF(celcius) {
  return celcius * 9 / 5 + 32;
}

function kpaToPsi(kpa) {
  return kpa * 0.145;
}

// ---------------------------------------------------------------------------
// Arduino serial (GPIO / dash lighting / shutdown)
// ---------------------------------------------------------------------------
const arduinoPort = new SerialPort({
  path:     ARDUINO_PORT_PATH,
  baudRate: ARDUINO_BAUD_RATE,
  autoOpen: false,
});

arduinoPort.on('error', (error) => {
  console.error('[arduino] Port error:', error.message);
});

arduinoPort.on('open', () => {
  console.log('[arduino] Serial open on', ARDUINO_PORT_PATH);
});

arduinoPort.open((error) => {
  if (error) {
    console.warn('[arduino] Could not open serial port:', error.message);
    console.warn('[arduino] GPIO/dash features will be unavailable until reconnected');
  }
});

const arduinoParser = arduinoPort.pipe(new ReadlineParser());
arduinoParser.on('data', onReceiveArduinoMessage);

function onReceiveArduinoMessage(rawData) {
  const message = rawData.trim();
  switch (message) {
  case ARDUINO_MSG_LIGHTS_ON:
    dimDash();
    break;
  case ARDUINO_MSG_LIGHTS_OFF:
    undimDash();
    break;
  case ARDUINO_MSG_SHUTDOWN:
    shutdownPi();
    break;
  }
}

// ---------------------------------------------------------------------------
// GPIO / system commands — async, no event loop blocking
// ---------------------------------------------------------------------------
function runCommand(command, label) {
  exec(command, (error, _stdout, stderr) => {
    if (error) {
      console.error(`[${label}] Command failed:`, stderr || error.message);
    }
  });
}

function dimDash() {
  runCommand(`gpio -g mode ${GPIO_PIN} pwm && gpio -g pwm ${GPIO_PIN} ${GPIO_PWM_DIM_VALUE}`, 'gpio');
  arduinoPort.write('received');
}

function undimDash() {
  runCommand(`gpio -g mode ${GPIO_PIN} pwm && gpio -g pwm ${GPIO_PIN} ${GPIO_PWM_BRIGHT_VALUE}`, 'gpio');
  arduinoPort.write('received');
}

function shutdownPi() {
  console.log('[system] Shutdown command received');
  runCommand('/bin/sudo /sbin/shutdown -h now', 'shutdown');
}
