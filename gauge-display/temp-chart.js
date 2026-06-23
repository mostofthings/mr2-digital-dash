import { BLUE, YELLOW, RED } from './colors.js';

const LINE_OPACITY = .9;
const FILL_OPACITY = 0.3;

const chartOptions = {
  animation: false,
  tooltip: {},
  textStyle: {
    color: `${BLUE}b3`,
  },
  legend: {
    data: ['ENGINE', 'OIL', 'IAT'],
    textStyle: {
      color: `${BLUE}b3`,
    },
  },
  xAxis: {
    type: 'time',
    axisLabel: {
      formatter: '{h}:{mm}'
    }
  },
  yAxis: {
    name: 'deg F',
    type: 'value',
    splitLine:{ show: false },
    // axisLine: { show: false },
    axisTick: { show: false },
    // axisLabel: { show: false }
  },
  series: [
    {
      name: 'ENGINE',
      type: 'line',
      smooth: true,
      showSymbol: false,
      itemStyle: {color: YELLOW},
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      areaStyle: {
        opacity: FILL_OPACITY,
        // eslint-disable-next-line no-undef
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: `${YELLOW}ee`
          },
          {
            offset: 1,
            color: `${YELLOW}11`
          }
        ])
      },
      data: []
    }, {
      name: 'OIL',
      type: 'line',
      smooth: true,
      showSymbol: false,
      itemStyle: {color: RED},
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      data: []
    }, {
      name: 'IAT',
      type: 'line',
      smooth: true,
      showSymbol: false,
      itemStyle: {color: BLUE},
      areaStyle: {
        // eslint-disable-next-line no-undef
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: `${BLUE}ee`
          },
          {
            offset: 1,
            color: `${BLUE}11`
          }
        ])
      },
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      data: [],
    }
  ]
};

let tempChart;


export function createTempChart() {
  // eslint-disable-next-line no-undef
  tempChart = echarts.init(document.getElementById('temp-chart'));

  tempChart.setOption(chartOptions);
}

export function updateTempChartData(dates, engineTemps, oilTemps, intakeTemps) {
  const getValueWithDate = (val, index) => [dates[index], val];
  chartOptions.series[0].data = engineTemps.map(getValueWithDate);
  chartOptions.series[1].data = oilTemps.map(getValueWithDate);
  chartOptions.series[2].data = intakeTemps.map(getValueWithDate);
  tempChart.setOption(chartOptions, {
    replaceMerge: ['xAxis', 'yAxis', 'series']
  });
}

