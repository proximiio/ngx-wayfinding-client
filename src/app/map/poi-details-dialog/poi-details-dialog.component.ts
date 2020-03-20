import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-poi-details-dialog',
  templateUrl: './poi-details-dialog.component.html',
  styleUrls: ['./poi-details-dialog.component.scss']
})
export class PoiDetailsDialogComponent implements OnInit {
  metadata;

  constructor(
    public dialogRef: MatDialogRef<PoiDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public poi: any
  ) { }

  ngOnInit() {
    this.metadata = JSON.parse(this.poi.properties.metadata);
    console.log(this.metadata);
  }

  onCloseClick(): void {
    this.dialogRef.close();
  }

}
