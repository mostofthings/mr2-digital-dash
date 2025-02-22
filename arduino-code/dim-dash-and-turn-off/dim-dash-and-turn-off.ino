bool isDashLightOn = false;
char receivedChar;
String receivedMessage;
unsigned long timeNow;
bool isDelay = false;
int lowCount = 0;
int highCount = 0;

String warning = "warn";

void setup() {
  Serial.begin(9600);

  //configure pin 2 as an input and enable the internal pull-up resistor
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
}

void loop() {
  while (Serial.available() > 0) {
    delay(2);
    static char endMarker = '\n';
    receivedChar = Serial.read();
    

    if (receivedChar == endMarker) {
      return;
    } else {
      receivedMessage += receivedChar;
    }
  }

  if (receivedMessage == "received") {
    if (isDashLightOn == true) {
      isDashLightOn = false;
    } else {
      isDashLightOn = true;
    }
    isDashLightOn == !isDashLightOn;
  }
  
  int value = digitalRead(2);

  if (value == LOW) {
    lowCount = lowCount + 1;
    highCount = 0;
  } else {
    highCount = highCount + 1;
    lowCount = 0;
  }

  if (isDashLightOn == false && lowCount >= 5) {
   Serial.println("dash-lights-on");
   delay(500);
  } else if (isDashLightOn == true && highCount == HIGH) {
   Serial.println("dash-lights-off"); 
   delay(500);
  }

  value = digitalRead(3);

  if (value == LOW && isDelay == false) {
    isDelay = true;
    timeNow = millis();
  }
  
  if (value == LOW && millis() - timeNow > 3000) {
    Serial.println("power-disconnected");
  } else if (value == HIGH) {
    isDelay = false;
  }

  
  receivedMessage = "";
}
