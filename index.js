const can = require('socketcan');
const struct = require('@binary-files/structjs');
const Struct = struct.Struct;
const shell = require('shelljs');

const {SerialPort} = require('serialport');
const {ReadlineParser} = require('@serialport/parser-readline');
const express = require('express');
const portString = process.platform === 'win32' ? 'COM3' : '/dev/ttyACM0';
const port = new SerialPort({path: portString, baudRate: 9600});
const app = express();
const server = app.listen(3000);
const socket = require('socket.io');
const io = socket(server);

//** Hosting **//
app.use('/gauge-display', express.static(__dirname + '/gauge-display'));
app.get('/gauge-display', (req, res) => {
  res.sendFile(__dirname + '/gauge-display/index.html');
});

io.sockets.on('connection', (socket) => console.log(socket.id));

main();

async function main() {
  const channel = can.createRawChannel('can0');

  channel.addListener('onMessage', handleRawMessages);
  channel.addListener('onStopped', (err) => console.log(err));
  channel.start();
}

function handleRawMessages(message) {
  try {
    const id = message.id;
    switch (id) {
    case 1:
      parseFrame1(message.data);
      break;
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
  } catch (e) {
    console.error(e);
  }
}

// store raw, offset values;
let rpm = 0;
let boost = 0;
let tps = 0;
let coolantTemp = 0;
let iat = 0;
let voltage = 0;
let oilTemp = 0;
let oilPressure = 0;
let fuelPressure = 0;
let lambda = 0;
let knockLevel = 0;
let faultCode = 0;
let gearPosition = 0;

const rpmAndBoostStruct = new Struct(
  Struct.Uint16('rpm'),
  Struct.Uint16('boost'),
  Struct.Uint8('coolantTemp'),
  Struct.Uint8('iat'),
  Struct.Uint8('voltage'),
  Struct.Uint8('oilTemp')
);
function parseFrame1(data) {
  const object = rpmAndBoostStruct.createObject(data.buffer, 0);
  rpm = object.rpm;
  boost = object.boost - 100;
  coolantTemp = object.coolantTemp - 50;
  iat = object.iat - 50;
  voltage = object.voltage * 0.1;
  oilTemp = object.oilTemp - 50;
}

const tpsStruct = new Struct(
  Struct.Uint16('tps'),
  Struct.Uint16('ignitionAngle'),
  Struct.Uint8('wheelSpeed'),
  Struct.Uint8('oilPressure'),
  Struct.Uint8('fuelPressure'),
  Struct.Uint8('ecuTemp'),
);
function parseFrame2(data) {
  const object = tpsStruct.createObject(data.buffer, 0);
  tps = object.tps * 0.1;
  oilPressure = object.oilPressure * 10;
  fuelPressure = object.fuelPressure * 10;
}

const lambdaStruct = new Struct(
  Struct.Uint16('lambda')
);
function parseFrame3(data) {
  const object = lambdaStruct.createObject(data.buffer, 0,);
  lambda = object.lambda * 0.001;
}

const knockStruct = new Struct(
  Struct.Uint8('gearPosition'),
  Struct.Uint8('fuelCut'),
  Struct.Uint8('ignitionCut'),
  Struct.Uint16('injectorPulseWidth'),
  Struct.Uint8('faultCode'),
  Struct.Uint16('knockLevel'),
);
function parseFrame4(data) {
  const object = knockStruct.createObject(data.buffer, 0);
  gearPosition = object.gearPosition;
  knockLevel = object.knockLevel * 5;
  faultCode = object.faultCode;
}

function sendWebsocketData() {
  try {
    const data = {
      rpm: rpm.toString(),
      boost: (kpaToPsi(boost)).toFixed(1),
      iat: (celciusToDegF(iat)).toFixed(),
      voltage: (voltage).toFixed(1),
      oilTemp: (celciusToDegF(oilTemp)).toFixed(),
      coolantTemp: (celciusToDegF(coolantTemp)).toFixed(),
      oilPressure: kpaToPsi(oilPressure).toFixed(),
      fuelPressure: kpaToPsi(fuelPressure).toFixed(),
      tps: tps.toFixed(1),
      lambda: lambda.toFixed(2),
      knockLevel: knockLevel.toString(),
      faultCode: faultCode.toString(),
      gearPosition: gearPosition.toString(),
      timestamp: new Date(),
    };

    io.emit('sensor', data);
  } catch (e) {
    console.error(e);
  }
}
setInterval(sendWebsocketData, 100);

//** Math **//
function celciusToDegF(celcius) {
  return celcius * 9 / 5 + 32;
}

function kpaToPsi(kpa) {
  return kpa * 0.145;
}

//** Arduino Communication **//
const parser = port.pipe(new ReadlineParser());
parser.on('data', onReceiveArduinoMessage);

function onReceiveArduinoMessage(rawData) {
  const data = rawData.trim();
  switch (data) {
  case 'dash-lights-on':
    dimDash();
    return;
  case 'dash-lights-off':
    undimDash();
    return;
  case 'power-disconnected':
    shutdownPi();
    return;
  }
}

//** Shell **//
function dimDash() {
  shell.exec('gpio -g mode 19 pwm && gpio -g pwm 19 21');
  port.write('received');
}

function undimDash() {
  shell.exec('gpio -g mode 19 pwm && gpio -g pwm 19 1023');
  port.write('received');
}

function shutdownPi() {
  shell.exec('/bin/sudo /sbin/shutdown -h now');
}
