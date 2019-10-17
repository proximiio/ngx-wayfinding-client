import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class SidebarService {
  public appDrawer: any;
  public sidenavMode = 'side';
  public sidebarStatus = new Subject<boolean>();
  public startPointListener = new Subject<any>();
  public endPointListener = new Subject<any>();
  public selectedPlaceListener = new Subject<any>();
  public accessibleOnlyToggleListener = new Subject<boolean>();

  constructor() {}

  public closeSidebar() {
    this.appDrawer.close();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  public openSidebar() {
    this.appDrawer.open();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  public toggleSidebar() {
    this.appDrawer.toggle();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  getSidebarStatusListener() {
    return this.sidebarStatus.asObservable();
  }

  getStartPointListener() {
    return this.startPointListener.asObservable();
  }

  getEndPointListener() {
    return this.endPointListener.asObservable();
  }

  getSelectedPlaceListener() {
    return this.selectedPlaceListener.asObservable();
  }

  getAccessibleOnlyToggleListener() {
    return this.accessibleOnlyToggleListener.asObservable();
  }
}
