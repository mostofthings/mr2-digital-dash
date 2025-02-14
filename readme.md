# Raspberry Pi Digital Dash

This is a fork of my original project, which is a [Javascript Digital Dash](https://github.com/mostofthings/digital-dash). The goal this time around was a bit different. The intent was to create a small, heads-up-display style dash. This is going into a 1991 Toyota MR2, with a focus more on street driving and occasional grip-track use.

## To display easy to read data in an attractive format.

The final product should, as much as possible, look as good or better than a bank of physical gauges.

## To offer short-term historical data readout.

Last time around this was a primary goal. The first dash is still alive and well inside an e36 drift car. While drifting you have very little time to pay attention to the state of your car while on track, so the focus was more short-term historical data.

There are a few similar views here, but with more of a focus on real-time readout.

## To provide this functionality at minimal cost

Cost was again a consideration, with a Raspberry pi 4, an Arduino Uno, and a [Hyperpixel display](https://shop.pimoroni.com/products/hyperpixel-4?variant=12569485443155) were the bulk of the investment. I started down the path of installing dedicated sensors to read with the Arduino, but decided to tackle this at the same time as a long-term goal of standalone engine management for this car.

## Integrating with canbus

Given the ECU upgrade, I have all the data I need provided via canbus. I was able to achieve this with [a very inexpensive Canable board](https://www.amazon.com/dp/B0CRB8KXWL) and a node socketcan library.

## To allow this project to be replicated by others

Between this and the other project, there's a decent amount of resource here for using Javascript to visualize your car's data.

# Steps to Build

### 1. Install the Display 

Install the Hyperpixel display on the Raspberry pi and follow the instructions [found on their site](https://shop.pimoroni.com/products/hyperpixel-4?variant=12569485443155). There's an additional step for correct screen rotation and touch-screen functionality.

### 2. Configure the canbus reader

[This is a good guide on getting linux/raspberrian to bring up the canbus network interface automatically](https://askubuntu.com/questions/439613/automatically-bring-up-socketcan-network-interfaces-on-boot-can0)

The project is hard-coded to receive and interpret the [Link ECU Generic Dash 2](https://forums.linkecu.com/topic/12141-g4x-can-files/) output data format. If anyone is working with any other canbus data formats, I'd be happy to help.

### 3. Integrate Arduino features (optional)

If you want niceties such as your dash dimming automatically with headligts and graceful shutdown, the scripts already exist in the project to handle these. You'll simply need an arduino sketch that handles the IO. The script got lost in an OS re-install, but when I re-write it soon and include it here in the project.

### 4. System Autostart

I was able to get the node script running on boot [using crontab @restart](https://stackoverflow.com/questions/21542304/how-to-start-a-node-js-app-on-system-boot), and am using [LXDE autostart](https://raspberrypi.stackexchange.com/questions/69204/open-chromium-full-screen-on-start-up) to open the browser fullscreen and navigate to the hosted site
