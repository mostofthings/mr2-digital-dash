const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const express = require('express');
const portString = process.platform === 'win32' ? 'COM3' : '/dev/ttyACM0';
const shell = require('shelljs');
const port = new SerialPort(portString);
const app = express();
const server = app.listen(3000);
const socket = require('socket.io');
const io = socket(server);

// let lastKnownGoodRPM = 6000;
const SensorType = {
  WaterTemp: 'WT',
  BoostPressure: 'BP',
  WideBand: 'WB',
  OilPressure: 'OP',
  OilTemp: 'OT',
  IntakeAirTemp: 'AT',
};

port.on('close', () => {
  shutdownPi();
});

app.use('/gauge-display', express.static(__dirname + '/gauge-display'));
app.get('/gauge-display', (req, res) => {
  res.sendFile(__dirname + '/gauge-display/index.html');
});
//
// app.get('/change-night', (req, res) => {
//   const brightness = req.query.brightness;
//   res.status(200).end();
//   printToSerial(brightness);
// });
//
// app.get('/master-warn', (req, res) => {
//   const warnState = req.query.warn;
//   res.status(200).end();
//   printToSerial('warn');
// });

const parser = port.pipe(new Readline());
parser.on('data', sendSensorData);

io.sockets.on('connection', (socket) => console.log(socket.id));

const aemFluidTempSensorRawValues = [16, 22, 29, 39, 51, 68, 90, 121, 162, 217, 291, 379, 483, 595, 708, 808, 884, 939];
const correspondingAemFluidTemperatures = [302, 284, 266, 248, 230, 212, 194, 176, 158, 140, 122, 104, 86, 68, 50, 32, 14, -4];

const aemIntakeTempSensorRawValues = [20, 27, 33, 43, 57, 75, 100, 135, 180, 239, 317, 409, 516, 626, 735, 829, 898, 949];
// const aemIntakeTempSensorVoltages = [0.1, 0.13, 0.16, 0.21, 0.28, 0.37, 0.49, 0.66, 0.88, 1.17, 1.55, 2, 2.52, 3.06, 3.59, 4.05, 4.39, 4.64];
const correspondingAemIntakeTemperatures = [302, 284, 266, 248, 230, 212, 194, 176, 158, 140, 122, 104, 86, 68, 50, 32, 14, -4];

function sendSensorData(rawData) {
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

  const allReadings = data.split(',');
  const readingsToSend = {};

  allReadings.forEach(reading => {
    const type = reading.substring(0, 2);
    const valueString = reading.substring(2);
    const value = parseInt(valueString);

    switch (type) {
    case SensorType.WaterTemp:
      if (value < 16) {
        readingsToSend.waterTemp = 302;
      } else if (value <= 884) {
        const unroundedWaterTemp = getTempInF(value, aemFluidTempSensorRawValues, correspondingAemFluidTemperatures);
        readingsToSend.waterTemp = Math.round(unroundedWaterTemp);
      } else if (value > 884) {
        readingsToSend.waterTemp = -4;
      }
      break;
    case SensorType.OilPressure:
      const oilPSI = value * .18 - 18.75;
      if (oilPSI > 0) {
        readingsToSend.oilPressure = Math.round(oilPSI);
      } else {
        readingsToSend.oilPressure = 0;
      }
      break;
    case SensorType.OilTemp:
      if (value < 121) {
        readingsToSend.oilTemp = -4;
      } else if (value <= 974) {
        const unroundedOilTemp = getTempInF(value, aemFluidTempSensorRawValues, correspondingAemFluidTemperatures);
        readingsToSend.oilTemp = Math.round(unroundedOilTemp);
      } else if (value > 974) {
        readingsToSend.oilTemp = 240;
      }
      break;
    case SensorType.WideBand:
      const afr = value * .01161 + 7.312;
      if (afr > 8) {
        readingsToSend.wideband = afr.toFixed(1);
      } else {
        readingsToSend.wideband = 0;
      }
      break;
    case SensorType.BoostPressure:
      // stock 3sgte, should get range between -23 and +26psi, with 2.3293v as 0psi, 477 raw-data crossover point
      const voltage = getVoltageFromRawBytes(value);
      const psi = (voltage - 2.3293) / .1025;
      readingsToSend.boostPressure = psi.toFixed(1);

      // for GM 3 bar map:
      // const boost = value * 0.04451 - 14.45; //convert positive psi
      // readingsToSend.boostPressure = boost.toFixed(1);
      break;
    case SensorType.IntakeAirTemp:
      const iat = getTempInF(value, aemIntakeTempSensorRawValues, correspondingAemIntakeTemperatures);
      readingsToSend.intakeAirTemp = iat;
    // case SensorType.FuelPressure:
    //   const fuelPSI = value;
    //   readingsToSend.fuelPressure = fuelPSI;
    //   break;
    }
  });

  readingsToSend.timestamp = new Date();

  io.emit('sensor', readingsToSend);
}

function getTempInF(value, rawDataSet, correspondingDataSet) {
  const matchingIndex = rawDataSet.findIndex((_, index) => {
    return (value >= rawDataSet[index] && value < rawDataSet[index + 1]);
  });
  if (matchingIndex === -1) {
    return;
  }
  const sensorMax = rawDataSet[matchingIndex + 1];
  const sensorMin = rawDataSet[matchingIndex];
  const sensorRange = sensorMax - sensorMin;
  const differenceToReading = value - sensorMin;

  const percentile = differenceToReading / sensorRange;

  const responseMax = correspondingDataSet[matchingIndex + 1];
  const responseMin = correspondingDataSet[matchingIndex];
  const responseRange = responseMax - responseMin;

  return responseRange * percentile + responseMin;
}

// function printToSerial(message) {
//   port.write(message + '\n', (err) => {
//     if (err) {
//       return console.log('Error on write: ', err.message);
//     }
//   });
// }

function getVoltageFromRawBytes(byteValue) {
  return byteValue / 204.6;
}

function dimDash() {
  shell.exec('gpio -g mode 19 pwm && gpio -g pwm 19 21');
}

function undimDash() {
  shell.exec('gpio -g mode 19 pwm && gpio -g pwm 19 1023');
}

function shutdownPi() {
  shell.exec('/bin/sudo /sbin/shutdown -h now');
}
