import { Component } from '@angular/core';
import { DocumentType } from '../../../../shared/interfaces/settings.interface';

@Component({
  selector: 'app-document-templates',
  templateUrl: './document-templates.component.html',
})
export class DocumentTemplatesComponent {
  docSettingsOpen: DocumentType | null = null;
}
