import ahoy from 'ahoy.js';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AhoyService {

  constructor(private authService: AuthService) {
    ahoy.configure({
      urlPrefix: '',
      visitsUrl: `${environment.ahoyUrl}/ahoy/visits`,
      eventsUrl: `${environment.ahoyUrl}/ahoy/events`,
      page: null,
      platform: 'Web',
      useBeacon: true,
      startOnReady: true,
      trackVisits: true,
      cookies: true,
      cookieDomain: null,
      headers: {'Authorization': `Bearer ${this.authService.getToken()}`},
      visitParams: {},
      withCredentials: true
    });
  }

  getInstance() {
    return ahoy;
  }
}

