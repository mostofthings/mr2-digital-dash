export class MaxValueWidget {
  height;
  width;
  container;
  textDisplay;
  value = 0;
  decimalPlace;

  constructor(xPosition, yPosition, height, width, name, decimalPlace = 0) {
    this.height = height;
    this.width = width;
    this.decimalPlace = decimalPlace;
    this.createElement(xPosition, yPosition, height, width, name);
  }

  createElement(xPosition, yPosition, height, width, name) {
    this.container = document.createElement('div');
    this.container.classList.add('container');

    const label = document.createElement('div');
    label.classList.add('max-value-label');
    const topText = document.createElement('p');
    topText.innerText = 'MAX';
    const bottomText = document.createElement('p');
    bottomText.innerText = name;

    label.append(topText);
    label.append(bottomText);

    this.container.append(label);

    this.textDisplay = document.createElement('span');
    this.container.append(this.textDisplay);

    const maxValueContainer = document.getElementById('max-value-container');
    maxValueContainer.appendChild(this.container);
  }

  update(newValue) {
    this.value = Math.max(this.value, newValue);
    this.textDisplay.innerText = this.value.toFixed(this.decimalPlace);
  }
}
