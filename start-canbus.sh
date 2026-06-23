#!/bin/bash
ip link set can0 type can bitrate 500000 && sudo -S ip link set up can0
