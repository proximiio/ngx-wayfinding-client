import { NgModule } from '@angular/core';
import {
  MatButtonModule,
  MatIconModule,
  MatListModule,
  MatMenuModule,
  MatSidenavModule,
  MatToolbarModule,
  MatProgressSpinnerModule,
  MatInputModule,
  MatCardModule,
  MatTableModule,
  MatPaginatorModule,
  MatTooltipModule,
  MatSortModule,
  MatSelectModule,
  MatSnackBarModule,
  MatDialogModule,
  MatSlideToggleModule
} from '@angular/material';

@NgModule({
  exports: [
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSortModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSlideToggleModule
  ]
})
export class AngularMaterialModule {}
