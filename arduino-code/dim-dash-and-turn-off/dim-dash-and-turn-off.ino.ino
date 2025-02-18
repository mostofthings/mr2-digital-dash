bool isDashLightOn = false;
String readString;

void setup() {
  Serial.begin(9600);

  //configure pin 2 as an input and enable the internal pull-up resistor
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
}

void loop() {
  // check to see if message received.
    while (Serial.available()) {
    delay(3);  //delay to allow buffer to fill 
    if (Serial.available() >0) {
      char c = Serial.read();  //gets one byte from serial buffer
      readString += c; //makes the string readString
    } 
  }

  if (readString == "received") {
    isDashLightOn = !isDashLightOn;
  }
  
  int value = digitalRead(2);

  if (isDashLightOn == false && value == LOW) {
    // try to turn the lights on
   Serial.println("dash-lights-on");
   delay(500);
  } else if (isDashLightOn == true && value == HIGH) {
   Serial.println("dash-lights-off"); 
   delay(500);
  }

  value = digitalRead(2);

  if (value = LOW) {
    Serial.println("power-disconnected");
  }
  
}
