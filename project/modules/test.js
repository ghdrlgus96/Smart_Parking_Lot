const gpio = require('node-wiring-pi');

var led = 29;

const test = (count) => {
  if(count == 0)
    gpio.digitalWrite(led, 0);
  else
    gpio.digitalWrite(led, 1);
}

exports.test = test;

gpio.wiringPiSetup();
gpio.pinMode(led, gpio.OUTPUT);
