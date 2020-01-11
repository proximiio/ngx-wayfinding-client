import { Component, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  pois;

  constructor(
    public sidebarService: SidebarService
  ) { }

  ngOnInit() {
    this.pois = this.sidebarService.sortedPOIs;
  }
}
