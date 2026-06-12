export interface ValidationRequest {
  title: string;
  file: File | null;
  additionalFiles?: File[];
}

export interface ValidationHandler {
  setNext(handler: ValidationHandler): ValidationHandler;
  handle(request: ValidationRequest): string | null;
}

export abstract class AbstractValidationHandler implements ValidationHandler {
  private nextHandler: ValidationHandler | null = null;

  public setNext(handler: ValidationHandler): ValidationHandler {
    this.nextHandler = handler;
    return handler;
  }

  public handle(request: ValidationRequest): string | null {
    if (this.nextHandler) {
      return this.nextHandler.handle(request);
    }
    return null;
  }
}

export class TitlePresenceHandler extends AbstractValidationHandler {
  public handle(request: ValidationRequest): string | null {
    if (!request.title || !request.title.trim()) {
      return 'Judul LHU wajib diisi.';
    }
    return super.handle(request);
  }
}

export class TitleLengthHandler extends AbstractValidationHandler {
  public handle(request: ValidationRequest): string | null {
    if (request.title.trim().length < 3) {
      return 'Judul LHU terlalu pendek (minimal 3 karakter).';
    }
    return super.handle(request);
  }
}

export class FilePresenceHandler extends AbstractValidationHandler {
  public handle(request: ValidationRequest): string | null {
    if (!request.file) {
      return 'Silakan pilih berkas dokumen LHU utama.';
    }
    return super.handle(request);
  }
}

export class FileSizeHandler extends AbstractValidationHandler {
  private maxSizeBytes: number;

  constructor(maxSizeBytes: number = 10 * 1024 * 1024) { // Default 10MB
    super();
    this.maxSizeBytes = maxSizeBytes;
  }

  public handle(request: ValidationRequest): string | null {
    if (request.file && request.file.size > this.maxSizeBytes) {
      const maxMb = (this.maxSizeBytes / (1024 * 1024)).toFixed(0);
      return `Ukuran berkas utama melebihi batas maksimal (${maxMb} MB).`;
    }
    
    if (request.additionalFiles) {
      for (const file of request.additionalFiles) {
        if (file.size > this.maxSizeBytes) {
          const maxMb = (this.maxSizeBytes / (1024 * 1024)).toFixed(0);
          return `Ukuran berkas lampiran "${file.name}" melebihi batas maksimal (${maxMb} MB).`;
        }
      }
    }

    return super.handle(request);
  }
}

export class FileTypeHandler extends AbstractValidationHandler {
  private allowedExtensions: string[];

  constructor(allowedExtensions: string[] = ['pdf', 'png', 'jpg', 'jpeg']) {
    super();
    this.allowedExtensions = allowedExtensions.map(ext => ext.toLowerCase());
  }

  public handle(request: ValidationRequest): string | null {
    if (request.file) {
      const fileExt = request.file.name.split('.').pop()?.toLowerCase() || '';
      if (!this.allowedExtensions.includes(fileExt)) {
        return `Format berkas utama tidak didukung. Harap unggah berkas dengan format: ${this.allowedExtensions.join(', ').toUpperCase()}.`;
      }
    }

    if (request.additionalFiles) {
      for (const file of request.additionalFiles) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        if (!this.allowedExtensions.includes(fileExt)) {
          return `Format berkas lampiran "${file.name}" tidak didukung. Harap unggah berkas dengan format: ${this.allowedExtensions.join(', ').toUpperCase()}.`;
        }
      }
    }

    return super.handle(request);
  }
}
