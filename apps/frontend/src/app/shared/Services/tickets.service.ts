import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketCategory {
  BUG = 'BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  QUESTION = 'QUESTION',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  BILLING = 'BILLING',
  OTHER = 'OTHER',
}

export interface Ticket {
  id: number;
  organizationId: number;
  userId: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  assignedToId?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
  organization?: {
    id: number;
    name: string;
  };
  responses?: TicketResponse[];
  _count?: {
    responses: number;
  };
}

export interface TicketResponse {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  userId: number;
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}

export interface UpdateTicketDto {
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedToId?: number;
}

export interface CreateResponseDto {
  userId: number;
  message: string;
  isAdmin?: boolean;
}

export interface FilterTicketsDto {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  userId?: number;
  page?: number;
  limit?: number;
}

export interface TicketsResponse {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketStats {
  total: number;
  byStatus: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class TicketsService {
  private apiUrl = `${environment.apiRootUrl}tickets`;

  constructor(private http: HttpClient) {}

  createTicket(dto: CreateTicketDto): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, dto);
  }

  getTickets(filters?: FilterTicketsDto): Observable<TicketsResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<TicketsResponse>(this.apiUrl, { params });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  updateTicket(id: number, dto: UpdateTicketDto): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}`, dto);
  }

  addResponse(
    ticketId: number,
    dto: CreateResponseDto,
  ): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(
      `${this.apiUrl}/${ticketId}/responses`,
      dto,
    );
  }

  deleteTicket(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getTicketStats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.apiUrl}/stats`);
  }
}
