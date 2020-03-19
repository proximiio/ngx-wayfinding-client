import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { MapRoutingModule } from './map-routing.module';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { CoreModule } from '../core/core.module';
import { FontawesomeModule } from '../fontawesome.module';
import { AdDialogWindowComponent } from './ad-dialog-window/ad-dialog-window.component';
import { AngularMaterialModule } from '../angular-material.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    FontawesomeModule,
    MapRoutingModule,
    AngularMaterialModule,
    NgxMapboxGLModule
  ],
  declarations: [
    MapComponent,
    AdDialogWindowComponent
  ],
  entryComponents: [
    AdDialogWindowComponent
  ]
})
export class MapModule {}
