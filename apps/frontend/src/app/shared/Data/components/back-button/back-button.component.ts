// back-button.component.ts
import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: ` <button (click)="goBack()" class="back-btn">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="icon"
    >
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  </button>`,
  styleUrls: ['./back-button.component.scss'],
})
export class BackButtonComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back(); // Navigates to the previous route
  }
}
