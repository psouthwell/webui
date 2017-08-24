import {Injectable} from '@angular/core';

import {WebSocketService} from '../../../services/';
import {BaThemeConfigProvider, colorHelper, layoutPaths} from '../../../theme';


/*
 * Fed to the LineChart ./lineChart.component.ts
 */
export interface LineChartData {
  labels: Date[];
  series: any[];
}


/**
 * For a given chart.. This is each line on the chart.
 */
export interface DataListItem {
  source: string;
  type: string;
  dataset: string;
  jsonResponse?: any;
}


/**
 * One Whole Charts worth of data
 */
export interface ChartConfigData {
  title: string;
  legends: string[];
  dataList: DataListItem[];
}


/**
 * Retunrs back the Series/Data Points for a given chart.
 */
export interface HandleDataFunc {
  handleDataFunc(lineChartData: LineChartData);

}

/**
 * Gets all the existing Collectd/Report RRD Sources with a high level list
 * Of children types: string[] Some charts/Metrics require more data..  And
 * Need to have additional ? optional parameters filled out... Via LineChartService.extendChartConfigData
 */
export interface HandleChartConfigDataFunc {
  handleChartConfigDataFunc(chartConfigData: ChartConfigData[]);
}


@Injectable()
export class LineChartService {

  private cacheConfigData: ChartConfigData[] = [];

  constructor(private _baConfig: BaThemeConfigProvider,
    private _ws: WebSocketService) {}

  public getData(dataHandlerInterface: HandleDataFunc, dataList: any[]) {

    this._ws.call('stats.get_data', [dataList, {}]).subscribe((res) => {
      let linechartData: LineChartData = {
        labels: new Array<Date>(),
        series: new Array<any>()
      }

      dataList.forEach(() => {linechartData.series.push([]);})
      res.data.forEach((item, i) => {
        linechartData.labels.push(
          new Date(res.meta.start * 1000 + i * res.meta.step * 1000));
        for (let x in dataList) {
          linechartData.series[x].push(item[x]);
        }
      });

      dataHandlerInterface.handleDataFunc(linechartData);
    });
  }


  public getChartConfigData(handleChartConfigDataFunc: HandleChartConfigDataFunc) {
    // Use this instead of the below.. TO just spoof the data
    // So you can see what the control looks like with no WS

    //this.getChartConfigDataSpoof(handleChartConfigDataFunc);

    this._ws.call('stats.get_sources').subscribe((res) => {
      this.cacheConfigData = this.chartConfigDataFromWsReponse(res);
      let knownCharts: ChartConfigData[] = this.getKnownChartConfigData();
      knownCharts.forEach((item) => {this.cacheConfigData.push(item);});

      handleChartConfigDataFunc.handleChartConfigDataFunc(this.cacheConfigData);
    });
  }

  private getCacheConfigDataByTitle(title: string): ChartConfigData {
    let chartConfigData: ChartConfigData = null;

    for (let cacheConfigDataItem of this.cacheConfigData) {
      if (title === cacheConfigDataItem.title) {
        chartConfigData = cacheConfigDataItem;
        break;
      }
    }

    return chartConfigData;
  }

  /**
   * For RRD metric files that don't have a dataset called value... 
   * This method findsd the ones I use.. Sparing me an expensive call
   * to get_source_info Api.
   */
  private computeValueColumnName(source: string, dataSetType: string): string {
    let returnVal: string = "value"; // default

    if (source.startsWith("disk-")) {

      if (dataSetType === "disk_octets" || dataSetType === "disk_ops" || dataSetType === "disk_time") {
        returnVal = "read";
      } else if (dataSetType === "disk_io_time") {
        returnVal = "io_time";
      }


    } else if (source.startsWith("interface-")) {
        returnVal = "rx";
    } else if (source === "ctl-tpc") {
        returnVal = "read";
    } else if (source ==="zfs_arc") {
        if (dataSetType === "io_octets-L2") {
        returnVal = "rx";
      }
    } 


    return returnVal;
  }

  /** 
   * Certain nodes like... disk_io have read/write.  WHen I get a source that's like that... Ill auto create
   * the Write.  Do this for all types I need.  rx/tx etc.... where a given source has datasets that make
   * sense displayed together.  Most nodes.. This does not happen.  That's why the name "Possible" is in the 
   * funciton.
   */
  private constructPossibleNodeCopy(dataListItem: DataListItem, dataListItemArray: DataListItem[]): void {
    if (dataListItem.dataset === "read") {
      let dataListItemCopied: DataListItem = {
        source: dataListItem.source,
        type: dataListItem.type,
        dataset: "write"
      };

      dataListItemArray.push(dataListItemCopied);
    } else if (dataListItem.dataset === "rx") {
      let dataListItemCopied: DataListItem = {
        source: dataListItem.source,
        type: dataListItem.type,
        dataset: "tx"
      };

      dataListItemArray.push(dataListItemCopied);
    }
  }
  
  /**
   * Take the WebSocket response for get_sources and chruns it 
   * down into a list of javascript objects that drive the charts.
   */
  private chartConfigDataFromWsReponse(res): ChartConfigData[] {
    let configData: ChartConfigData[] = [];
    let properties: string[] = [];
    for (let prop in res) {
      properties.push(prop);
    }

    properties = properties.sort();

    for (let prop of properties) {
      var propObjArray: string[] = res[prop];
      var dataListItemArray: DataListItem[] = [];

      propObjArray.forEach((proObjArrayItem) => {

        let dataListItem: DataListItem = {
          source: prop,
          type: proObjArrayItem,
          dataset: this.computeValueColumnName(prop, proObjArrayItem)
        };

        dataListItemArray.push(dataListItem);
        this.constructPossibleNodeCopy(dataListItem, dataListItemArray);

      });

      let chartData: ChartConfigData = {
        title: prop,
        legends: propObjArray,
        dataList: dataListItemArray
      };

      configData.push(chartData);

    }

    return configData;
  }

  /**
   * Certain ones I can hard code.. And interject them into the dynamic ones.
   */
  private getKnownChartConfigData(): ChartConfigData[] {


    let chartConfigData: ChartConfigData[] = [
      {
        title: "CPU",
        legends: ['User', 'Interrupt', 'System', 'Idle', 'Nice'],
        dataList: [
          {
            'source': 'aggregation-cpu-sum',
            'type': 'cpu-user',
            'dataset': 'value'
          },
          {
            'source': 'aggregation-cpu-sum',
            'type': 'cpu-interrupt',
            'dataset': 'value'
          },
          {
            'source': 'aggregation-cpu-sum',
            'type': 'cpu-system',
            'dataset': 'value'
          },
          {
            'source': 'aggregation-cpu-sum',
            'type': 'cpu-idle',
            'dataset': 'value'
          },
          {
            'source': 'aggregation-cpu-sum',
            'type': 'cpu-nice',
            'dataset': 'value'
          },
        ],
      }, {
        title: "Load",
        legends: ['Short Term', ' Mid Term', 'Long Term'],
        dataList: [
          {source: 'load', type: 'load', dataset: 'shortterm'},
          {'source': 'load', 'type': 'load', 'dataset': 'midterm'},
          {'source': 'load', 'type': 'load', 'dataset': 'longterm'},
        ],
      }, {
        title: "ZFS Arc Size",
        legends: ['Arc Size'],
        dataList: [
          {source: 'zfs_arc', type: 'cache_size-arc', dataset: 'value'}
        ],
      }, {
        title: "ZFS Arc Hit Ratio",
        legends: ['Arc', 'L2'],
        dataList: [
          {source: 'zfs_arc', type: 'cache_ratio-arc', dataset: 'value'},
          {source: 'zfs_arc', type: 'cache_ratio-L2', dataset: 'value'}
        ],
      }, {
        title: "ZFS Demand Data",
        legends: ['Hits', 'Miss',],
        dataList: [
          {source: 'zfs_arc', type: 'cache_result-demand_data-hit', dataset: 'value'},
          {source: 'zfs_arc', type: 'cache_result-demand_data-miss', dataset: 'value'}
        ],
      }, {
        title: "ZFS Demand Metadata",
        legends: ['Hits', 'Miss',],
        dataList: [
          {source: 'zfs_arc', type: 'cache_result-demand_metadata-hit', dataset: 'value'},
          {source: 'zfs_arc', type: 'cache_result-demand_metadata-miss', dataset: 'value'}
        ],
      }, {
        title: "ZFS Prefetch Data",
        legends: ['Hits', 'Miss',],
        dataList: [
          {source: 'zfs_arc', type: 'cache_result-prefetch_data-hit', dataset: 'value'},
          {source: 'zfs_arc', type: 'cache_result-prefetch_data-miss', dataset: 'value'}
        ],
      }, {
        title: "ZFS Prefetch Metadata",
        legends: ['Hits', 'Miss',],
        dataList: [
          {source: 'zfs_arc', type: 'cache_result-prefetch_metadata-hit', dataset: 'value'},
          {source: 'zfs_arc', type: 'cache_result-prefetch_metadata-miss', dataset: 'value'}
        ],
      }
    ];
    

    return chartConfigData;

  }

}