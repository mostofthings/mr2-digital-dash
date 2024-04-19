import {StopType} from './stop-type.enum.js';

export const waterTempStops = [{
  value: 180,
  type: StopType.Low,
  display: true,
}, {
  value: 190,
  type: StopType.Medium,
}, {
  value: 200,
  type: StopType.High,
  display: true,
}, {
  value: 220,
  type: StopType.High,
}];

export const oilTempStops = [{
  value: 180,
  type: StopType.Low,
}, {
  value: 205,
  type: StopType.Medium,
  display: true,
}, {
  value: 220,
  type: StopType.High,
}, {
  value: 240,
  type: StopType.High,
}];

export const iatStops = [{
  value: 50,
  type: StopType.Low,
}, {
  value: 95,
  type: StopType.Low,
}, {
  value: 120,
  type: StopType.Medium,
  display: true,
}, {
  value: 130,
  type: StopType.High,
}, {
  value: 180,
  type: StopType.High,
}];

export const defaultStops = [{
  value: -200,
  type: StopType.Low
}, {
  value: 300,
  type: StopType.Low
}];
