import { Component, LOCALE_ID } from '@angular/core';
import { CommonModule, DecimalPipe, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClientModule } from '@angular/common/http';
import { CalculationService } from './service/calculation.service';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe);

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    FormsModule,
    CommonModule,
    MatSlideToggleModule,
    HttpClientModule
  ],
  providers: [CalculationService, DecimalPipe, {provide: LOCALE_ID, useValue: 'de-DE'}]
})
export class AppComponent {
  inputAmount: number = 0;
  calculatedAmount: number = 0;
  previousAmount: number = 0;
  result: any[] = [];
  previousResult: any[] = [];
  difference: any[] = [];

  // Verfügbare Scheine und Münzen
  banknotesAndCoins: number[] = [
    200.00, 100.00, 50.00, 20.00, 10.00, 5.00, 2.00, 1.00, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01,
  ];

  // Berechnung im Backend?
  isBackendCalculation = false;

  constructor(private calculationService: CalculationService) {}

  // Erlaubt nur Zahlen, Kommas, Backspace und die Pfeiltasten
  validateInputAllowedCharacters(event: KeyboardEvent) {
    const allowedCharacters = /[0-9,]/;

    if (!allowedCharacters.test(event.key) && event.key !== "Backspace" && event.key !== "ArrowLeft" 
          && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      event.preventDefault();
    }
  }

  // Erlaubt max. 2 Dezimalstellen
  validateInputDecimal(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const currentValue = inputElement.value.replace(".", ",");

    if (currentValue.includes(",")) {
      const decimalPart = currentValue.split(",")[1];
      if (decimalPart.length > 2) {
        inputElement.value = currentValue.substring(0, currentValue.length - 1);
        this.inputAmount = parseFloat(inputElement.value);
      }
    } 
    if (currentValue.includes("-")) {
      inputElement.value = '0'
      this.inputAmount = parseFloat(inputElement.value);
    }
  }

  // Tausche Punkte durch Kommas aus (Visualisierung)
  replaceDots(value: number | string): string {
    return value.toString().replace('.', ',');
  }

  async calculate() { 
    // wenn ein Wert eingegeben wurde oder der Wert nicht mit dem Differenzwert übereinstimmt (Spam-Schutz)
    if (this.inputAmount !== undefined && this.inputAmount > 0 && (this.previousAmount !== this.calculatedAmount || this.previousAmount !== this.inputAmount)) {
        if (this.isBackendCalculation) {
          // starte Berechnung im Backend
          this.calculationService.calculateDenomination(this.inputAmount, this.previousResult, this.banknotesAndCoins)
            .subscribe(response => {
              this.result = response.currentResult;
              this.difference = response.difference;
              this.previousResult = this.result;
            });
        } else {
          // starte Berechnung im Frontend
          const currentResult = this.calculateDenomination(this.inputAmount);
          this.result = currentResult;
          this.difference = this.calculateDifference(currentResult, this.previousResult);
          this.previousResult = this.result;
        }
        // Speichere die vorherige Berechnung, um sie für die Differenz zu benutzen
        this.previousAmount = this.calculatedAmount;
        // Speichere nun die aktuelle Berechnung
        this.calculatedAmount = this.inputAmount;
      }
  }

  // Berechnung der Stückelung
  private calculateDenomination(amount: number): any[] {
    const result = [];

    // Durchlaufe alle Scheine/Münzen und ziehe diese vom Betrag ab
    for (const banknoteOrCoin of this.banknotesAndCoins) {
      const count = Math.floor(amount / banknoteOrCoin);
      if (count > 0) {
        result.push({
          banknotesAndCoins: banknoteOrCoin,
          count,
        });

        amount = parseFloat((amount % banknoteOrCoin).toFixed(2));
      }
    }
    return result;
  }

  // Berechnung der Differenz
  private calculateDifference(currentResult: any[], previousResult: any[]): any[] {
    const difference = [];

    // Nimm nur die Scheine/Münzen der vorherigen und aktuellen Stückelung
    const banknotesAndCoins = Array.from(new Set([...currentResult.map(item => item.banknotesAndCoins), ...previousResult.map(item => item.banknotesAndCoins)]));

    for (const banknoteOrCoin of banknotesAndCoins) {
      const current = currentResult.find(item => item.banknotesAndCoins === banknoteOrCoin) || { count: 0 };
      const previous = previousResult.find(item => item.banknotesAndCoins === banknoteOrCoin) || { count: 0 };

      let countDiff = current.count - previous.count;

      if (countDiff !== 0 || (countDiff === 0 && current.count > 0)) {

        difference.push({
          countDiff,
          banknotesAndCoins: banknoteOrCoin,
          previousAmount: this.previousAmount,
        });
      }
    }

    // Sortiere die Differenz absteigend nach den Scheinen/Münzen
    difference.sort((a, b) => b.banknotesAndCoins - a.banknotesAndCoins);

    return difference;
  }
}
