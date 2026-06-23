import { AfterViewInit, Component, Inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('SM Treading');

  private modalObserver?: MutationObserver;
  private scrollY = 0;
  private bodyLocked = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.syncBodyScrollLock();
    this.modalObserver = new MutationObserver(() => this.syncBodyScrollLock());
    this.modalObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style']
    });
  }

  ngOnDestroy(): void {
    this.modalObserver?.disconnect();
    if (this.bodyLocked && isPlatformBrowser(this.platformId)) {
      this.unlockBodyScroll();
    }
  }

  private syncBodyScrollLock(): void {
    const hasOpenModal = Array.from(document.querySelectorAll<HTMLElement>('.modal.show'))
      .some((modal) => {
        const style = window.getComputedStyle(modal);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

    if (hasOpenModal) {
      this.lockBodyScroll();
    } else {
      this.unlockBodyScroll();
    }
  }

  private lockBodyScroll(): void {
    if (this.bodyLocked) return;

    this.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('modal-scroll-locked');
    document.body.classList.add('modal-scroll-locked');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    this.bodyLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.bodyLocked) return;

    document.documentElement.classList.remove('modal-scroll-locked');
    document.body.classList.remove('modal-scroll-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, this.scrollY);
    this.bodyLocked = false;
  }
}
