export class O2Readout {
  value = 0;
  readoutElement;
  constructor() {
    const container = document.createElement('div');
    container.id = 'o2-readout';

    const label = document.createElement('div');
    label.classList.add('label');
    label.innerText = 'AFR';

    this.readoutElement = document.createElement('div');
    this.readoutElement.classList.add('readout');

    const gaugeContainer = document.getElementById('gauge-container');
    container.appendChild(label);
    container.appendChild(this.readoutElement);
    gaugeContainer.appendChild(container);
  }

  update(newValue) {
    this.value = newValue;
    this.readoutElement.innerText = newValue.toFixed(2);
  }
}
