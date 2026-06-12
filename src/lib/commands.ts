import { dbAdapter } from './dbAdapter';
import { logAudit } from './audit';
import { LhuDocument } from '../types';

export interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
}

export class ApproveDocumentCommand implements Command {
  private docId: string;
  private currentStatus: string;
  private nextStatus: string;
  private notes: string;
  private actor: string;
  private docTitle: string;
  private docNumber: string;

  private checklist: string[];

  constructor(
    doc: LhuDocument,
    nextStatus: string,
    notes: string,
    actor: string,
    checklist: string[] = []
  ) {
    this.docId = doc.id;
    this.currentStatus = doc.status;
    this.nextStatus = nextStatus;
    this.notes = notes;
    this.actor = actor;
    this.docTitle = doc.judul;
    this.docNumber = doc.kode_lhu || `LHU-${String(doc.nomor_lhu).padStart(3, '0')}`;
    this.checklist = checklist;
  }

  async execute(): Promise<void> {
    await dbAdapter.updateDocumentStatus(this.docId, this.nextStatus, { 
      catatan_spv: this.notes,
      checked_supervisor_by: this.actor,
      checked_supervisor_at: new Date().toISOString(),
      spv_checklist: this.checklist,
      updated_at: new Date().toISOString()
    });

    await logAudit(
      this.actor, 
      'supervisor', 
      'APPROVE_LHU', 
      `Mengaudit LHU: ${this.docNumber} - ${this.docTitle} (Disetujui untuk Penomoran)`
    );
  }

  async undo(): Promise<void> {
    await dbAdapter.updateDocumentStatus(this.docId, this.currentStatus);
  }
}

export class RejectDocumentCommand implements Command {
  private docId: string;
  private currentStatus: string;
  private notes: string;
  private actor: string;
  private docTitle: string;
  private docNumber: string;

  private checklist: string[];

  constructor(
    doc: LhuDocument,
    notes: string,
    actor: string,
    checklist: string[] = []
  ) {
    this.docId = doc.id;
    this.currentStatus = doc.status;
    this.notes = notes;
    this.actor = actor;
    this.docTitle = doc.judul;
    this.docNumber = doc.kode_lhu || `LHU-${String(doc.nomor_lhu).padStart(3, '0')}`;
    this.checklist = checklist;
  }

  async execute(): Promise<void> {
    await dbAdapter.updateDocumentStatus(this.docId, 'PENDING_ADMIN', { 
      catatan_spv: this.notes,
      checked_supervisor_by: this.actor,
      checked_supervisor_at: new Date().toISOString(),
      spv_checklist: this.checklist,
      updated_at: new Date().toISOString()
    });

    await logAudit(
      this.actor, 
      'supervisor', 
      'RETURN_LHU_FOR_REVISION', 
      `Mengembalikan LHU ke Admin untuk revisi: ${this.docNumber} - ${this.docTitle}`
    );
  }

  async undo(): Promise<void> {
    await dbAdapter.updateDocumentStatus(this.docId, this.currentStatus);
  }
}
