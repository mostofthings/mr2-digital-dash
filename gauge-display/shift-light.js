export class ShiftLight {
  rpm;
  startRpm;
  redline;
  isFlashing = false;
  lightElements = [];

  constructor(startRpm = 4000, redline = 7250) {
    this.startRpm = startRpm;
    this.redline = redline;

    this.createDisplay();
  }

  createDisplay() {
    const shiftLightContainer = document.getElementById('shift-light');
    // create and append elements
    for (let i = 0; i < 3; i++) {
      // three colors
      let color;
      if (i === 0) {
        color = 'green';
      } else if (i === 1) {
        color = 'yellow';
      } else {
        color = 'red';
      }
      for (let j = 0; j < 5; j++) {
        // five lights per
        const light = document.createElement('div');
        light.classList.add(color);
        this.lightElements.push(light);
        shiftLightContainer.appendChild(light);
      }
    }
  }

  update(rpm) {
    this.rpm = rpm;
    const percentFull = (rpm - this.startRpm) / (this.redline - this.startRpm);
    if (percentFull >= 1 && !this.isFlashing) {
      // flash boy
      this.isFlashing = true;
      this.lightElements.forEach((element) => {
        element.classList.add('flashing');
        element.classList.remove('illuminated');
      });
      return;
    } else if (percentFull < 1) {
      if (this.isFlashing) {
        this.lightElements.forEach((element) => element.classList.remove('flashing'));
        this.isFlashing = false;
      }
      const numberOfLightsIlluminated = Math.round(15 * percentFull);

      this.lightElements.forEach((element, index) => {
        if (index <= numberOfLightsIlluminated) {
          if (!element.classList.contains('illuminated')) {
            element.classList.add('illuminated');
          }
        } else if (element.classList.contains('illuminated')) {
          element.classList.remove('illuminated');
        }
      });
    }

  }
}
