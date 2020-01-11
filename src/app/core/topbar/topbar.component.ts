import { Component, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  pois;

  constructor(
    public sidebarService: SidebarService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    if (this.authService.getIsAuth()) {
      this.pois = this.sidebarService.sortedPOIs;
    }
    this.authService.getAuthStatusListener().subscribe(auth => {
      if (auth) {
        this.pois = this.sidebarService.sortedPOIs;
      }
    });
  }
}
