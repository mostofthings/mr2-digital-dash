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

    const roundedValue = Math.floor((newValue * 1.66) - 13.28);
    const highlightedSectorIndex = Math.min(Math.max(roundedValue, 0), 19);

    this.context.fillStyle = '#E53935';
    if (newValue < 15) {
      this.context.fillStyle = '#FFEA00';
    }
    if (newValue < 12) {
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

