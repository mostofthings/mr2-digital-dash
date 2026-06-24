import {BLUE, YELLOW, PURPLE, GREEN} from './colors.js';

const LINE_OPACITY = .9;
// const FILL_OPACITY = 0.3;

const chartOptions = {
  animation: false,
  tooltip: {},
  textStyle: {
    color: `${BLUE}b3`,
  },
  legend: {
    data: ['BOOST', 'AFR', 'OIL'],
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
  yAxis: [ {
    name: 'AFR',
    type: 'value',
    align: 'left',
    min: 8,
    max: 20,
    splitLine:{ show: false },
    // axisLine: { show: false },
    axisTick: { show: false },
    // axisLabel: { show: false }
  }, {
    name: '',
    type: 'value',
    splitLine:{ show: false },
    // axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false }
  }, {
    name: 'Boost PSI',
    type: 'value',
    align: 'right',
    splitLine:{ show: false },
    // axisLine: { show: false },
    axisTick: { show: false },
    // axisLabel: { show: false }
  },],
  series: [
    {
      name: 'BOOST',
      type: 'line',
      yAxisIndex: 2,
      smooth: true,
      showSymbol: false,
      itemStyle: {color: GREEN},
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      areaStyle: {
        // eslint-disable-next-line no-undef
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          {
            offset: 0,
            color: `${GREEN}ee`
          },
          {
            offset: 0,
            color: `${GREEN}11`
          },
          {
            offset: 1,
            color: `${GREEN}ee`
          }
        ])
      },
      data: []
    }, {
      name: 'AFR',
      smooth: true,
      type: 'line',
      yAxisIndex: 0,
      showSymbol: false,
      itemStyle: {color: PURPLE},
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      data: []
    }, {
      name: 'OIL',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      showSymbol: false,
      itemStyle: {color: YELLOW},
      lineStyle: {width: 4, opacity: LINE_OPACITY},
      data: [],
    }
  ]
};

let tempChart;


export function createBoostChart() {
  // eslint-disable-next-line no-undef
  tempChart = echarts.init(document.getElementById('boost-chart'));

  tempChart.setOption(chartOptions);
}

export function updateBoostChartData(dates, boost, wideband, oilPressure) {
  const getValueWithDate = (val, index) => [dates[index], val];

  const centerPoint = getDatasetCenterPoint(boost);
  chartOptions.series[0].areaStyle.color.colorStops[1].offset = isFinite(centerPoint) ? centerPoint : 0;

  chartOptions.series[0].data = boost.map(getValueWithDate);
  chartOptions.series[1].data = wideband.map(getValueWithDate);
  chartOptions.series[2].data = oilPressure.map(getValueWithDate);
  tempChart.setOption(chartOptions, {
    replaceMerge: ['xAxis', 'yAxis', 'series']
  });
}

function getDatasetCenterPoint(dataset) {
  const { max, min } = getDataMaxAndMin(dataset);
  let center = 0;
  const allNegative = Math.max(min, max) <= 0;
  const allPositive = Math.min(min, max) >= 0;
  if (!allNegative && !allPositive) {
    center = 1 - ((0 - min)) / (max - min);
  }
  return center;
}

function getDataMaxAndMin(dataset) {
  const filteredData = dataset.filter((datum) => datum !== undefined);
  return {
    max: Math.max(...filteredData) ?? 0,
    min: Math.min(...filteredData) ?? 0,
  };
}

