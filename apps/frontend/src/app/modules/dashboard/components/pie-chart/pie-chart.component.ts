import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexChart,
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
};

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
})
export class PieChartComponent implements OnInit, OnChanges {
  @Input() data!: { series: number[]; labels: string[] };
  series: number[] = [];

  public chartOptions: ChartOptions;

  constructor() {
    // Initialize with empty values
    this.chartOptions = {
      series: [],
      chart: {
        width: 380,
        type: 'pie',
      },
      labels: [],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
    };
    this.updateChartOptions();
  }

  ngOnInit(): void {
    this.updateChartOptions();
    this.series = this.data.series;
    console.log('Initial Chart data series', this.series);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateChartOptions();
      this.series = this.data.series;
      console.log('Initial Chart data series', this.series);
    }
  }

  private updateChartOptions(): void {
    if (this.data && this.data.series && this.data.labels) {
      this.chartOptions = {
        ...this.chartOptions,
        series: this.data.series,
        labels: this.data.labels,
      };
      console.log('Updated Chart data:', this.data);
      console.log('Updated Chart options:', this.chartOptions);
      console.log('Updated Chart series:', this.chartOptions.series);
      console.log('Updated Chart labels:', this.chartOptions.labels);
    }
  }
}
