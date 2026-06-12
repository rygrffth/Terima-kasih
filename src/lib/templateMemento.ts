
export class TemplateMemento {
  private readonly lhuTemplate: string;
  private readonly certTemplate: string;
  private readonly timestamp: Date;

  constructor(lhu: string, cert: string) {
    this.lhuTemplate = lhu;
    this.certTemplate = cert;
    this.timestamp = new Date();
  }

  getLhuTemplate(): string {
    return this.lhuTemplate;
  }

  getCertTemplate(): string {
    return this.certTemplate;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }
}

export class TemplateCaretaker {
  private mementos: TemplateMemento[] = [];

  addMemento(memento: TemplateMemento) {
    this.mementos.push(memento);
    // Batasi riwayat maksimal 10 untuk menghemat memori
    if (this.mementos.length > 10) {
      this.mementos.shift();
    }
  }

  getMemento(): TemplateMemento | null {
    if (this.mementos.length === 0) return null;
    return this.mementos.pop() || null;
  }

  hasHistory(): boolean {
    return this.mementos.length > 0;
  }

  clearHistory() {
    this.mementos = [];
  }
}
