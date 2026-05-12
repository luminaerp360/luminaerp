import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface ReportCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-reports-hub',
  templateUrl: './reports-hub.component.html',
  styleUrls: ['./reports-hub.component.scss'],
})
export class ReportsHubComponent {
  reportCards: ReportCard[] = [
    {
      title: 'Dashboard Overview',
      description:
        'High-level KPIs across revenue, expenses, orders, invoices, and stock alerts.',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      route: '/report-dashboard',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Payments Report',
      description:
        'Unified payments from orders, invoices, and credit sales by method and source.',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      route: '/report-payments',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Sales Report',
      description:
        'Orders and credit sales — revenue, items sold, per-user, and hourly trends.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      route: '/report-sales',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Invoice Report',
      description:
        'Invoice analytics — status, aging, type breakdown, and top customers.',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      route: '/report-invoices',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'Expense Report',
      description:
        'Expense breakdown by category, vendor, payment method, and chart of accounts.',
      icon: 'M19 14l-7 7m0 0l-7-7m7 7V3',
      route: '/report-expenses',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      title: 'Inventory Report',
      description:
        'Stock levels, valuation, alerts, category breakdown, and profit margins.',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      route: '/report-inventory',
      color: 'text-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    },
    {
      title: 'Customer Report',
      description:
        'Customer analytics — top spenders, debtors, activity, and outstanding balances.',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      route: '/report-customers',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      title: 'Profit & Loss',
      description:
        'P&L statement — revenue, expenses, gross/net profit, tax, and margins.',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      route: '/report-profit-loss',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'User Performance',
      description:
        'Per-user sales, collections, commissions, and transaction rankings.',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      route: '/report-user-performance',
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      title: 'Daily Trends',
      description:
        'Day-by-day revenue, expenses, and profit with best/worst day analysis.',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
      route: '/report-daily-trends',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
  ];

  constructor(private router: Router) {}

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
