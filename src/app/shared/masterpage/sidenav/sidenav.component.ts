import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {

  navs: {
    icon: string;
    link: string;
    name: string;
    external?: boolean;
  }[];

  constructor(
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.navs = [
      {
        icon: 'gavel',
        link: '/',
        name: this.translate.instant('Producers')
      },
      {
        icon: 'dashboard',
        link: '/dashboard',
        name: this.translate.instant('Dashboard')
      },
      {
        icon: 'link',
        link: '/blocks',
        name: this.translate.instant('Blocks')
      },
      {
        icon: 'list_alt',
        link: '/transactions',
        name: this.translate.instant('Transactions')
      } ];
  }

}
