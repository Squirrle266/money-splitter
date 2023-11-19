import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CalculationService {
  private apiUrl = 'http://localhost:8080/calculate'; // Backend-URL

  constructor(private http: HttpClient) {}

  calculateDenomination(amount: number, previousResult: any[], banknotesAndCoins: number[]): Observable<any> {
    const body = {
      amount,
      previousResult,
      banknotesAndCoins: banknotesAndCoins
    };
  
    return this.http.post<any>(this.apiUrl, body);
  }
}