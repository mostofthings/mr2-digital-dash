import BarGauge from './bar-gauge.js';
import {O2Gauge} from './o2-gauge.js';
import {MaxValueWidget} from './max-value-widget.js';
import {createTempChart, updateTempChartData} from './temp-chart.js';
import {O2Readout} from './o2-readout.js';
import {defaultStops, iatStops, oilTempStops, waterTempStops} from './gauge-display-stops.js';
import {createBoostChart, updateBoostChartData} from './boost-chart.js';

const LOGGING_MAX = 1000;



window.onload = function () {
  const rollingTimestamp = new Array(LOGGING_MAX).fill(new Date());
  const gaugeContainer = document.getElementById('gauge-container');

  const datasets = {
    boostPressure: getEmptyArray(),
    wideband: getEmptyArray(),
    engineTemp: getEmptyArray(),
    oilTemp: getEmptyArray(),
    iat: getEmptyArray(),
    oilPressure: getEmptyArray(),
  };

  let isRaceMode = false;
  createTempChart();
  createBoostChart();

  const o2Gauge = new O2Gauge(10, 5, 800, 75);
  const boostGauge = new BarGauge(10, 100, 65, 500, -12, 18, defaultStops, './icons/psi.svg', 1);
  const waterTempGauge = new BarGauge(10, 190, 65, 250, 100, 240, waterTempStops, './icons/water-temp.svg');
  const oilPressureGauge = new BarGauge(410, 190, 65, 250, 10, 100, defaultStops, './icons/oil.svg');
  const intakeAirTempGauge = new BarGauge(10, 280, 65, 250, 50, 160, iatStops, './icons/intake-air-temp.svg');
  const oilTempGauge = new BarGauge(410, 280, 65, 250, 100, 240, oilTempStops, './icons/oil-temp.svg');

  const o2Readout = new O2Readout();

  const maxBoostWidget = new MaxValueWidget(11, 365, 47, 135, 'BOOST', 1);
  const maxIntakeAirTempWidget = new MaxValueWidget(155, 365, 47, 135, 'IAT');
  const maxWaterTempWidget = new MaxValueWidget(155, 365, 47, 135, 'TEMP');
  const maxOilTempWidget = new MaxValueWidget(155, 365, 47, 135, 'OIL');


  let increment = 100;
  let boostValue = -12;
  let o2Value = 10;

  let counter = 0;
  const shouldUpdateChart = () => {
    if (counter === 4) {
      counter = 0;
      return true;
    }
    counter++;
    return false;
  };

  // const socket = io.connect('http://localhost:3000');
  // socket.on('sensor', onUpdateGauges);

  function onUpdateGauges(sensorData) {
    const { wideband, boostPressure, waterTemp, oilPressure, intakeAirTemp, oilTemp, timestamp } = sensorData;
    o2Gauge.updateValue(wideband);
    boostGauge.update(boostPressure);
    waterTempGauge.update(waterTemp);
    oilPressureGauge.update(oilPressure);
    intakeAirTempGauge.update(intakeAirTemp);
    oilTempGauge.update(oilTemp);

    o2Readout.update(wideband);

    maxBoostWidget.update(boostPressure);
    maxIntakeAirTempWidget.update(intakeAirTemp);
    maxWaterTempWidget.update(waterTemp);
    maxOilTempWidget.update(oilTemp);

    setConditionalBackground(boostValue, o2Value);

    if (shouldUpdateChart()) {
      addValueToDataset(boostPressure, datasets.boostPressure);
      addValueToDataset(wideband, datasets.wideband);
      addValueToDataset(waterTemp, datasets.engineTemp);
      addValueToDataset(oilTemp, datasets.oilTemp);
      addValueToDataset(intakeAirTemp, datasets.iat);
      addValueToDataset(oilPressure, datasets.oilPressure);

      rollingTimestamp.push(timestamp);
      rollingTimestamp.shift();
      updateTempChartData(rollingTimestamp, datasets.engineTemp, datasets.oilTemp, datasets.iat);

      updateBoostChartData(rollingTimestamp, datasets.boostPressure, datasets.wideband, datasets.oilPressure);
    }

    // TODO: remove
    setTimeout(() => onUpdateGauges(getTestValues()), 100);
  }

  // TODO: remove
  onUpdateGauges(getTestValues());
  function getTestValues() {
    const getBoostValue = () => {
      increment += 1;
      if (increment > 240) {
        increment = 100;
      }
      boostValue += .2;
      if (boostValue > 18) {
        boostValue = -12;
      }
      return boostValue;
    };

    const getO2Value = () => {
      o2Value = Math.random() > .5 ? o2Value -.5 : o2Value + .5;
      if (o2Value > 20) {
        o2Value = 19;
      }
      if (o2Value < 8) {
        o2Value = 9;
      }
      return o2Value;
    };

    return {
      boostPressure: getBoostValue(),
      wideband: getO2Value(),
      waterTemp: increment - 8,
      oilPressure: increment - 90,
      intakeAirTemp: increment -30,
      oilTemp: increment,
      timestamp: new Date(),
    };
  }

  function getEmptyArray() {
    return new Array(LOGGING_MAX).fill(undefined);
  }

  function addValueToDataset(value, dataset) {
    dataset.push(value);
    dataset.shift();
  }

  const maxValueContainer = document.getElementById('max-value-container');
  const raceModeButton = document.createElement('button');
  raceModeButton.id = 'race-mode-button';
  raceModeButton.innerText = 'RACE';
  maxValueContainer.append(raceModeButton);

  raceModeButton.addEventListener('click', toggleRaceMode);
  function toggleRaceMode() {
    isRaceMode = !isRaceMode;
    if (isRaceMode) {
      raceModeButton.classList.add('race-mode');
    } else {
      raceModeButton.classList.remove('race-mode');
    }
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

