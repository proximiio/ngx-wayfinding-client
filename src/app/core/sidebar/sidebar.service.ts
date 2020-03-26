import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class SidebarService {
  public window = 'lg';
  public sidebarStatus = new Subject<boolean>();
  public startPointListener = new Subject<any>();
  public endPointListener = new Subject<any>();
  public selectedPlaceListener = new Subject<any>();
  public legendToggleListener = new Subject<any>();
  public onlyOpenedListener = new Subject<boolean>();
  public accessibleOnlyToggleListener = new Subject<boolean>();

  constructor() {}

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

  getLegendToggleListener() {
    return this.legendToggleListener.asObservable();
  }

  getOnlyOpenedListener() {
    return this.onlyOpenedListener.asObservable();
  }

  getAccessibleOnlyToggleListener() {
    return this.accessibleOnlyToggleListener.asObservable();
  }
}
