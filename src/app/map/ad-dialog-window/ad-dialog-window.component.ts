import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-ad-dialog-window',
  templateUrl: './ad-dialog-window.component.html',
  styleUrls: ['./ad-dialog-window.component.scss']
})
export class AdDialogWindowComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<AdDialogWindowComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
  }

  onCloseClick(): void {
    this.dialogRef.close();
  }

}
