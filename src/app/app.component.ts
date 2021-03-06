import {Component, OnInit, ViewChild} from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { HomePage } from '../pages/home/home';
import {UserPage} from "../pages/user/user";
import {LoginPage} from "../pages/login/login";
import {LoginService} from "../services/login.service";
import {MyRequestsPage} from "../pages/requests/my-requests";
import { NotaLegalPage } from "../pages/nota-legal/nota-legal";

@Component({
  templateUrl: 'app.html'
})
export class MyApp implements OnInit{
  @ViewChild(Nav) nav: Nav;

  rootPage: any;

  pages: Array<{title: string, component: any}>;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen, private loginService: LoginService) {
    this.initializeApp();

    // used for an example of ngFor and navigation
    this.pages = [
      { title: 'Home', component: HomePage },
      { title: 'Els meus encàrrecs', component: MyRequestsPage},
      { title: 'Perfil', component: UserPage},
      { title: 'Nota Legal', component: NotaLegalPage}
    ];
  }

  ngOnInit(): void {
    this.loginService.isLoggedIn()
      .then(() => {
        this.rootPage = HomePage;
      })
      .catch(() => {
        this.rootPage = LoginPage;
      })
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }

  onClickLogout(): void {
    this.loginService.logout().then(() => {
      this.nav.setRoot(LoginPage);
    }).catch(() => {
      console.error('Unable to logout');
    })
  }
}
