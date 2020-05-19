import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { LocalStorageService } from '../core/local-storage.service';
import { SessionStorageService } from '../core/session-storage.service';
import { axios } from '../map/common';

const AUTH_URL = environment.authUrl;
export const AUTH_KEY = 'AUTH';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAuthenticated = false;
  private token: string;
  private user: any;
  private config: any;
  private data: any;
  private authStatusListener = new Subject<boolean>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private localStorageService: LocalStorageService,
    private sessionStorageService: SessionStorageService) {}

  getToken() {
    return this.token;
  }

  getIsAuth() {
    return this.isAuthenticated;
  }

  getCurrentUser() {
    return this.user;
  }

  getCurrentUserConfig() {
    return this.config;
  }

  getCurrentUserData() {
    return this.data;
  }

  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }

  login() {
    this.http
      .get(
        AUTH_URL + '/auth'
      )
      .subscribe(
        response => {
          const token = response['user']['token'];
          this.token = token;
          if (token) {
            this.isAuthenticated = true;
            this.user = response['user'];
            this.config = response['config'];
            this.data = response['data'];
            this.setAxios(token);
            this.authStatusListener.next(true);
            this.saveAuthData(token, this.user, this.config, this.data);
            this.router.navigate(['/']);
          }
        },
        error => {
          this.authStatusListener.next(false);
        }
      );
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (!authInformation) {
      return;
    }
    this.token = authInformation.token;
    this.setAxios(this.token);
    this.isAuthenticated = true;
    this.user = authInformation.user;
    this.config = authInformation.config;
    this.data = authInformation.data;
    this.authStatusListener.next(true);
  }

  logout() {
    this.token = null;
    this.setAxios();
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    this.user = null;
    this.config = null;
    this.data = null;
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  private saveAuthData(token: string, user: any, config: any, data: any) {
    this.sessionStorageService.setItem(
      AUTH_KEY,
      { isAuthenticated: true, token, user, config, data }
    );
  }

  private clearAuthData() {
    console.log('clear auth data');
    this.sessionStorageService.setItem(
      AUTH_KEY,
      { isAuthenticated: false, token: null, user: null, config: null, data: null }
    );
  }

  private getAuthData() {
    const data = this.sessionStorageService.getItem(
      AUTH_KEY
    );
    if (!data || !data.token || !data.user || !data.data) {
      return;
    }
    return data;
  }

  private setAxios(token?: string) {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }
}
