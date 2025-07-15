# ChatGPT Builder (CGB) API Reference

**Version:** 1.1  
**Base URL:** `app.chatgptbuilder.io/api/`  
**Used by:** VisAPI WhatsApp Integration (`@visapi/backend-core-cgb`)  
**Documentation Status:** Reference documentation for CGB API integration

## Purpose

This document serves as the complete API reference for integrating with ChatGPT Builder's WhatsApp messaging platform. It was used to implement the VisAPI WhatsApp connector in Sprint 3.0.

## VisAPI Integration

**Implemented in**: `libs/backend/core-cgb/`  
**Implementation docs**: `docs/sprint-3.0-whatsapp.md`  
**Key services**:
- `CgbClientService` - HTTP client for CGB API
- `ContactResolverService` - Phone number to contact resolution  
- `TemplateService` - Template to flow mapping

## Key Endpoints Used by VisAPI

| Endpoint | Purpose | VisAPI Usage |
|----------|---------|--------------|
| `POST /contacts` | Create contact | Auto-create contacts from phone numbers |
| `GET /contacts/find_by_custom_field` | Find contact by phone | Resolve phone → contact ID |
| `POST /contacts/{id}/send/text` | Send text message | Basic WhatsApp messaging |
| `POST /contacts/{id}/send/file` | Send media | File/image WhatsApp messages |
| `POST /contacts/{id}/send/{flowId}` | Send flow | Template-based messaging |
| `GET /accounts/flows` | List flows | Template discovery and mapping |

## Implementation Notes

- **Contact-Centric**: All messaging requires contact ID, not direct phone numbers
- **Channel Specification**: WhatsApp = channel 5, specified as "whatsapp" in requests
- **Authentication**: Bearer token via Authorization header
- **Error Handling**: HTTP status codes + success/error response format
- **Rate Limiting**: Implement exponential backoff (not documented in API)

---

**For complete API reference, see the full documentation below.**

---# ChatGPTBuilder.io API Docs 1.1

**Base URL:** `app.chatgptbuilder.io/api/`

**Schemes:** https

**Authorize**

---
## Accounts

### `GET /accounts/me`

Get business account details.

#### Parameters
No parameters

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "page_id": 0,
  "name": "string",
  "active": true,
  "created": 0,
  "total_users": 0
}
```
---
### `GET /accounts/admins`

Get all admins from a business account.

#### Parameters
No parameters

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "full_name": "string",
    "profile_pic": "string"
  }
]
```
---
### `GET /accounts/tags`

Get all tags from a business account.

#### Parameters
No parameters

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "name": "string"
  }
]
```
---
### `POST /accounts/tags`

Create a new tag

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `name` * | `string` | formData |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 1995
}
```
---
### `GET /accounts/tags/{tag_id}`

Get tag by id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `tag_id` * | `integer($int64)` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string"
}
```
---
### `DELETE /accounts/tags/{tag_id}`

Delete a tag

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `tag_id` * | `integer($int64)` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `GET /accounts/tags/name/{tag_name}`

Get a tag by name

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `tag_name` * | `string` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string"
}
```
---
### `GET /accounts/flows`

Get all flows from a business account.

#### Parameters
No parameters

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "name": "string"
  }
]
```
---
### `GET /accounts/custom_fields`

Get all custom fields from a business account.

#### Parameters
No parameters

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "name": "string",
    "type": 0,
    "description": "string"
  }
]
```
---
### `POST /accounts/custom_fields`

Create a custom field

#### Parameters
Body `content`
**Parameter content type:** `application/json`

**Example Value**
```json
{
  "name": "lead_score",
  "type": 1
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 1995,
  "name": "lead_score"
}
```
---
### `GET /accounts/custom_fields/{custom_field_id}`

Get custom field by id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `custom_field_id` * | `integer($int64)` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string",
  "type": 0,
  "description": "string"
}
```
---
### `GET /accounts/custom_fields/name/{custom_field_name}`

Get custom field by name

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `custom_field_name` * | `string` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string",
  "type": 0,
  "description": "string"
}
```
---
### `GET /accounts/bot_fields/{bot_field_id}`

Get bot field value by id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `bot_field_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 2334,
  "name": "age",
  "type": 1,
  "value": 25
}
```
---
### `POST /accounts/bot_fields/{bot_field_id}`

Set a bot field value

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `bot_field_id` * | `integer` | path |
| `value` * | `string` | formData |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `DELETE /accounts/bot_fields/{bot_field_id}`

Unset the value of a bot field

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `bot_field_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /accounts/template/{template_id}/generateSingleUseLink`

Generate single-use template link

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `template_id` * | `integer` | path | You can get template ID from the template link |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "link": "https://..."
}
```
---
## Contacts

### `GET /contacts/{contact_id}`

Get contact by contact id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |
| 400 | Invalid username supplied |
| 404 | User not found |

**Example Value**
```json
{
  "id": 0,
  "page_id": 0,
  "first_name": "string",
  "last_name": "string",
  "channel": 0,
  "profile_pic": "string",
  "locale": "string",
  "gender": 0,
  "timezone": 0,
  "last_sent": 0,
  "last_delivered": 0,
  "last_seen": 0,
  "last_interaction": 0,
  "subscribed_date": "string",
  "subscribed": 0,
  "tags": [
    {
      "id": 0,
      "name": "string"
    }
  ],
  "custom_fields": [
    {
      "id": 0,
      "name": "string",
      "type": 0,
      "value": "string"
    }
  ]
}
```
---
### `GET /contacts/find_by_custom_field`

Find contacts by custom field value. It will return maximum 100 contacts. The results are sorted by the last custom field value update for a contact.

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `field_id` * | `string` | query | Custom field ID. Use ‘phone’ or ‘email’ as custom field id if you want to find the contact by phone or email |
| `value` * | `string` | query | |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |
| 400 | Invalid parameters |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "page_id": 0,
      "first_name": "string",
      "last_name": "string",
      "channel": 0,
      "profile_pic": "string",
      "locale": "string",
      "gender": 0,
      "timezone": 0,
      "last_sent": 0,
      "last_delivered": 0,
      "last_seen": 0,
      "last_interaction": 0,
      "subscribed_date": "string",
      "subscribed": 0,
      "tags": [
        {
          "id": 0,
          "name": "string"
        }
      ],
      "custom_fields": [
        {
          "id": 0,
          "name": "string",
          "type": 0,
          "value": "string"
        }
      ]
    }
  ]
}
```
---
### `GET /contacts/{contact_id}/tags`

Get all tags added to this contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "name": "string"
  }
]
```
---
### `POST /contacts/{contact_id}/tags/{tag_id}`

Add a tag to the contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `tag_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `DELETE /contacts/{contact_id}/tags/{tag_id}`

remove a tag from the contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `tag_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts`

Creates a new contact.

#### Parameters
Body `content` *

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "phone": "+1234567890",
  "email": "test@test.com",
  "first_name": "John",
  "last_name": "Smith",
  "gender": "male",
  "actions": [
    {
      "action": "add_tag",
      "tag_name": "YOU_TAG_NAME"
    },
    {
      "action": "set_field_value",
      "field_name": "YOU_CUSTOM_FIELD_NAME",
      "value": "ANY_VALUE"
    },
    {
      "action": "send_flow",
      "flow_id": 11111
    }
  ]
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

---
### `GET /contacts/{contact_id}/custom_fields`

Get all custom fields from a contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
[
  {
    "id": 0,
    "name": "string",
    "type": 0,
    "value": "string"
  }
]
```
---
### `GET /contacts/{contact_id}/custom_fields/{custom_field_id}`

Get custom field value by id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `custom_field_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 2334,
  "name": "age",
  "type": 1,
  "value": 25
}
```
---
### `POST /contacts/{contact_id}/custom_fields/{custom_field_id}`

Set a contact custom field

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `custom_field_id` * | `string` | path |
| `value` * | `string` | formData |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `DELETE /contacts/{contact_id}/custom_fields/{custom_field_id}`

remove a custom field from the contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `custom_field_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts/{contact_id}/send/{flow_id}`

Send a flow to contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `flow_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

---
### `POST /contacts/{contact_id}/send/text`

Send text message to the contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "text": "This is a text message",
  "channel": "messenger"
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts/{contact_id}/send/file`

Send file

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "url": "https://...",
  "type": "image",
  "channel": "messenger"
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts/{contact_id}/send_content`

Allows to run multiple actions and send multiple messages. Works for all channels.

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "messages": [
    {
      "message": {
        "text": "Hello world"
      }
    }
  ],
  "actions": [],
  "channel": "messenger"
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

---
## Pipelines

### `GET /pipelines/`

Get list of pipelines

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `offset` | `integer` | query | Specifies the starting position of the first record to return in a paginated response. Default value : 0 |
| `limit` | `integer` | query | Sets the maximum number of records to return per request. Default value : 100 |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "name": "string"
    }
  ]
}
```
---
### `GET /pipelines/{pipeline_id}`

Get list of pipelines

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string"
}
```
---
### `GET /pipelines/{pipeline_id}/stages`

Get list of pipeline stages

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "name": "string"
    }
  ]
}
```
---
### `GET /pipelines/{pipeline_id}/opportunities`

Get list of opportunities / tickets

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `pipeline_id` * | `number` | path | |
| `contact_id` | `number` | query | The ID of the contact to filter the opportunities. |
| `offset` | `integer` | query | Specifies the starting position of the first record to return in a paginated response. Default value : 0 |
| `limit` | `integer` | query | Sets the maximum number of records to return per request. Default value : 100 |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "contact_id": 0,
      "title": "string",
      "description": "string",
      "value": 0,
      "status": "string",
      "priority": "string",
      "stage": {
        "id": 0,
        "name": "string"
      },
      "assigned_admins": [
        0
      ],
      "created_at": "2028-02-08 12:34:56",
      "created_by": 0,
      "updated_at": "2028-02-08 12:34:56",
      "updated_by": 0
    }
  ]
}
```
---
### `POST /pipelines/{pipeline_id}/opportunities`

Creates an opportunity / ticket.

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `pipeline_id` * | `number` | path | |
| `content` * | `body` | | Creates an opportunity / ticket |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "contact_id": "12345678",
  "title": "This is a test opportunity",
  "description": "...",
  "stage_id": 12334,
  "value": 300,
  "status": "open",
  "priority": "low",
  "assigned_admins": [
    55446563
  ]
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "contact_id": 0,
      "title": "string",
      "description": "string",
      "value": 0,
      "status": "string",
      "priority": "string",
      "stage": {
        "id": 0,
        "name": "string"
      },
      "assigned_admins": [
        0
      ],
      "created_at": "2028-02-08 12:34:56",
      "created_by": 0,
      "updated_at": "2028-02-08 12:34:56",
      "updated_by": 0
    }
  ]
}
```
---
### `GET /pipelines/{pipeline_id}/opportunities/{opportunity_id}`

Get an opportunity / ticket

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |
| `opportunity_id` * | `number` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "contact_id": 0,
  "title": "string",
  "description": "string",
  "value": 0,
  "status": "string",
  "priority": "string",
  "stage": {
    "id": 0,
    "name": "string"
  },
  "assigned_admins": [
    0
  ],
  "created_at": "2028-02-08 12:34:56",
  "created_by": 0,
  "updated_at": "2028-02-08 12:34:56",
  "updated_by": 0
}
```
---
### `POST /pipelines/{pipeline_id}/opportunities/{opportunity_id}`

Updates an opportunity / ticket.

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |
| `opportunity_id` * | `number` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "title": "This is a test opportunity",
  "description": "...",
  "stage_id": 12334,
  "value": 300,
  "status": "open",
  "priority": "low",
  "assigned_admins": [
    55446563
  ]
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `DELETE /pipelines/{pipeline_id}/opportunities/{opportunity_id}`

Delete an opportunity / ticket

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |
| `opportunity_id` * | `number` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `GET /pipelines/{pipeline_id}/opportunities/{opportunity_id}/comments`

Get list of comments of an opportunity / ticket

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `pipeline_id` * | `number` | path | |
| `opportunity_id` * | `number` | path | |
| `offset` | `integer` | query | Specifies the starting position of the first record to return in a paginated response. Default value : 0 |
| `limit` | `integer` | query | Sets the maximum number of records to return per request. Default value : 100 |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

**Example Value**
```json
{
  "data": [
    {
      "id": 0,
      "data": "string",
      "created_at": "2028-02-08 12:34:56",
      "created_by": 0
    }
  ]
}
```
---
### `POST /pipelines/{pipeline_id}/opportunities/{opportunity_id}/comments`

Creates a new comment on an opportunity / ticket.

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |
| `opportunity_id` * | `number` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "content": "This is a comment"
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "data": "string",
  "created_at": "2028-02-08 12:34:56",
  "created_by": 0
}
```
---
### `DELETE /pipelines/{pipeline_id}/opportunities/{opportunity_id}/comments/{comment_id}`

Delete a comment of an opportunity / ticket

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `pipeline_id` * | `number` | path |
| `opportunity_id` * | `number` | path |
| `comment_id` * | `number` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
## Ecommerce

### `POST /contacts/{contact_id}/send/products`

Send a product message to the contact

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `data` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "product_id": [
    1111,
    222,
    3333
  ]
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| default | successful operation |

---
### `GET /contacts/{contact_id}/cart`

Get the contact cart ready for checkout

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "order_id": "string",
  "page_id": 0,
  "user_id": 0,
  "currency": "string",
  "total": 0,
  "subtotal": 0,
  "total_items": 0,
  "coupon_discount": 0,
  "coupon": "string",
  "line_items": [
    {
      "id": 0,
      "name": "string",
      "img": "string",
      "price": 0,
      "amount": 0,
      "descr_min": "string",
      "manufacturer": 0,
      "variant": "string",
      "user_msg": "string"
    }
  ],
  "contact": {
    "id": 0,
    "page_id": 0,
    "first_name": "string",
    "last_name": "string",
    "channel": 0,
    "profile_pic": "string",
    "locale": "string",
    "gender": 0,
    "timezone": 0,
    "last_sent": 0,
    "last_delivered": 0,
    "last_seen": 0,
    "last_interaction": 0,
    "subscribed_date": "string",
    "subscribed": 0,
    "tags": [
      {
        "id": 0,
        "name": "string"
      }
    ],
    "custom_fields": [
      {
        "id": 0,
        "name": "string",
        "type": 0,
        "value": "string"
      }
    ]
  }
}
```
---
### `DELETE /contacts/{contact_id}/cart`

Clear the contact cart

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts/{contact_id}/pay/{order_id}`

Mark an order as Paid.

#### Parameters
| Name | Type | In | Description |
| :--- | :--- | :--- | :--- |
| `contact_id` * | `integer` | path | |
| `order_id` * | `string` | path | |
| `amount_received` * | `integer` | formData | Total value the contact paid in cents. |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |
| 400 | The amount received is less than the total value of the order. |
| 402 | The contact received a message on Messenger why the checkout failed. |
| 404 | The order ID doesn’t existe |

**Example Value**
```json
{
  "success": true
}
```
---
### `GET /contacts/{contact_id}/order/{order_id}`

Get order information

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `order_id` * | `string` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "order_id": "string",
  "page_id": 0,
  "user_id": 0,
  "currency": "string",
  "total": 0,
  "subtotal": 0,
  "total_items": 0,
  "coupon_discount": 0,
  "coupon": "string",
  "line_items": [
    {
      "id": 0,
      "name": "string",
      "img": "string",
      "price": 0,
      "amount": 0,
      "descr_min": "string",
      "manufacturer": 0,
      "variant": "string",
      "user_msg": "string"
    }
  ],
  "contact": {
    "id": 0,
    "page_id": 0,
    "first_name": "string",
    "last_name": "string",
    "channel": 0,
    "profile_pic": "string",
    "locale": "string",
    "gender": 0,
    "timezone": 0,
    "last_sent": 0,
    "last_delivered": 0,
    "last_seen": 0,
    "last_interaction": 0,
    "subscribed_date": "string",
    "subscribed": 0,
    "tags": [
      {
        "id": 0,
        "name": "string"
      }
    ],
    "custom_fields": [
      {
        "id": 0,
        "name": "string",
        "type": 0,
        "value": "string"
      }
    ]
  }
}
```
---
### `POST /contacts/{contact_id}/order/{order_id}`

Change order status.

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `order_id` * | `string` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "status": 7
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |
| 400 | Order status must be 6, 7, 10, or 13 |
| 402 | The order status is the same as the previous status |
| 404 | The order ID doesn’t existe |

**Example Value**
```json
{
  "success": true
}
```
---
### `POST /contacts/{contact_id}/cart/{product_id}`

Add a product to contact cart

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `product_id` * | `integer` | path |
| `quantity` * | `integer` | formData |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `DELETE /contacts/{contact_id}/cart/{product_id}`

remove a product from contact cart

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `contact_id` * | `integer` | path |
| `product_id` * | `integer` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true
}
```
---
### `GET /products/{product_id}`

Get product by id

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `product_id` * | `integer($int64)` | path |

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "id": 0,
  "name": "string",
  "price": 0,
  "sale_price": 0,
  "category_id": 0,
  "category_name": "string",
  "stock": 0,
  "short_description": "string",
  "image": "string",
  "created_at": "string"
}
```
---
### `POST /products/{product_id}`

Update product.

#### Parameters
| Name | Type | In |
| :--- | :--- | :--- |
| `product_id` * | `number` | path |
| `content` * | `body` | |

**Parameter content type:** `application/json`

**Example Value**
```json
{
  "active": false,
  "stock": 500,
  "price": 40
}
```

#### Responses
**Response content type:** `application/json`

| Code | Description |
| :--- | :--- |
| 200 | successful operation |

**Example Value**
```json
{
  "success": true,
  "updated": true
}
```
---
## Models

### `Cart`
*All value related to money is in cents*
| Field | Type | Description |
| :--- | :--- | :--- |
| `order_id` | `string` | |
| `page_id` | `integer($int64)` | |
| `user_id` | `integer($int64)` | The contact ID |
| `currency` | `string` | |
| `total` | `integer($int64)` | |
| `subtotal` | `integer($int64)` | |
| `total_items` | `integer($int32)` | |
| `coupon_discount` | `integer($int64)` | |
| `coupon` | `string` | |
| `line_items` | `[...]` | |
| `contact` | `Contact{...}` | |

### `Order`
*All value related to money is in cents*
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | |
| `page_id` | `integer($int64)` | |
| `user_id` | `integer($int64)` | The contact ID |
| `created_at` | `string` | Subscribed date in UTC. Example 2022-10-12 14:40:00 |
| `created_timestamp` | `integer($int32)` | Date of the order in epoch/Unix timestamp |
| `currency` | `string` | |
| `total` | `integer($int64)` | |
| `subtotal` | `integer($int64)` | |
| `shipping_cost` | `integer($int64)` | |
| `total_taxes` | `integer($int64)` | |
| `total_discounts` | `integer($int64)` | |
| `total_items` | `integer($int32)` | |
| `coupon_discount` | `integer($int64)` | |
| `coupon` | `string` | |
| `status` | `string` | Enum: Array [ 5 ] |
| `line_items` | `[...]` | |
| `contact` | `Contact{...}` | |

### `ProductCart`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `integer($int64)` | |
| `name` | `string` | |
| `img` | `string` | |
| `price` | `number($double)` | the price is not in cents |
| `amount` | `integer` | quantity |
| `descr_min` | `string` | |
| `manufacturer` | `integer` | The vendor ID |
| `variant` | `string` | |
| `user_msg` | `string` | |

### `Custom_field`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `integer($int64)` | |
| `name` | `string` | |
| `type` | `integer` | 0 - Text, 1 - Number, 2- Date (Unix timestamp), 3 - Date & Time (Unix timestamp), 4 - Boolean(0 or 1), 5- Long Text, 6 - Select, 7 - Multi Select Enum: Array [ 8 ] |
| `value` | `string` | type == 0 then value is string, else value is a number |

### `Admin`
| Field | Type |
| :--- | :--- |
| `id` | `integer($int64)` |
| `email` | `string` |
| `first_name` | `string` |
| `last_name` | `string` |
| `full_name` | `string` |
| `profile_pic` | `string` |

### `Tag`
| Field | Type |
| :--- | :--- |
| `id` | `integer($int64)` |
| `name` | `string` |

### `Pipeline`
| Field | Type |
| :--- | :--- |
| `id` | `number($int64)` |
| `name` | `string` |

### `PipelineStage`
| Field | Type |
| :--- | :--- |
| `id` | `number($int64)` |
| `name` | `string` |

### `OpportunityComment`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number($int64)` | |
| `data` | `string` | |
| `created_at` | `string` | example: 2028-02-08 12:34:56 UTC |
| `created_by` | `number` | Admin ID |

### `Opportunity`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | |
| `contact_id` | `number` | |
| `title` | `string` | |
| `description` | `string` | |
| `value` | `number` | |
| `status` | `string` | |
| `priority` | `string` | |
| `stage` | `{...}` | |
| `assigned_admins` | `[...]` | |
| `created_at` | `string` | example: 2028-02-08 12:34:56 UTC |
| `created_by` | `number` | Admin ID |
| `updated_at` | `string` | example: 2028-02-08 12:34:56 UTC |
| `updated_by` | `number` | Admin ID |

### `Product`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `integer($int64)` | |
| `name` | `string` | |
| `price` | `number($double)` | |
| `sale_price` | `number($double)` | |
| `category_id` | `integer($int64)` | |
| `category_name` | `string` | |
| `stock` | `integer($int64)` | |
| `short_description` | `string` | |
| `image` | `string` | |
| `created_at` | `string` | Subscribed date in UTC. Example 2022-10-12 14:40:00 |

### `Contact`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `integer($int64)` | |
| `page_id` | `integer($int64)` | |
| `first_name` | `string` | |
| `last_name` | `string` | |
| `channel` | `integer` | 0 - Messenger, 2 - SMS, 5 - WhatsApp, 7 - Google Business Message, 8 - Telegram, 9 - Webchat |
| `profile_pic` | `string` | |
| `locale` | `string` | |
| `gender` | `integer` | 0 - Female, 1 - Male, 2 - Unknown |
| `timezone` | `integer` | |
| `last_sent` | `integer($int64)` | Unix timestamp in milliseconds |
| `last_delivered` | `integer($int64)` | Unix timestamp in milliseconds |
| `last_seen` | `integer($int64)` | Unix timestamp in milliseconds |
| `last_interaction` | `integer($int64)` | Unix timestamp in milliseconds |
| `subscribed_date` | `string` | Subscribed date in UTC. Example 2022-10-12 14:40:00 |
| `subscribed` | `integer` | 1 - Subscribed, 2 - Unsubscribed |
| `tags` | `[...]` | |
| `custom_fields` | `[...]` | |

### `Account`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `integer($int64)` | |
| `name` | `string` | |
| `fb_page_id` | `integer($int64)` | |
| `instagram_id` | `integer($int64)` | |
| `waba_id` | `integer($int64)` | |
| `wa_phone_id` | `integer($int64)` | |
| `viber_id` | `integer($int64)` | |
| `active` | `integer` | 0 - False, 1 True Enum: Array [ 2 ] |
| `plan` | `integer` | 1 - Pro Subscription, 4 - FREE, 6 - Pro No Subscription, 11 - LTD, 12 - LTD, 13 - PRO Trial - Downgrade to FREE at the end, 15 - PRO Trial - Force to pay at the end Enum: Array [ 5 ] |
| `created` | `string` | The date (UTC) when the account was created |

