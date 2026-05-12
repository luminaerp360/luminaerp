import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../Environments/environments';

type VerifyState = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  state: VerifyState = 'verifying';
  errorMessage = '';

  private apiUrl = `${environment.apiMainRootUrl}auth`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = 'No verification token found in the link.';
      return;
    }

    this.http.get<any>(`${this.apiUrl}/verify-email?token=${token}`).subscribe({
      next: () => {
        this.state = 'success';
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage =
          err.error?.message ||
          'Verification failed. The link may be expired or already used.';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
