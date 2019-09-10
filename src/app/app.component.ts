import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { Subscription } from 'rxjs';
import { SidebarService } from './core/sidebar/sidebar.service';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import Fingerprint2 from 'fingerprintjs2';
import { AhoyService } from './core/ahoy.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appDrawer', {static: false}) appDrawer: ElementRef;
  sidenavIsOpened = true;
  userIsAuthenticated = false;
  isLoading = false;
  theme$ = 'default-theme';
  currentUserConfig;
  sendAnalytics = false;
  private authListenerSubs: Subscription;

  constructor(
    public sidebarService: SidebarService,
    private authService: AuthService,
    private breakpointObserver: BreakpointObserver,
    private ahoyService: AhoyService,
    overlayContainer: OverlayContainer
  ) {
    overlayContainer.getContainerElement().classList.add(this.theme$);
    /*Fingerprint2.get((fingerprint) => {
      console.log(fingerprint);
    });
    this.ahoyService.getInstance().debug();*/
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
          this.sidebarService.appDrawer = this.appDrawer;
          this.startAhoyTracking();
        }, 500);
      });
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe((state: BreakpointState) => {
        if (state.breakpoints['(max-width: 599.99px)']) {
          this.sidebarService.sidenavMode = 'over';
          this.sidenavIsOpened = false;
        } else if (state.breakpoints['(min-width: 600px) and (max-width: 959.99px)']) {
          this.sidebarService.sidenavMode = 'over';
          this.sidenavIsOpened = false;
        } else if (!state.matches) {
          this.sidebarService.sidenavMode = 'side';
          this.sidenavIsOpened = true;
        }
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
      this.ahoyService.getInstance().trackAll();
    }
  }

  ngAfterViewInit(): void {
    this.sidebarService.appDrawer = this.appDrawer;
  }

  ngOnDestroy(): void {
    if (this.authListenerSubs) {
      this.authListenerSubs.unsubscribe();
    }
  }
}
