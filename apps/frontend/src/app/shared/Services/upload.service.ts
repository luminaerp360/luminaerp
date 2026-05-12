import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly apiUrl = `${environment.apiMainRootUrl}upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a single file to DigitalOcean Spaces.
   * @param file   The file to upload.
   * @param folder Sub-folder inside the bucket (default: 'uploads').
   * @returns Observable<{ url: string }> — public URL of the uploaded file.
   */
  uploadSingle(file: File, folder = 'uploads'): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.apiUrl}/single?folder=${encodeURIComponent(folder)}`,
      fd,
    );
  }

  /**
   * Upload multiple files to DigitalOcean Spaces (max 10).
   * @param files  Array of files to upload.
   * @param folder Sub-folder inside the bucket (default: 'uploads').
   * @returns Observable<{ urls: string[] }> — array of public URLs.
   */
  uploadMultiple(
    files: File[],
    folder = 'uploads',
  ): Observable<{ urls: string[] }> {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return this.http.post<{ urls: string[] }>(
      `${this.apiUrl}/multiple?folder=${encodeURIComponent(folder)}`,
      fd,
    );
  }
}
