import BarGauge from './bar-gauge.js';
import {O2Gauge} from './o2-gauge.js';
import {ValueWidget} from './value-widget.js';
import {createTempChart, updateTempChartData} from './temp-chart.js';
import {O2Readout} from './o2-readout.js';
import {defaultStops, iatStops, oilTempStops, waterTempStops} from './gauge-display-stops.js';
import {createBoostChart, updateBoostChartData} from './boost-chart.js';
import {
  ShiftLight
} from './shift-light.js';
import {
  RpmGauge
} from './rpm-gauge.js';

const LOGGING_MAX = 1000;


window.onload = function () {
  const rollingTimestamp = new Array(LOGGING_MAX).fill(new Date());
  const gaugeContainer = document.getElementById('gauge-container');

  const datasets = {
    rpm: getEmptyArray(),
    boost: getEmptyArray(),
    wideband: getEmptyArray(),
    engineTemp: getEmptyArray(),
    oilTemp: getEmptyArray(),
    iat: getEmptyArray(),
    oilPressure: getEmptyArray(),
  };

  let isRaceMode = false;
  createTempChart();
  createBoostChart();

  //** Main display **//
  const o2Gauge = new O2Gauge(10, 5, 800, 75);
  const boostGauge = new BarGauge(10, 100, 65, 500, -12, 18, defaultStops, './icons/psi.svg');
  const waterTempGauge = new BarGauge(10, 190, 65, 250, 100, 240, waterTempStops, './icons/water-temp.svg');
  const oilPressureGauge = new BarGauge(410, 190, 65, 250, 10, 100, defaultStops, './icons/oil.svg');
  const intakeAirTempGauge = new BarGauge(10, 280, 65, 250, 50, 160, iatStops, './icons/intake-air-temp.svg');
  const oilTempGauge = new BarGauge(410, 280, 65, 250, 100, 240, oilTempStops, './icons/oil-temp.svg');

  const o2Readout = new O2Readout();

  const maxValueContainer = document.getElementById('max-value-container');
  const maxBoostWidget = new ValueWidget('BOOST', maxValueContainer, true);
  const maxIntakeAirTempWidget = new ValueWidget( 'IAT', maxValueContainer, true);
  const maxWaterTempWidget = new ValueWidget( 'TEMP', maxValueContainer, true);
  const maxOilTempWidget = new ValueWidget( 'OILT', maxValueContainer, true);
  const maxOilPresure = new ValueWidget('OILP', maxValueContainer, true);
  const standardFuelPressure = new ValueWidget('FUEL', maxValueContainer);

  //** Race display **//
  const shiftLight = new ShiftLight(5000, 7250);
  const tachometer = new RpmGauge(7500, 7250);

  const valueContainer = document.getElementById('value-container');
  const intakeAirTempWidget = new ValueWidget( 'IAT', valueContainer);
  const waterTempWidget = new ValueWidget('TEMP', valueContainer );
  const oilTempWidget = new ValueWidget( 'OILT', valueContainer);
  const oilPressureWidget = new ValueWidget( 'OILP', valueContainer);
  const fuelPressureWidget = new ValueWidget('FUEL', valueContainer);
  const boostWidget = new ValueWidget('BOOST', valueContainer);

  let counter = 0;
  const shouldUpdateChart = () => {
    if (counter === 4) {
      counter = 0;
      return true;
    }
    counter++;
    return false;
  };

  const socket = io.connect('http://localhost:3000');
  socket.on('sensor', onUpdateGauges);

  function onUpdateGauges(sensorData) {
    const { boost, coolantTemp, oilTemp, voltage, iat, oilPressure, fuelPressure, tps, lambda, rpm, knockLevel, faultCode, gearPosition, timestamp } = sensorData;
    o2Gauge.updateValue(lambda);
    boostGauge.update(boost);
    waterTempGauge.update(coolantTemp);
    oilPressureGauge.update(oilPressure);
    intakeAirTempGauge.update(iat);
    oilTempGauge.update(oilTemp);
    standardFuelPressure.update(fuelPressure);

    o2Readout.update(lambda);

    maxBoostWidget.update(boost);
    maxIntakeAirTempWidget.update(iat);
    maxWaterTempWidget.update(coolantTemp);
    maxOilTempWidget.update(oilTemp);
    maxOilPresure.update(oilPressure);

    shiftLight.update(rpm);
    tachometer.update(rpm, gearPosition);

    boostWidget.update(boost);
    intakeAirTempWidget.update(iat);
    waterTempWidget.update(coolantTemp);
    oilPressureWidget.update(oilPressure);
    oilTempWidget.update(oilTemp);
    fuelPressureWidget.update(fuelPressure);

    setConditionalBackground(boost, lambda);

    if (shouldUpdateChart()) {
      addValueToDataset(boost, datasets.boost);
      addValueToDataset(lambda, datasets.wideband);
      addValueToDataset(coolantTemp, datasets.engineTemp);
      addValueToDataset(oilTemp, datasets.oilTemp);
      addValueToDataset(iat, datasets.iat);
      addValueToDataset(oilPressure, datasets.oilPressure);

      rollingTimestamp.push(timestamp);
      rollingTimestamp.shift();
      updateTempChartData(rollingTimestamp, datasets.engineTemp, datasets.oilTemp, datasets.iat);

      updateBoostChartData(rollingTimestamp, datasets.boost, datasets.wideband, datasets.oilPressure);
    }
  }

  function getEmptyArray() {
    return new Array(LOGGING_MAX).fill(undefined);
  }

  function addValueToDataset(value, dataset) {
    dataset.push(value);
    dataset.shift();
  }



  function setConditionalBackground(boostValue, o2Value) {
    if (Math.sign(boostValue) !== 1) {
      gaugeContainer.classList.remove('red', 'yellow', 'green');
      return;
    }
    let colorClass = '';
    if (o2Value < 12 && !isRaceMode) {
      colorClass = 'green';
    } else if (o2Value >= 12 && o2Value < 15) {
      colorClass = 'yellow';
    } else if (o2Value >= 15) {
      colorClass = 'red';
    }
    if (colorClass && !gaugeContainer.classList.contains(colorClass)) {
      gaugeContainer.classList.remove('red', 'yellow', 'green');
      gaugeContainer.classList.add(colorClass);
    }
  }
};

