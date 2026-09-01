# Data Dictionary

This section presents the data dictionary for the "RescueEye" system, documenting all data
elements used within the platform and providing detailed descriptions of each element, its
attributes, and other relevant information.

Revised to match `prisma/schema.prisma`.

---

### Table 8.1 — AGENCY

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Agency_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the agency. |
| Agency_Name | VARCHAR | 100 | NOT NULL | Agency or organization name (e.g., CDRRMO Cebu). |
| Agency_RegistrationStatus | ENUM | – | NOT NULL | Onboarding gate: PENDING, APPROVED, or REJECTED. Default: PENDING. |
| Agency_SubscriptionStatus | ENUM | – | NOT NULL | Ongoing account state: ACTIVE, EXPIRED, or SUSPENDED. Default: ACTIVE. |
| Agency_CreatedBy (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the Agency Admin who self-registered the agency. ON DELETE RESTRICT. |
| Agency_CreatedAt | DATETIME | – | NOT NULL | Timestamp of agency self-registration. |
| Agency_ValidatedBy (FK) | INT | – | YES | Foreign key referencing User.User_ID identifies the System Admin who approved the agency. NULL until reviewed. ON DELETE SET NULL. |
| Agency_ValidatedAt | DATETIME | – | YES | Timestamp of approval by the System Admin. |

Table 8.1 describes the Agency table, which holds the record of each disaster response organization
subscribing to the platform. It records the agency name, its registration status during onboarding,
and its ongoing subscription state, along with the timestamps for self-registration and approval.
The Agency_ID field is the primary key, the Agency_CreatedBy field identifies the Agency Admin who
registered the organization, and the Agency_ValidatedBy field links each approved agency to the
System Admin who reviewed it. Both fields reference the User table, which holds every account on
the platform including System Admins.

---

### Table 9.1 — USER

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| User_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the user account. |
| User_Email | VARCHAR | 120 | NOT NULL | Login email address used for authentication; must be unique. |
| User_PasswordHash | VARCHAR | 255 | NOT NULL | Bcrypt-hashed password; never stored or returned in plaintext. |
| User_Name | VARCHAR | 100 | NOT NULL | Full display name of the user. |
| User_Phone | VARCHAR | 20 | YES | Mobile number used for SMS and push alert delivery. |
| User_Role | ENUM | – | NOT NULL | Role assignment: SYSTEM_ADMIN, AGENCY_ADMIN, COMMAND_STAFF, or FIELD_RESPONDER. Indexed. |
| User_AgencyID (FK) | INT | – | YES | Foreign key referencing Agency.Agency_ID identifies the agency this account belongs to. NULL for SYSTEM_ADMIN accounts, which are platform-level and belong to no agency; NOT NULL for every other role, enforced at the application layer. Indexed. ON DELETE CASCADE. |
| User_Active | BOOLEAN | – | NOT NULL | Indicates whether the account can currently log in. Default: TRUE. |
| User_DutyStatus | ENUM | – | NOT NULL | Current availability: AVAILABLE, ON_DUTY, or OFF_DUTY. Default: AVAILABLE. Meaningful for FIELD_RESPONDER accounts; retains its default for all other roles. |
| User_CreatedAt | DATETIME | – | NOT NULL | Timestamp of account creation. |
| User_LastLogin | DATETIME | – | YES | Timestamp of the most recent successful login. |

Table 9.1 outlines the structure of the User table, which stores account information for every
account on the platform: System Admins, Agency Admins, Command Staff, and Field Responders. It
includes columns for email, hashed password, display name, phone number, role, active state, duty
status, and account timestamps. The User_ID field serves as the primary key, uniquely identifying
each account, while the User_AgencyID field scopes an account to the agency it belongs to. System
Admins are distinguished solely by their User_Role value of SYSTEM_ADMIN and carry a NULL
User_AgencyID, since they operate above any single agency and are responsible for validating
agency registrations.

---

### Table 10.1 — DRONE

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Drone_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the drone unit. |
| Drone_Callsign | VARCHAR | 50 | NOT NULL | Human-readable name or call sign assigned to the drone. |
| Drone_Status | ENUM | – | NOT NULL | Operational state: ACTIVE, IDLE, or OFFLINE. |
| Drone_AddedBy (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the Command Staff who registered the drone. Indexed. ON DELETE RESTRICT. |
| Drone_AgencyID (FK) | INT | – | NOT NULL | Foreign key referencing Agency.Agency_ID scopes the drone to its owning agency. Indexed. ON DELETE CASCADE. |
| Drone_LastLat | DOUBLE | – | YES | Most recently recorded latitude from the drone's GPS. |
| Drone_LastLng | DOUBLE | – | YES | Most recently recorded longitude from the drone's GPS. |
| Drone_LastFeedAt | DATETIME | – | YES | Timestamp of the last video frame received from this drone. |
| Drone_CreatedAt | DATETIME | – | NOT NULL | Timestamp the drone was registered on the platform. |
| Drone_UpdatedAt | DATETIME | – | NOT NULL | Timestamp of the most recent change to the drone record; maintained automatically. |

Table 10.1 describes the Drone table, which holds the operational details of each drone unit used
to capture visual feeds. It includes the drone's callsign, status, the Command Staff who registered
it, the agency that owns it, its most recently recorded position and feed timestamp, and the
record's creation and update timestamps. The Drone_ID field is the primary key, the Drone_AddedBy
field links each drone to the Command Staff member who added it to the platform, and the
Drone_AgencyID field scopes it to its owning agency.

---

### Table 11.1 — DETECTION

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Detection_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the detection record. |
| Detection_DroneID (FK) | INT | – | NOT NULL | Foreign key referencing Drone.Drone_ID identifies the drone whose feed produced this detection. Indexed. ON DELETE CASCADE. |
| Detection_Class | ENUM | – | NOT NULL | Detection class output by the AI model: CASUALTY, DAMAGE_MINOR, DAMAGE_MAJOR, or DAMAGE_SEVERE. |
| Detection_Confidence | DECIMAL | 5,4 | NOT NULL | AI model confidence score, expressed as a decimal between 0 and 1. |
| Detection_BBoxJSON | TEXT | – | NOT NULL | Serialized bounding box coordinates in JSON format [x, y, w, h] overlaid on the drone feed frame. |
| Detection_ModelName | VARCHAR | 50 | NOT NULL | Name of the YOLO model that produced the detection. |
| Detection_ModelVersion | VARCHAR | 20 | NOT NULL | Version or tag of the deployed model. |
| Detection_Lat | DOUBLE | – | NOT NULL | Geospatially mapped latitude of the detected object. |
| Detection_Lng | DOUBLE | – | NOT NULL | Geospatially mapped longitude of the detected object. |
| Detection_Timestamp | DATETIME | – | NOT NULL | Date and time the detection was generated by the AI model. |
| Detection_ReviewStatus | ENUM | – | NOT NULL | Review state after Command Staff validation: PENDING, VALID, or FALSE_POSITIVE. Default: PENDING. |
| Detection_ReviewedBy (FK) | INT | – | YES | Foreign key referencing User.User_ID identifies the Command Staff who verified or rejected the detection. Indexed. ON DELETE SET NULL. |
| Detection_ReviewedAt | DATETIME | – | YES | Timestamp of the Command Staff review decision. |
| Detection_CreatedAt | DATETIME | – | NOT NULL | Timestamp the detection record was persisted by the platform. |

Table 11.1 presents the Detection table, which records each output generated by the AI models from
a drone's video feed. It stores the detection class, confidence score, bounding box coordinates,
the name and version of the model that produced it, the geospatial position, and the review status
assigned after Command Staff validation. The Detection_ID field is the primary key, and the
Detection_DroneID field identifies the drone whose feed produced the detection.

---

### Table 12 — MEDIA

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Media_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the media file. |
| Media_DetectionID (FK) | INT | – | YES | Foreign key referencing Detection.Detection_ID. Exactly one of Media_DetectionID or Media_IncidentID must be set; enforced at the application layer. Indexed. ON DELETE SET NULL. |
| Media_IncidentID (FK) | INT | – | YES | Foreign key referencing Incident.Incident_ID. Exactly one of Media_DetectionID or Media_IncidentID must be set; enforced at the application layer. Indexed. ON DELETE SET NULL. |
| Media_URL | VARCHAR | 500 | NOT NULL | Storage location of the media file. |
| Media_UploadedBy (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the user who uploaded the file. Indexed. ON DELETE RESTRICT. |
| Media_UploadedAt | DATETIME | – | NOT NULL | Timestamp of media upload. |

Table 12 outlines the Media table, which stores the video files captured or uploaded in support of
a detection or an incident. It records the file's storage location, the user who uploaded it, and
the upload timestamp. The Media_ID field is the primary key, while the Media_DetectionID and
Media_IncidentID fields associate each file with either a detection or an incident, exactly one of
which applies per record.

---

### Table 13.1 — INCIDENT

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Incident_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the incident. |
| Incident_DetectionID (FK) | INT | – | YES | Foreign key referencing Detection.Detection_ID identifies the originating AI detection, if applicable. Indexed. ON DELETE SET NULL. |
| Incident_AgencyID (FK) | INT | – | NOT NULL | Foreign key referencing Agency.Agency_ID scopes the incident to its owning agency. Indexed. ON DELETE CASCADE. |
| Incident_Type | ENUM | – | NOT NULL | Incident category: VICTIM_DETECTED, FLOOD, FIRE, STRUCTURAL, or UNKNOWN. |
| Incident_Severity | ENUM | – | NOT NULL | Priority level assigned by Command Staff: CRITICAL, HIGH, MEDIUM, or LOW. |
| Incident_Status | ENUM | – | NOT NULL | Lifecycle state: OPEN, ASSIGNED, IN_PROGRESS, or RESOLVED. Default: OPEN. |
| Incident_Lat | DOUBLE | – | NOT NULL | Latitude of the incident location, plotted on the geospatial map. |
| Incident_Lng | DOUBLE | – | NOT NULL | Longitude of the incident location, plotted on the geospatial map. |
| Incident_Description | VARCHAR | 500 | YES | Free-text description entered by Command Staff. |
| Incident_ReportedBy (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the Command Staff who logged or confirmed the incident. Indexed. ON DELETE RESTRICT. |
| Incident_CreatedAt | DATETIME | – | NOT NULL | Timestamp of incident creation. |
| Incident_UpdatedAt | DATETIME | – | NOT NULL | Timestamp of the most recent change to the incident, including its transition to RESOLVED; maintained automatically. |

Table 13.1 outlines the Incident table, which captures confirmed incidents arising from AI
detections or direct reports by Command Staff. It records the incident type, severity, status,
location, and description, along with the timestamps marking its creation and most recent update.
The Incident_ID field is the primary key, the Incident_DetectionID field links the incident to its
originating detection where applicable, and the Incident_AgencyID field scopes it to its owning
agency.

---

### Table 14.1 — RESPONSE

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Response_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the response record. |
| Response_IncidentID (FK) | INT | – | NOT NULL | Foreign key referencing Incident.Incident_ID identifies the incident being responded to. Indexed. ON DELETE CASCADE. |
| Response_UserID (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the responder assigned to the incident. Indexed. ON DELETE RESTRICT. |
| Response_Status | ENUM | – | NOT NULL | Response lifecycle state: ASSIGNED, ACCEPTED, DECLINED, EN_ROUTE, ON_SITE, or COMPLETED. Default: ASSIGNED. |
| Response_Notes | VARCHAR | 500 | YES | Field notes or status remarks entered by the responder. |
| Response_AssignedAt | DATETIME | – | NOT NULL | Timestamp of assignment by Command Staff. |
| Response_AcceptedAt | DATETIME | – | YES | Timestamp of acceptance by the responder. |
| Response_ArrivedAt | DATETIME | – | YES | Timestamp of on-site arrival. |
| Response_CompletedAt | DATETIME | – | YES | Timestamp of response completion. |
| Response_UpdatedAt | DATETIME | – | NOT NULL | Timestamp of the most recent change to the response record; maintained automatically. |

Table 14.1 presents the Response table, which tracks the assignment of a Field Responder to an
incident from dispatch through completion. It records the response status, field notes, and the
timestamps for assignment, acceptance, on-site arrival, and completion. The Response_ID field is
the primary key, and the Response_IncidentID and Response_UserID fields connect each response to
its incident and to the responder assigned to it.

---

### Table 15.1 — ALERT

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| Alert_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the alert record. |
| Alert_IncidentID (FK) | INT | – | NOT NULL | Foreign key referencing Incident.Incident_ID identifies the incident that triggered this alert. Indexed. ON DELETE CASCADE. |
| Alert_RecipientID (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the field responder who is the intended recipient. Indexed. ON DELETE CASCADE. |
| Alert_Type | ENUM | – | NOT NULL | Delivery channel: SMS, PUSH, or DASHBOARD. |
| Alert_Message | VARCHAR | 300 | NOT NULL | Alert content, including the casualty location and incident details sent to the field responder. |
| Alert_Status | ENUM | – | NOT NULL | Delivery state: SENT, DELIVERED, FAILED, or READ. Default: SENT. |
| Alert_SentAt | DATETIME | – | NOT NULL | Timestamp of when the alert was dispatched by the system. |
| Alert_AcknowledgedAt | DATETIME | – | YES | Timestamp of when the recipient acknowledged the alert. |
| Alert_UpdatedAt | DATETIME | – | NOT NULL | Timestamp of the most recent change to the alert record, such as a delivery-state transition; maintained automatically. |

Table 15.1 describes the Alert table, which logs each notification sent to a Field Responder
following a confirmed incident. It records the delivery channel, message content, delivery status,
and the timestamps for sending and acknowledgment. The Alert_ID field is the primary key, and the
Alert_IncidentID and Alert_RecipientID fields identify the incident that triggered the alert and
its intended recipient.

---

### Table 16 — AUDIT_HISTORY

| Column Name | Data Type | Field Size | Null | Description |
|---|---|---|---|---|
| History_ID (PK) | INT | – | NOT NULL | Primary key, unique identifier for the history entry. |
| History_EntityType | ENUM | – | NOT NULL | Table the changed row belongs to: INCIDENT, RESPONSE, ALERT, DETECTION, or AGENCY. Indexed together with History_EntityID. |
| History_EntityID | INT | – | NOT NULL | Identifier of the affected row within the table named by History_EntityType. Enforced at the application layer. |
| History_FieldChanged | VARCHAR | 50 | NOT NULL | Name of the column that changed. |
| History_OldValue | VARCHAR | 500 | YES | Value recorded before the change. |
| History_NewValue | VARCHAR | 500 | YES | Value recorded after the change. |
| History_ChangedBy (FK) | INT | – | NOT NULL | Foreign key referencing User.User_ID identifies the account that made the change, whatever its role. Indexed. ON DELETE RESTRICT. |
| History_ChangedAt | DATETIME | – | NOT NULL | Timestamp the change was recorded. |

Table 16 presents the Audit_History table, which maintains an audit trail of every status change
recorded across the platform. It stores the affected table and record, the column that changed, its
previous and new values, and the user who made the change. The History_ID field is the primary key,
the History_EntityType and History_EntityID fields together identify the record affected by each
logged change, and the History_ChangedBy field references the User table directly, since every
actor on the platform — System Admins included — is a User account.
