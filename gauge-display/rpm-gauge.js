export class RpmGauge {
  gearPosition;
  maxRpm;
  redline;
  gaugeElement;
  gearIndicatorElement;

  constructor(maxRpm, redline) {
    this.maxRpm = maxRpm;
    this.redline = redline;

    this.createElements();
  }

  createElements() {
    this.gaugeElement = document.getElementById('rpm-gauge');
    this.gearIndicatorElement = document.getElementById('gear-indicator');
  }

  update(rpm, gearPosition) {
    this.updateGearPosition(gearPosition);

    this.updateRpm(rpm);
    this.rpm = rpm;
  }

  updateGearPosition(gearPosition) {
    if (this.gearPosition === gearPosition) {
      return;
    }
    this.gearPosition = gearPosition;
    this.gearIndicatorElement.innerText = gearPosition === '0' ? 'N' : gearPosition;
  }

  updateRpm(rpm) {
    const percent = rpm / this.maxRpm * 100;
    this.gaugeElement.style.background = `linear-gradient(to right,  var(--blue)${percent}%, #00000000 ${percent}%)`;
  }
}
