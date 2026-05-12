import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'DasaDovePos';

  ngOnInit() {
    // Initialize theme on app startup
    this.loadTheme();
    this.setupSystemThemeListener();
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    const currentTheme = savedTheme || 'light';
    this.applyTheme(currentTheme);
  }

  private applyTheme(theme: 'light' | 'dark' | 'system') {
    const html = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  private setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
      if (savedTheme === 'system' || !savedTheme) {
        this.loadTheme();
      }
    });
  }
}
