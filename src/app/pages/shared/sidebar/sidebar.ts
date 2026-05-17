import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnDestroy {
  openMenu: string | null = null;

  private readonly routeSubscription: Subscription;

  constructor(private router: Router) {
    this.setOpenMenuFromUrl(this.router.url);

    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setOpenMenuFromUrl(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  toggleMenu(menu: string, event: Event): void {
    event.preventDefault();
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  isMenuOpen(menu: string): boolean {
    return this.openMenu === menu;
  }

  private setOpenMenuFromUrl(url: string): void {
    if (url.startsWith('/item')) {
      this.openMenu = 'master-data';
      return;
    }

    if (url.startsWith('/contact')) {
      this.openMenu = 'contacts';
      return;
    }

    if (url.startsWith('/inventory')) {
      this.openMenu = 'inventory';
      return;
    }

    if (url.startsWith('/cash-management')) {
      this.openMenu = 'cash-management';
      return;
    }

    this.openMenu = null;
  }
}
