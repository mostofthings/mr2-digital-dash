export class ValueWidget {
  container;
  textDisplay;
  value = 0;
  isMaxValue;

  constructor(name, parentElement, isMaxValue = false) {

    this.isMaxValue = isMaxValue;
    this.createElement(name, parentElement);
  }

  createElement(name, parentElement) {
    this.container = document.createElement('div');
    this.container.classList.add('container');

    const label = document.createElement('div');
    label.classList.add('max-value-label');
    const topText = document.createElement('p');

    if(this.isMaxValue){
      topText.innerText = 'MAX';
    }
    const bottomText = document.createElement('p');
    bottomText.innerText = name;

    label.append(topText);
    label.append(bottomText);

    this.container.append(label);

    this.textDisplay = document.createElement('span');
    this.container.append(this.textDisplay);

    parentElement.appendChild(this.container);
  }

  update(newValue) {
    if (this.isMaxValue){
      this.value = Math.max(this.value, newValue);
    } else {
      this.value = newValue;
    }
    this.textDisplay.innerText = this.value;
  }
}
