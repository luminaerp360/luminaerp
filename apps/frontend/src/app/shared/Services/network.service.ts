import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { mapTo, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private networkStatus = new BehaviorSubject<boolean>(navigator.onLine);

  constructor() {
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring() {
    // Listen to online and offline events
    const online$ = fromEvent(window, 'online').pipe(mapTo(true));
    const offline$ = fromEvent(window, 'offline').pipe(mapTo(false));

    // Merge online and offline events
    merge(online$, offline$).subscribe(status => {
      this.networkStatus.next(status);

      // Reload page when internet is back
      if (status === true) {
        this.reloadPageIfNeeded();
      }
    });
  }

  // Check current network status
  isOnline(): boolean {
    return this.networkStatus.value;
  }

  // Observable for network status
  networkStatus$ = this.networkStatus.asObservable();

  // Reload page if internet is available
  private reloadPageIfNeeded() {
    if (navigator.onLine) {
      window.location.reload();
    }
  }
}