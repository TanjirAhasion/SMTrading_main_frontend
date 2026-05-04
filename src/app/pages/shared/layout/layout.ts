import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Footer } from '../footer/footer';
import { Dashboard } from '../../dashboard/dashboard';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar, Footer],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {}
