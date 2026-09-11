import {Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected name = '';
  protected password = '';
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected get roleHint(): string | null {
    const n = this.name.toLowerCase();
    if (n.includes('manager')) return 'Responsable';
    if (n.includes('waiter')) return 'Serveur';
    if (n.includes('cook')) return 'Cuisine';
    return null;
  }

  protected async submit(): Promise<void> {
    if (!this.name.trim() || !this.password.trim()) {
      this.error.set('Nom et mot de passe requis.');
      return;
    }

    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.name, this.password);
      await this.router.navigateByUrl('/orders');
    } catch {
      this.error.set('Identifiants invalides.');
    } finally {
      this.loading.set(false);
    }
  }
}
