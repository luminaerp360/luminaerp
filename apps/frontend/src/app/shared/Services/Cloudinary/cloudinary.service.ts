import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, forkJoin, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly cloudName = 'shaphan';
  private readonly uploadPreset = 'SHAPHAN';
  private readonly uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  private readonly apiKey = '484834839993712';

  constructor(private http: HttpClient) {}

  /**
   * Upload a single image to Cloudinary
   * @param file - The image file to upload
   * @returns Observable<string> - The secure URL of the uploaded image
   */
  uploadImage(file: File): Observable<string> {
    // Validate file
    if (!this.isValidImageFile(file)) {
      return throwError('Invalid file type. Please select a valid image file.');
    }

    if (!this.isValidFileSize(file)) {
      return throwError(
        'File size too large. Please select a file smaller than 10MB.'
      );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('api_key', this.apiKey);

    return this.http.post<any>(this.uploadUrl, formData).pipe(
      timeout(30000), // 30 second timeout
      map((response) => {
        if (response && response.secure_url) {
          return response.secure_url;
        }
        throw new Error('Invalid response from Cloudinary');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Upload multiple images to Cloudinary
   * @param files - Array of image files to upload
   * @returns Observable<string[]> - Array of secure URLs
   */
  uploadMultipleImages(files: File[]): Observable<string[]> {
    if (!files || files.length === 0) {
      return throwError('No files provided for upload');
    }

    // Validate all files first
    const invalidFiles = files.filter(
      (file) => !this.isValidImageFile(file) || !this.isValidFileSize(file)
    );
    if (invalidFiles.length > 0) {
      return throwError(
        'Some files are invalid. Please check file types and sizes.'
      );
    }

    const uploads = files.map((file) => this.uploadImage(file));
    return forkJoin(uploads);
  }

  /**
   * Upload image with transformation options
   * @param file - The image file to upload
   * @param transformations - Cloudinary transformation parameters
   * @returns Observable<string> - The secure URL of the uploaded image
   */
  uploadImageWithTransformations(
    file: File,
    transformations: any = {}
  ): Observable<string> {
    if (!this.isValidImageFile(file)) {
      return throwError('Invalid file type. Please select a valid image file.');
    }

    if (!this.isValidFileSize(file)) {
      return throwError(
        'File size too large. Please select a file smaller than 10MB.'
      );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('api_key', this.apiKey);

    // Add transformation parameters
    if (transformations.width) {
      formData.append('width', transformations.width.toString());
    }
    if (transformations.height) {
      formData.append('height', transformations.height.toString());
    }
    if (transformations.crop) {
      formData.append('crop', transformations.crop);
    }
    if (transformations.quality) {
      formData.append('quality', transformations.quality);
    }

    return this.http.post<any>(this.uploadUrl, formData).pipe(
      timeout(30000),
      map((response) => {
        if (response && response.secure_url) {
          return response.secure_url;
        }
        throw new Error('Invalid response from Cloudinary');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get optimized image URL with transformations
   * @param imageUrl - Original Cloudinary image URL
   * @param transformations - Transformation parameters
   * @returns string - Transformed image URL
   */
  getOptimizedImageUrl(imageUrl: string, transformations: any = {}): string {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }

    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length !== 2) {
      return imageUrl;
    }

    const transformationString =
      this.buildTransformationString(transformations);
    return `${urlParts[0]}/upload/${transformationString}${urlParts[1]}`;
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId - The public ID of the image to delete
   * @returns Observable<any> - Deletion response
   */
  deleteImage(publicId: string): Observable<any> {
    const deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', this.apiKey);
    // Note: For deletion, you would typically need to include a signature
    // This is a simplified version - in production, implement proper authentication

    return this.http
      .post<any>(deleteUrl, formData)
      .pipe(timeout(15000), catchError(this.handleError));
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param imageUrl - Cloudinary image URL
   * @returns string - Public ID
   */
  extractPublicId(imageUrl: string): string {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return '';
    }

    const regex = /\/upload\/(?:v\d+\/)?([^/.]+)/;
    const match = imageUrl.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Validate if file is a valid image
   * @param file - File to validate
   * @returns boolean
   */
  private isValidImageFile(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    return allowedTypes.includes(file.type.toLowerCase());
  }

  /**
   * Validate file size
   * @param file - File to validate
   * @returns boolean
   */
  private isValidFileSize(file: File, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }

  /**
   * Build transformation string for Cloudinary URL
   * @param transformations - Transformation parameters
   * @returns string
   */
  private buildTransformationString(transformations: any): string {
    const params: string[] = [];

    if (transformations.width) {
      params.push(`w_${transformations.width}`);
    }
    if (transformations.height) {
      params.push(`h_${transformations.height}`);
    }
    if (transformations.crop) {
      params.push(`c_${transformations.crop}`);
    }
    if (transformations.quality) {
      params.push(`q_${transformations.quality}`);
    }
    if (transformations.format) {
      params.push(`f_${transformations.format}`);
    }

    return params.length > 0 ? params.join(',') + '/' : '';
  }

  /**
   * Handle HTTP errors
   * @param error - HTTP error response
   * @returns Observable error
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred during upload';

    if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.status === 400) {
      errorMessage = 'Invalid file or upload parameters.';
    } else if (error.status === 401) {
      errorMessage = 'Upload authentication failed.';
    } else if (error.status === 403) {
      errorMessage = 'Upload permission denied.';
    } else if (error.status === 413) {
      errorMessage = 'File size too large for upload.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    console.error('Cloudinary upload error:', error);
    return throwError(errorMessage);
  };

  /**
   * Get file size in human readable format
   * @param bytes - File size in bytes
   * @returns string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Compress image before upload (client-side)
   * @param file - Original image file
   * @param maxWidth - Maximum width
   * @param maxHeight - Maximum height
   * @param quality - Compression quality (0-1)
   * @returns Promise<File>
   */
  compressImage(
    file: File,
    maxWidth: number = 1200,
    maxHeight: number = 1200,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}
