import { Component, OnDestroy, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {
  pois;
  endPoi;
  private subs: Subscription[] = [];

  constructor(
    public sidebarService: SidebarService
  ) { }

  ngOnInit() {
    this.subs.push(
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi ? poi : null;
      })
    );
    this.pois = this.sidebarService.sortedPOIs;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
