import { StopType } from './stop-type.enum.js';
import { BLUE, YELLOW, RED } from './colors.js';

export default class BarGauge {
  context;
  minValue;
  maxValue;
  width;
  height;
  currentValue = null;
  textElement;
  stops = [];
  icon;
  decimalPlace;

  constructor(xPosition, yPosition, height, width, minValue, maxValue, stops, icon, decimalPlace = 0) {
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.width = width;
    this.height = height;
    this.stops = stops;
    this.icon = icon;
    this.createCanvas(xPosition, yPosition, height, width);
    this.decimalPlace = decimalPlace;
  }

  createCanvas(xPosition, yPosition, height, width) {
    const parentElement = document.createElement('div');
    parentElement.style.position = 'absolute';
    parentElement.style.top = `${ yPosition }px`;
    parentElement.style.left = `${ xPosition }px`;
    parentElement.style.height = `${ height }px`;

    const textContainer = document.createElement('div');
    const textDisplay = document.createElement('p');
    const iconDisplay = document.createElement('img');
    const canvasParent = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;

    canvas.style.padding = '2px';
    canvas.style.border = `1px solid ${ BLUE }`;

    parentElement.style.display = 'flex';
    parentElement.style.alignItems = 'center';

    canvasParent.style.width = `${ this.width + 10 }px`;
    canvasParent.style.height = `${ this.height * 1.1 }px`;

    textContainer.style.width = '130px';
    textContainer.style.display = 'flex';
    textContainer.style.alignItems = 'center';

    textDisplay.style.textAlign = 'right';
    textDisplay.style.fontSize = this.minValue < 0 ? '28px' : '42px';
    textDisplay.style.flexGrow = '1';

    iconDisplay.src = this.icon;
    iconDisplay.style.height = '45px';
    iconDisplay.style.width = '45px';

    const gaugeContainer = document.getElementById('gauge-container');
    gaugeContainer.appendChild(parentElement);
    parentElement.appendChild(canvasParent);
    canvasParent.appendChild(canvas);
    textContainer.appendChild(textDisplay);
    textContainer.appendChild(iconDisplay);
    parentElement.appendChild(textContainer);
    this.context = canvas.getContext('2d');
    this.textElement = textDisplay;
  }

  update(newValue) {
    this.currentValue = newValue;
    this.drawBar();
    this.displayText();
  }

  drawBar() {
    this.context.clearRect(0,0,this.width, this.height);
    this.context.fillStyle = BLUE;
    this.context.globalAlpha = .3;
    const fillPercent = this.getPercentFromValue(this.currentValue);
    const gradient = this.context.createLinearGradient(0, 0, this.width, 5);
    this.stops.forEach((stop) => {
      const percent = this.getPercentFromValue(stop.value);
      if (stop.display) {
        this.context.fillRect(Math.round(percent * this.width), 0, 2, this.height);
      }
      let colorStop;
      switch (stop.type) {
      case StopType.Low:
        colorStop = BLUE;
        break;
      case StopType.Medium:
        colorStop = YELLOW;
        break;
      case StopType.High:
        colorStop = RED;
        break;
      }
      gradient.addColorStop(percent, colorStop);
    });
    this.context.fillStyle = BLUE;
    this.context.globalAlpha = .7;
    //
    this.context.fillStyle = gradient;
    const zeroPoint = this.barZeroPercentPoint * this.width;
    const valuePoint = Math.round(fillPercent * this.width);
    if (zeroPoint < valuePoint) {
      this.context.fillRect(zeroPoint,0, valuePoint - zeroPoint, this.height);
    } else {
      this.context.fillRect(valuePoint,0, zeroPoint - valuePoint, this.height);
    }
  }

  displayText() {
    this.textElement.innerText = this.currentValue;
  }

  get range() {
    return this.maxValue - this.minValue;
  }

  get barZeroPercentPoint() {
    if (this.minValue >= 0) {
      return 0;
    }
    return this.getPercentFromValue(0);
  }

  getPercentFromValue(value) {
    const percent = value <= this.minValue ? 0 : (value - this.minValue) / this.range;
    return percent < 1 ? percent : 1;
  }
}
