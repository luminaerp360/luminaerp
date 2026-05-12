# Super Admin User Organization Assignment API

This document describes the new endpoints added to allow super admins to assign users to organizations and manage cross-organization access.

## Overview

The Super Admin can now:

1. Assign individual users to organizations with specific roles
2. Bulk assign multiple users to organizations
3. Revoke user access from organizations
4. View all user organization assignments
5. View assignments for a specific user

## Endpoints

### 1. Assign User to Organization

**POST** `/super-admin/assign-user-organization`

Assigns a single user to an organization with a specific role.

**Request Body:**

```json
{
  "userId": 123,
  "organizationId": 456,
  "role": "Admin",
  "notes": "Optional notes about the assignment"
}
```

**Roles Available:**

- `Admin` - Full permissions within the organization
- `Manager` - Most permissions except user management
- `Sales` - Sales-related permissions only
- `User` - Basic permissions

**Response:**

```json
{
  "success": true,
  "message": "Successfully assigned John Doe to ABC Company with Admin role",
  "assignment": {
    "userId": 123,
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "organizationId": 456,
    "organizationName": "ABC Company",
    "role": "Admin",
    "permissions": {
      "lpo": true,
      "sales": true,
      "stock": true
      // ... other permissions
    },
    "assignedAt": "2025-09-04T10:00:00.000Z",
    "updatedAt": "2025-09-04T10:00:00.000Z"
  }
}
```

### 2. Bulk Assign Users to Organizations

**POST** `/super-admin/bulk-assign-user-organizations`

Assigns multiple users to organizations in a single request.

**Request Body:**

```json
{
  "assignments": [
    {
      "userId": 123,
      "organizationId": 456,
      "role": "Admin"
    },
    {
      "userId": 124,
      "organizationId": 457,
      "role": "Sales"
    },
    {
      "userId": 125,
      "organizationId": 456,
      "role": "User"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "totalAssignments": 3,
  "successfulAssignments": 2,
  "failedAssignments": 1,
  "results": [
    {
      "success": true,
      "message": "Successfully assigned John Doe to ABC Company with Admin role",
      "assignment": {
        // ... assignment details
      }
    }
  ],
  "errors": [
    {
      "assignment": {
        "userId": 124,
        "organizationId": 457,
        "role": "Sales"
      },
      "error": "User not found"
    }
  ]
}
```

### 3. Revoke User Organization Access

**DELETE** `/super-admin/revoke-user-organization`

Revokes a user's access to a specific organization.

**Request Body:**

```json
{
  "userId": 123,
  "organizationId": 456
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully revoked John Doe's access to ABC Company",
  "revocation": {
    "userId": 123,
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "organizationId": 456,
    "organizationName": "ABC Company",
    "revokedAt": "2025-09-04T10:00:00.000Z"
  }
}
```

### 4. Get All User Organization Assignments

**GET** `/super-admin/user-organization-assignments`

Retrieves all user organization assignments across the system.

**Response:**

```json
{
  "totalAssignments": 150,
  "activeAssignments": 140,
  "inactiveAssignments": 10,
  "assignments": [
    {
      "id": 1,
      "userId": 123,
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "userPrimaryOrg": "John's Primary Company",
      "organizationId": 456,
      "organizationName": "ABC Company",
      "organizationAddress": "123 Business St",
      "role": "Admin",
      "permissions": {
        // ... permissions object
      },
      "isActive": true,
      "createdAt": "2025-09-01T10:00:00.000Z",
      "updatedAt": "2025-09-04T10:00:00.000Z",
      "lastAccessedAt": "2025-09-04T09:30:00.000Z"
    }
    // ... more assignments
  ]
}
```

### 5. Get User Organization Assignments for Specific User

**GET** `/super-admin/user-organization-assignments/{userId}`

Retrieves all organization assignments for a specific user.

**Response:**

```json
{
  "user": {
    "id": 123,
    "fullName": "John Doe",
    "email": "john@example.com",
    "primaryOrganization": {
      "id": 1,
      "name": "John's Primary Company"
    }
  },
  "totalAssignments": 3,
  "activeAssignments": 2,
  "assignments": [
    {
      "organizationId": 456,
      "organizationName": "ABC Company",
      "organizationAddress": "123 Business St",
      "role": "Admin",
      "permissions": {
        // ... permissions object
      },
      "isActive": true,
      "createdAt": "2025-09-01T10:00:00.000Z",
      "updatedAt": "2025-09-04T10:00:00.000Z",
      "lastAccessedAt": "2025-09-04T09:30:00.000Z"
    }
    // ... more assignments
  ]
}
```

## Authentication

All endpoints require super admin authentication. Include the super admin JWT token in the Authorization header:

```
Authorization: Bearer <super_admin_jwt_token>
```

## Error Responses

### Common Error Cases

1. **User Not Found (404)**

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

2. **Organization Not Found (404)**

```json
{
  "statusCode": 404,
  "message": "Organization not found"
}
```

3. **User Already in Organization (403)**

```json
{
  "statusCode": 403,
  "message": "User already belongs to ABC Company as their primary organization"
}
```

4. **Cannot Revoke Primary Organization Access (403)**

```json
{
  "statusCode": 403,
  "message": "Cannot revoke access to user's primary organization"
}
```

5. **Validation Error (400)**

```json
{
  "statusCode": 400,
  "message": [
    "userId must be a number",
    "organizationId must be a number",
    "role must be one of the following values: Admin, User, Sales, Manager"
  ]
}
```

## Usage Examples

### Example 1: Assign a Sales Person to Multiple Organizations

```bash
# First, assign the user to Organization A as Sales role
curl -X POST https://your-api.com/super-admin/assign-user-organization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{
    "userId": 789,
    "organizationId": 100,
    "role": "Sales"
  }'

# Then assign the same user to Organization B as Sales role
curl -X POST https://your-api.com/super-admin/assign-user-organization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{
    "userId": 789,
    "organizationId": 200,
    "role": "Sales"
  }'
```

### Example 2: Bulk Assign Multiple Users to Same Organization

```bash
curl -X POST https://your-api.com/super-admin/bulk-assign-user-organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{
    "assignments": [
      {"userId": 101, "organizationId": 500, "role": "User"},
      {"userId": 102, "organizationId": 500, "role": "Sales"},
      {"userId": 103, "organizationId": 500, "role": "Admin"}
    ]
  }'
```

### Example 3: Check User's Organization Access

```bash
# Get all assignments for user ID 789
curl -X GET https://your-api.com/super-admin/user-organization-assignments/789 \
  -H "Authorization: Bearer <super_admin_token>"
```

## Integration with Existing System

These endpoints work seamlessly with the existing multi-organization authentication system:

1. When users are assigned to organizations, they can use the existing login endpoints
2. The `signInWithLastOrganization` method will work with newly assigned organizations
3. All existing access control mechanisms will respect the new assignments
4. Stock transfer and other cross-organization features will work automatically

## Notes

- Users cannot be assigned to their primary organization (they already belong to it)
- Super admin can assign users to any organization regardless of current access
- Role permissions are automatically calculated based on the role assigned
- Inactive assignments are kept for audit purposes
- Last accessed timestamps are updated when users login to assigned organizations
