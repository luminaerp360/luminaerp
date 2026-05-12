# Ticketing System Implementation Guide

## Overview

A complete support ticketing system that allows users to raise support tickets and super admins to manage tickets across all organizations.

## Database Schema

### Ticket Model

- **id**: Unique identifier
- **organizationId**: Organization the ticket belongs to
- **userId**: User who created the ticket
- **title**: Short description
- **description**: Detailed problem description
- **priority**: LOW, MEDIUM, HIGH, URGENT
- **status**: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- **category**: BUG, FEATURE_REQUEST, QUESTION, TECHNICAL_ISSUE, BILLING, OTHER
- **assignedToId**: Admin assigned to handle ticket (optional)
- **responses**: Array of responses/comments
- **resolvedAt**: When ticket was resolved
- **createdAt**, **updatedAt**: Timestamps

### TicketResponse Model

- **id**: Unique identifier
- **ticketId**: Reference to ticket
- **userId**: User who created the response
- **message**: Response content
- **isAdmin**: Whether response is from admin
- **createdAt**, **updatedAt**: Timestamps

## API Endpoints

### User Endpoints (Organization Scoped)

#### Create Ticket

```http
POST /organizations/:organizationId/tickets
```

**Body:**

```json
{
  "userId": 1,
  "title": "Cannot login to system",
  "description": "I get an error when trying to login...",
  "priority": "HIGH",
  "category": "TECHNICAL_ISSUE"
}
```

#### Get Organization Tickets

```http
GET /organizations/:organizationId/tickets?status=OPEN&priority=HIGH&page=1&limit=20
```

#### Get Ticket by ID

```http
GET /organizations/:organizationId/tickets/:id
```

#### Update Ticket

```http
PUT /organizations/:organizationId/tickets/:id
```

**Body:**

```json
{
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "assignedToId": 5
}
```

#### Add Response/Comment

```http
POST /organizations/:organizationId/tickets/:id/responses
```

**Body:**

```json
{
  "userId": 1,
  "message": "I also tried resetting my password but still can't login",
  "isAdmin": false
}
```

#### Delete Ticket

```http
DELETE /organizations/:organizationId/tickets/:id
```

#### Get Ticket Statistics

```http
GET /organizations/:organizationId/tickets/stats
```

### Super Admin Endpoints (Global Access)

#### Get All Tickets (All Organizations)

```http
GET /admin/tickets?status=OPEN&priority=URGENT&page=1&limit=20
```

Returns tickets from ALL organizations - similar to how admin gets all users.

#### Get Global Ticket Statistics

```http
GET /admin/tickets/stats
```

#### Get Any Ticket by ID

```http
GET /admin/tickets/:id
```

#### Update Any Ticket

```http
PUT /admin/tickets/:id
```

**Body:**

```json
{
  "status": "RESOLVED",
  "priority": "MEDIUM"
}
```

#### Add Admin Response

```http
POST /admin/tickets/:id/responses
```

**Body:**

```json
{
  "userId": 5,
  "message": "We've fixed the login issue. Please try again.",
  "isAdmin": true
}
```

Note: `isAdmin` is automatically set to `true` for admin responses.

#### Delete Any Ticket

```http
DELETE /admin/tickets/:id
```

## Features

### Priority Levels

- **LOW**: Minor issues, cosmetic problems
- **MEDIUM**: Standard issues (default)
- **HIGH**: Important issues affecting functionality
- **URGENT**: Critical issues blocking work

### Status Flow

1. **OPEN** → New ticket created
2. **IN_PROGRESS** → Admin has responded/working on it
3. **RESOLVED** → Issue fixed, awaiting user confirmation
4. **CLOSED** → Ticket completed and closed

### Categories

- **BUG**: Software bugs/errors
- **FEATURE_REQUEST**: New feature suggestions
- **QUESTION**: General questions
- **TECHNICAL_ISSUE**: Technical problems
- **BILLING**: Payment/subscription issues
- **OTHER**: Miscellaneous (default)

### Auto-Status Updates

- When admin first responds to an OPEN ticket → Status changes to IN_PROGRESS
- When status set to RESOLVED or CLOSED → `resolvedAt` timestamp is set

## Usage Examples

### User Creates Ticket

```javascript
// User reports an issue
POST /organizations/1/tickets
{
  "userId": 10,
  "title": "Sales report not generating",
  "description": "When I try to generate the monthly sales report, I get an error: 'Data not found'",
  "priority": "HIGH",
  "category": "BUG"
}
```

### Super Admin Views All Tickets

```javascript
// Admin sees all tickets from all organizations
GET /admin/tickets?status=OPEN&priority=HIGH

Response:
{
  "data": [
    {
      "id": 15,
      "title": "Sales report not generating",
      "status": "OPEN",
      "priority": "HIGH",
      "organization": {
        "id": 1,
        "name": "ABC Company"
      },
      "user": {
        "id": 10,
        "fullName": "John Doe",
        "email": "john@abc.com"
      },
      "_count": {
        "responses": 0
      }
    },
    {
      "id": 14,
      "title": "Cannot access inventory",
      "status": "OPEN",
      "priority": "HIGH",
      "organization": {
        "id": 5,
        "name": "XYZ Corp"
      },
      ...
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}
```

### Admin Responds to Ticket

```javascript
// Admin provides solution
POST /admin/tickets/15/responses
{
  "userId": 1, // Admin user ID
  "message": "I've identified the issue. The report module was missing data permissions. I've fixed it. Please try generating the report again."
}

// This automatically:
// 1. Sets isAdmin: true
// 2. Changes ticket status to IN_PROGRESS
```

### User Confirms Fixed

```javascript
// User adds follow-up
POST /organizations/1/tickets/15/responses
{
  "userId": 10,
  "message": "Yes, it works now! Thank you!"
}

// Admin marks as resolved
PUT /admin/tickets/15
{
  "status": "RESOLVED"
}
```

## Next Steps

1. **Run Migration**:

   ```bash
   npx prisma migrate dev --name add_tickets
   ```

2. **Test Endpoints**: Backend is ready, test with:
   - Create tickets from user accounts
   - View tickets as super admin at `/admin/tickets`
   - Add responses and update statuses

3. **Frontend Integration** (Next):
   - Create ticket submission form for users
   - Create admin dashboard to view/manage tickets
   - Add real-time notifications for new tickets

## Notes

- All endpoints require authentication (JwtGuard)
- Organization-scoped endpoints validate organization access
- Admin endpoints have global access similar to `/users/all`
- Tickets cascade delete - deleting a ticket deletes all responses
