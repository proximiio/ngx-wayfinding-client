import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { Subscription } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';
import Fingerprint2 from 'fingerprintjs2';
import ahoy from 'ahoy.js';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  userIsAuthenticated = false;
  isLoading = false;
  theme$ = 'default-theme';
  currentUserConfig;
  fingerprint;
  sendAnalytics = true;
  private authListenerSubs: Subscription;

  constructor(
    private authService: AuthService,
    overlayContainer: OverlayContainer
  ) {
    overlayContainer.getContainerElement().classList.add(this.theme$);
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.authService.autoAuthUser();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.isLoading = false;
        this.userIsAuthenticated = isAuthenticated;
        this.currentUserConfig =  this.authService.getCurrentUserConfig();
        setTimeout(() => {
          this.startAhoyTracking();
        }, 500);
      });
    if (!this.userIsAuthenticated) {
      this.authService.login();
    } else {
      this.currentUserConfig =  this.authService.getCurrentUserConfig();
      this.startAhoyTracking();
    }
  }

  startAhoyTracking() {
    if (this.sendAnalytics) {
      const options = {
        excludes: {
          canvas: true,
          webgl: true
        }
      };
      Fingerprint2.get(options, (fingerprint) => {
        this.fingerprint = fingerprint;
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
          visitParams: {fingerprint: fingerprint},
          withCredentials: false
        });
        ahoy.trackAll();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.authListenerSubs) {
      this.authListenerSubs.unsubscribe();
    }
  }
}
