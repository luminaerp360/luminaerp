import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './training.component.html',
  styleUrl: './training.component.scss',
})
export class TrainingComponent implements OnInit {
  trainingModules = [
    {
      id: 1,
      title: 'Getting Started with Lumina ERP',
      description: 'Learn the basics of navigating and using the ERP system',
      duration: '30 mins',
      category: 'Basics',
      icon: 'school',
      completed: false,
      topics: [
        'System Overview',
        'Navigation Basics',
        'User Dashboard',
        'Basic Settings',
      ],
    },
    {
      id: 2,
      title: 'Inventory Management',
      description: 'Master inventory tracking, batches, and stock movements',
      duration: '45 mins',
      category: 'Inventory',
      icon: 'inventory_2',
      completed: false,
      topics: [
        'Adding Products',
        'Batch Management',
        'Stock Transfers',
        'Reorder Points',
      ],
    },
    {
      id: 3,
      title: 'Sales & Invoicing',
      description: 'Create sales, invoices, and manage customer transactions',
      duration: '40 mins',
      category: 'Sales',
      icon: 'point_of_sale',
      completed: false,
      topics: [
        'Creating Invoices',
        'Recurring Invoices',
        'Payment Processing',
        'Credit Sales',
      ],
    },
    {
      id: 4,
      title: 'Accounts Payable',
      description: 'Learn to manage bills, suppliers, and payments',
      duration: '35 mins',
      category: 'Finance',
      icon: 'receipt_long',
      completed: false,
      topics: [
        'Creating Bills',
        'Bill Items & Expenses',
        'Supplier Management',
        'Payment Tracking',
      ],
    },
    {
      id: 5,
      title: 'Chart of Accounts',
      description: 'Understanding and managing your financial accounts',
      duration: '25 mins',
      category: 'Finance',
      icon: 'account_balance',
      completed: false,
      topics: [
        'Account Types',
        'Account Hierarchy',
        'Balance Sheet',
        'Income Statement',
      ],
    },
    {
      id: 6,
      title: 'Reports & Analytics',
      description: 'Generate and analyze business reports',
      duration: '30 mins',
      category: 'Reports',
      icon: 'analytics',
      completed: false,
      topics: [
        'Sales Reports',
        'Inventory Reports',
        'Financial Reports',
        'Custom Reports',
      ],
    },
  ];

  filteredModules = [...this.trainingModules];
  selectedCategory: string = 'all';
  searchQuery: string = '';

  categories = [
    { value: 'all', label: 'All Modules' },
    { value: 'Basics', label: 'Basics' },
    { value: 'Inventory', label: 'Inventory' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Reports', label: 'Reports' },
  ];

  ngOnInit(): void {
    this.filterModules();
  }

  filterModules(): void {
    this.filteredModules = this.trainingModules.filter((module) => {
      const matchesCategory =
        this.selectedCategory === 'all' ||
        module.category === this.selectedCategory;
      const matchesSearch =
        !this.searchQuery ||
        module.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        module.description
          .toLowerCase()
          .includes(this.searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterModules();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.filterModules();
  }

  startTraining(moduleId: number): void {
    console.log('Starting training module:', moduleId);
    // TODO: Implement training module navigation
  }

  markAsCompleted(moduleId: number): void {
    const module = this.trainingModules.find((m) => m.id === moduleId);
    if (module) {
      module.completed = !module.completed;
      this.filterModules();
    }
  }

  get completedCount(): number {
    return this.trainingModules.filter((m) => m.completed).length;
  }
}
