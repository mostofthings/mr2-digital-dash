export class O2Gauge {
  xPosition;
  yPosition;
  context;
  width;
  height;
  currentValue;

  constructor(xPosition, yPosition, width, height) {
    this.xPosition = xPosition;
    this.yPosition = yPosition;
    this.width = width;
    this.height = height;

    this.createCanvas(xPosition, yPosition, height, width);
  }

  createCanvas(xPosition, yPosition, height, width) {
    const parentElement = document.createElement('div');
    parentElement.style.position = 'absolute';
    parentElement.style.top = `${ yPosition }px`;
    parentElement.style.left = `${ xPosition }px`;
    parentElement.style.height = `${ height }px`;
    parentElement.style.width = `${ width }px`;

    const canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;
    canvas.style.position = 'absolute';
    canvas.style.padding = '2px';
    // canvas.style.border = '1px solid #ff8000';

    parentElement.style.display = 'flex';
    parentElement.style.alignItems = 'center';

    const gaugeContainer = document.getElementById('gauge-container');
    gaugeContainer.appendChild(parentElement);
    parentElement.appendChild(canvas);
    this.context = canvas.getContext('2d');
  }


  updateValue(newValue) {
    this.currentValue = newValue;
    this.context.clearRect(0,0,this.width, this.height);

    for (let i = 0; i < 20; i++) {
      const xPosition = i * (this.width / 20);
      const gradient = this.context.createLinearGradient(xPosition, 0, xPosition + 20, this.height);
      gradient.addColorStop(0, '#303030');
      gradient.addColorStop(.2, '#333333');
      gradient.addColorStop(.7, '#cecece');
      this.context.fillStyle = gradient;
      this.context.fillRect(xPosition, this.startYPosition, 20, this.indicatorHeight);
    }

    // sectors will go from .75 on left to 1.25 on right
    const percent = newValue / 1.29;
    const highlightedSectorIndex = Math.max(Math.min(Math.round(percent * 19), 19), 0);

    this.context.fillStyle = '#E53935';
    if (newValue < 1.02) {
      this.context.fillStyle = '#FFEA00';
    }
    if (newValue < 0.81) {
      this.context.fillStyle = '#00E676';
    }
    this.context.shadowColor = this.context.fillStyle;
    this.context.shadowBlur = 15;
    this.context.fillRect((highlightedSectorIndex * (this.width / 20)) - 5, this.startYPosition - 5, 30, this.indicatorHeight + 10);
    this.context.shadowBlur = 0;
  }

  get indicatorHeight() {
    return this.height * .5;
  }

  get startYPosition() {
    return (this.height - this.indicatorHeight) / 2;
  }
}

