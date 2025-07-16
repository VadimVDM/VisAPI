import {
  randomIntBetween,
  randomItem,
} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Realistic test data for visa processing
const VISA_TYPES = [
  'Tourist',
  'Business',
  'Student',
  'Work',
  'Transit',
  'Medical',
  'Family Visit',
  'Conference',
  'Investment',
  'Diplomatic',
];

const VISA_STATUSES = [
  'submitted',
  'under_review',
  'additional_documents_required',
  'approved',
  'rejected',
  'expired',
  'cancelled',
];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Australia',
  'Japan',
  'Singapore',
  'UAE',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Brazil',
  'India',
  'China',
  'South Korea',
  'New Zealand',
  'Italy',
];

const FIRST_NAMES = [
  'John',
  'Jane',
  'Michael',
  'Sarah',
  'David',
  'Lisa',
  'Robert',
  'Emily',
  'James',
  'Jessica',
  'William',
  'Ashley',
  'Richard',
  'Amanda',
  'Charles',
  'Michelle',
  'Christopher',
  'Stephanie',
  'Daniel',
  'Nicole',
  'Matthew',
  'Jennifer',
  'Anthony',
  'Angela',
  'Mark',
  'Brenda',
  'Donald',
  'Emma',
  'Steven',
  'Olivia',
  'Paul',
  'Cynthia',
  'Andrew',
  'Amy',
  'Joshua',
  'Rebecca',
  'Kenneth',
  'Virginia',
  'Kevin',
  'Maria',
  'Brian',
  'Heather',
  'George',
  'Diane',
  'Edward',
  'Julie',
  'Ronald',
  'Joyce',
  'Timothy',
  'Victoria',
  'Jason',
  'Kelly',
  'Jeffrey',
  'Christina',
  'Ryan',
  'Joan',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Gomez',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
];

const COMPANIES = [
  'TechCorp Solutions',
  'Global Industries Ltd',
  'Innovation Partners',
  'Digital Dynamics',
  'Enterprise Systems',
  'Future Technologies',
  'Strategic Consultants',
  'Advanced Manufacturing',
  'Healthcare Solutions',
  'Financial Services Group',
  'Education Excellence',
  'Research Institute',
  'Development Corporation',
  'International Trade Co',
  'Logistics Partners',
  'Energy Solutions',
  'Media Communications',
  'Travel Services',
  'Construction Group',
  'Retail Networks',
];

const PURPOSES = [
  'Business meetings',
  'Conference attendance',
  'Tourism',
  'Family visit',
  'Medical treatment',
  'Educational program',
  'Research collaboration',
  'Investment opportunities',
  'Trade negotiations',
  'Cultural exchange',
  'Sports competition',
  'Arts performance',
  'Technical training',
  'Diplomatic mission',
  'Transit stopover',
];

// Generate realistic webhook payload for visa processing
export function generateWebhookPayload() {
  const applicantId = randomIntBetween(100000, 999999);
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const visaType = randomItem(VISA_TYPES);
  const status = randomItem(VISA_STATUSES);
  const country = randomItem(COUNTRIES);
  const company = randomItem(COMPANIES);
  const purpose = randomItem(PURPOSES);

  const basePayload = {
    applicant_id: applicantId,
    applicant: {
      id: applicantId,
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
      nationality: randomItem(COUNTRIES),
      passport_number: `${randomItem([
        'A',
        'B',
        'C',
        'D',
        'E',
      ])}${randomIntBetween(10000000, 99999999)}`,
      date_of_birth: generateRandomDate(
        new Date('1960-01-01'),
        new Date('2000-12-31')
      ),
      gender: randomItem(['Male', 'Female', 'Other']),
      address: {
        street: `${randomIntBetween(1, 9999)} ${randomItem([
          'Main',
          'Oak',
          'First',
          'Second',
          'Park',
          'Washington',
        ])} St`,
        city: randomItem([
          'New York',
          'Los Angeles',
          'Chicago',
          'Houston',
          'Phoenix',
          'Philadelphia',
        ]),
        state: randomItem(['NY', 'CA', 'IL', 'TX', 'AZ', 'PA']),
        zip_code: `${randomIntBetween(10000, 99999)}`,
        country: country,
      },
    },
    visa_details: {
      type: visaType,
      status: status,
      application_date: generateRandomDate(new Date('2024-01-01'), new Date()),
      processing_date: generateRandomDate(new Date('2024-01-01'), new Date()),
      decision_date:
        status === 'approved' || status === 'rejected'
          ? generateRandomDate(new Date('2024-01-01'), new Date())
          : null,
      valid_from:
        status === 'approved'
          ? generateRandomDate(new Date(), new Date('2025-12-31'))
          : null,
      valid_until:
        status === 'approved'
          ? generateRandomDate(new Date('2025-01-01'), new Date('2026-12-31'))
          : null,
      duration_days: randomIntBetween(30, 365),
      entries_allowed: randomItem(['Single', 'Multiple']),
      purpose: purpose,
      destination_country: country,
      embassy_location: randomItem([
        'New York',
        'Washington DC',
        'Los Angeles',
        'Chicago',
        'Houston',
      ]),
      reference_number: `VIS${randomIntBetween(100000000, 999999999)}`,
      tracking_id: `TRK${randomIntBetween(100000000, 999999999)}`,
    },
    application_details: {
      travel_dates: {
        departure: generateRandomDate(
          new Date('2025-01-01'),
          new Date('2025-06-30')
        ),
        return: generateRandomDate(
          new Date('2025-02-01'),
          new Date('2025-12-31')
        ),
      },
      accommodation: {
        type: randomItem([
          'Hotel',
          'Hostel',
          'Airbnb',
          'Friend/Family',
          'Company Provided',
        ]),
        address: `${randomIntBetween(1, 999)} ${randomItem([
          'Hotel',
          'Resort',
          'Inn',
          'Lodge',
        ])} ${randomItem(['Plaza', 'Grand', 'Central', 'Royal'])}`,
        city: randomItem([
          'New York',
          'Los Angeles',
          'Chicago',
          'Houston',
          'Phoenix',
        ]),
        booking_reference: `BKG${randomIntBetween(100000, 999999)}`,
      },
      sponsor: {
        name: company,
        type: randomItem([
          'Company',
          'Individual',
          'Organization',
          'Government',
        ]),
        address: `${randomIntBetween(1, 999)} Business Ave, ${randomItem([
          'New York',
          'Los Angeles',
          'Chicago',
        ])}`,
        phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
        email: `contact@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      },
      financial_details: {
        bank_balance: randomIntBetween(5000, 50000),
        monthly_income: randomIntBetween(3000, 15000),
        sponsor_support: randomItem([true, false]),
        insurance_coverage: randomIntBetween(50000, 200000),
        currency: 'USD',
      },
    },
    documents: {
      passport: {
        submitted: true,
        verified: randomItem([true, false]),
        expiry_date: generateRandomDate(
          new Date('2025-01-01'),
          new Date('2035-12-31')
        ),
      },
      photo: {
        submitted: true,
        verified: randomItem([true, false]),
        format: 'JPEG',
        size_kb: randomIntBetween(50, 500),
      },
      financial_statements: {
        submitted: randomItem([true, false]),
        verified: randomItem([true, false]),
        months_covered: randomIntBetween(3, 12),
      },
      invitation_letter: {
        submitted: visaType === 'Business' || visaType === 'Family Visit',
        verified: randomItem([true, false]),
        issuer:
          visaType === 'Business'
            ? company
            : `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      },
      travel_itinerary: {
        submitted: true,
        verified: randomItem([true, false]),
        flights_booked: randomItem([true, false]),
        hotels_booked: randomItem([true, false]),
      },
    },
    processing_history: [
      {
        timestamp: generateRandomDate(new Date('2024-01-01'), new Date()),
        action: 'application_submitted',
        actor: 'applicant',
        details: 'Initial application submitted online',
      },
      {
        timestamp: generateRandomDate(new Date('2024-01-01'), new Date()),
        action: 'documents_reviewed',
        actor: 'visa_officer',
        details: 'Initial document verification completed',
      },
      {
        timestamp: generateRandomDate(new Date('2024-01-01'), new Date()),
        action: 'status_updated',
        actor: 'system',
        details: `Status changed to ${status}`,
      },
    ],
    metadata: {
      source: 'webhook',
      priority: randomItem(['normal', 'high', 'urgent']),
      processing_center: randomItem([
        'NYC001',
        'LAX002',
        'CHI003',
        'HOU004',
        'PHX005',
      ]),
      case_worker: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      estimated_processing_days: randomIntBetween(5, 30),
      fees_paid: randomIntBetween(100, 500),
      payment_method: randomItem([
        'credit_card',
        'bank_transfer',
        'check',
        'money_order',
      ]),
      receipt_number: `RCP${randomIntBetween(100000000, 999999999)}`,
      biometrics_required: randomItem([true, false]),
      interview_required: randomItem([true, false]),
      rush_processing: randomItem([true, false]),
    },
  };

  // Add status-specific fields
  if (status === 'approved') {
    basePayload.approval_details = {
      approval_date: generateRandomDate(new Date('2024-01-01'), new Date()),
      approved_by: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      conditions: randomItem([
        'Standard tourist visa conditions apply',
        'Business activities only',
        'No employment permitted',
        'Study purposes only',
        'Medical treatment only',
      ]),
      stamp_number: `STP${randomIntBetween(100000000, 999999999)}`,
      certificate_number: `CRT${randomIntBetween(100000000, 999999999)}`,
    };
  } else if (status === 'rejected') {
    basePayload.rejection_details = {
      rejection_date: generateRandomDate(new Date('2024-01-01'), new Date()),
      rejected_by: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      reason: randomItem([
        'Insufficient financial documentation',
        'Incomplete application',
        'Travel history concerns',
        'Purpose of visit unclear',
        'Document verification failed',
      ]),
      appeal_deadline: generateRandomDate(new Date(), new Date('2025-06-30')),
      reapplication_allowed: randomItem([true, false]),
    };
  }

  return basePayload;
}

// Generate PDF workflow payload
export function generatePDFWorkflowPayload() {
  const applicantId = randomIntBetween(100000, 999999);
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const visaType = randomItem(VISA_TYPES);
  const documentNumber = `DOC${randomIntBetween(100000000, 999999999)}`;

  return {
    applicant: {
      id: applicantId,
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      nationality: randomItem(COUNTRIES),
      passport_number: `${randomItem([
        'A',
        'B',
        'C',
        'D',
        'E',
      ])}${randomIntBetween(10000000, 99999999)}`,
      photo_url: `https://api.visanet.app/photos/${applicantId}.jpg`,
      contact: `+1${randomIntBetween(1000000000, 9999999999)}`,
    },
    visa_details: {
      type: visaType,
      status: 'approved',
      reference_number: `VIS${randomIntBetween(100000000, 999999999)}`,
      valid_from: generateRandomDate(new Date(), new Date('2025-12-31')),
      valid_until: generateRandomDate(
        new Date('2025-01-01'),
        new Date('2026-12-31')
      ),
      entries_allowed: randomItem(['Single', 'Multiple']),
      destination_country: randomItem(COUNTRIES),
      purpose: randomItem(PURPOSES),
    },
    approval_date: generateRandomDate(new Date('2024-01-01'), new Date()),
    document_number: documentNumber,
    certificate_type: randomItem(['standard', 'urgent', 'premium']),
    template_options: {
      include_qr_code: randomItem([true, false]),
      include_photo: randomItem([true, false]),
      watermark: randomItem([true, false]),
      language: randomItem(['en', 'es', 'fr', 'de', 'it']),
      format: 'A4',
      orientation: 'portrait',
    },
    embassy_details: {
      name: `Embassy of ${randomItem(COUNTRIES)}`,
      location: randomItem([
        'New York',
        'Washington DC',
        'Los Angeles',
        'Chicago',
        'Houston',
      ]),
      officer_name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      officer_title: randomItem([
        'Consul',
        'Vice Consul',
        'Consular Officer',
        'Immigration Officer',
      ]),
      seal_number: `SEAL${randomIntBetween(1000, 9999)}`,
    },
    security_features: {
      digital_signature: true,
      verification_code: `VER${randomIntBetween(100000000, 999999999)}`,
      issue_timestamp: new Date().toISOString(),
      expiry_timestamp: generateRandomDate(
        new Date('2025-01-01'),
        new Date('2026-12-31')
      ),
      authentication_hash: generateRandomHash(),
    },
    document_metadata: {
      page_count: randomIntBetween(1, 3),
      estimated_size_kb: randomIntBetween(200, 1000),
      complexity_level: randomItem(['simple', 'standard', 'complex']),
      processing_priority: randomItem(['normal', 'high', 'urgent']),
    },
  };
}

// Generate unique workflow schemas
export function generateWorkflowSchema() {
  const workflowId = `workflow-${randomIntBetween(1000, 9999)}`;
  const workflowName = `${randomItem([
    'Visa',
    'Permit',
    'Certificate',
    'Document',
  ])} ${randomItem([
    'Processing',
    'Verification',
    'Approval',
    'Generation',
  ])} Workflow`;

  const triggerTypes = ['webhook', 'cron', 'manual'];
  const stepTypes = [
    'log.info',
    'log.warn',
    'log.error',
    'whatsapp.send',
    'email.send',
    'slack.send',
    'pdf.generate',
    'storage.upload',
    'database.update',
    'api.call',
    'webhook.trigger',
    'delay.wait',
    'condition.check',
    'loop.foreach',
    'transform.data',
  ];

  const triggers = [];
  const triggerCount = randomIntBetween(1, 3);

  for (let i = 0; i < triggerCount; i++) {
    const triggerType = randomItem(triggerTypes);
    const trigger = {
      type: triggerType,
      config: {},
    };

    if (triggerType === 'webhook') {
      trigger.config.path = `/${randomItem([
        'visa',
        'permit',
        'application',
        'document',
      ])}-${randomItem(['update', 'status', 'approval', 'submission'])}`;
      trigger.config.method = randomItem(['POST', 'PUT']);
      trigger.config.auth_required = randomItem([true, false]);
    } else if (triggerType === 'cron') {
      trigger.config.schedule = randomItem([
        '0 9 * * 1-5', // Weekdays at 9am
        '0 */2 * * *', // Every 2 hours
        '0 0 * * 0', // Weekly on Sunday
        '0 0 1 * *', // Monthly on 1st
        '0 8,17 * * 1-5', // 8am and 5pm on weekdays
      ]);
      trigger.config.timezone = randomItem(['UTC', 'EST', 'PST', 'CST', 'MST']);
    } else if (triggerType === 'manual') {
      trigger.config.requires_approval = randomItem([true, false]);
      trigger.config.authorized_users = [`user-${randomIntBetween(1, 100)}`];
    }

    triggers.push(trigger);
  }

  const steps = [];
  const stepCount = randomIntBetween(2, 8);

  for (let i = 0; i < stepCount; i++) {
    const stepType = randomItem(stepTypes);
    const step = {
      id: `step-${i + 1}`,
      type: stepType,
      config: {},
      retries: randomIntBetween(0, 3),
      timeout: randomIntBetween(5000, 30000),
    };

    switch (stepType) {
      case 'log.info':
      case 'log.warn':
      case 'log.error':
        step.config.message = `Processing ${randomItem([
          'visa',
          'application',
          'document',
        ])} for {{applicant.name}}`;
        step.config.include_context = randomItem([true, false]);
        break;

      case 'whatsapp.send':
        step.config.contact = '{{applicant.phone}}';
        step.config.template = randomItem([
          'visa_approved',
          'visa_rejected',
          'document_ready',
          'status_update',
        ]);
        step.config.variables = {
          applicant_name: '{{applicant.name}}',
          visa_type: '{{visa.type}}',
          status: '{{visa.status}}',
        };
        break;

      case 'email.send':
        step.config.to = '{{applicant.email}}';
        step.config.template = randomItem([
          'approval_notification',
          'rejection_notification',
          'document_ready',
        ]);
        step.config.attachments = randomItem([true, false]);
        break;

      case 'slack.send':
        step.config.channel = randomItem([
          '#visa-processing',
          '#notifications',
          '#alerts',
        ]);
        step.config.message = `Visa ${randomItem([
          'approved',
          'rejected',
          'pending',
        ])} for {{applicant.name}}`;
        break;

      case 'pdf.generate':
        step.config.template = randomItem([
          'visa_certificate',
          'approval_letter',
          'rejection_letter',
        ]);
        step.config.format = 'A4';
        step.config.orientation = 'portrait';
        step.config.include_qr_code = randomItem([true, false]);
        break;

      case 'storage.upload':
        step.config.bucket = randomItem([
          'visa-documents',
          'certificates',
          'applications',
        ]);
        step.config.path = `{{document.type}}/{{applicant.id}}/{{document.name}}`;
        step.config.public = randomItem([true, false]);
        break;

      case 'database.update':
        step.config.table = randomItem(['applications', 'visas', 'applicants']);
        step.config.where = { id: '{{applicant.id}}' };
        step.config.data = { status: '{{visa.status}}', updated_at: '{{now}}' };
        break;

      case 'api.call':
        step.config.url = `https://api.${randomItem([
          'embassy',
          'immigration',
          'government',
        ])}.gov/{{endpoint}}`;
        step.config.method = randomItem(['GET', 'POST', 'PUT']);
        step.config.headers = { Authorization: 'Bearer {{api_key}}' };
        break;

      case 'delay.wait':
        step.config.duration = randomIntBetween(1000, 60000);
        step.config.reason = randomItem([
          'rate_limiting',
          'processing_delay',
          'system_cooldown',
        ]);
        break;

      case 'condition.check':
        step.config.condition = randomItem([
          '{{applicant.age}} >= 18',
          '{{visa.type}} === "Tourist"',
          '{{documents.passport.verified}} === true',
          '{{application.priority}} === "urgent"',
        ]);
        step.config.on_true = `step-${randomIntBetween(1, stepCount)}`;
        step.config.on_false = `step-${randomIntBetween(1, stepCount)}`;
        break;
    }

    steps.push(step);
  }

  return {
    id: workflowId,
    name: workflowName,
    description: `Automated ${workflowName.toLowerCase()} for efficient visa processing`,
    version: `1.${randomIntBetween(0, 10)}.${randomIntBetween(0, 10)}`,
    enabled: randomItem([true, false]),
    triggers: triggers,
    steps: steps,
    error_handling: {
      on_failure: randomItem(['retry', 'halt', 'continue', 'rollback']),
      max_retries: randomIntBetween(1, 5),
      retry_delay: randomIntBetween(1000, 10000),
      notify_on_failure: randomItem([true, false]),
      fallback_workflow: randomItem([
        null,
        `fallback-${randomIntBetween(1, 10)}`,
      ]),
    },
    monitoring: {
      track_performance: randomItem([true, false]),
      log_level: randomItem(['debug', 'info', 'warn', 'error']),
      metrics_enabled: randomItem([true, false]),
      alert_on_delay: randomItem([true, false]),
      max_execution_time: randomIntBetween(30000, 300000),
    },
    metadata: {
      created_by: `user-${randomIntBetween(1, 100)}`,
      department: randomItem([
        'visa_processing',
        'immigration',
        'consular_services',
      ]),
      priority: randomItem(['low', 'medium', 'high', 'critical']),
      tags: randomItem([
        ['visa', 'processing'],
        ['urgent', 'high-priority'],
        ['automated', 'workflow'],
        ['document', 'generation'],
        ['notification', 'system'],
      ]),
      compliance_level: randomItem(['standard', 'enhanced', 'strict']),
    },
  };
}

// Generate unique applicant data
export function generateApplicantData() {
  const applicantId = randomIntBetween(100000, 999999);
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const nationality = randomItem(COUNTRIES);

  return {
    id: applicantId,
    personal_info: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      date_of_birth: generateRandomDate(
        new Date('1960-01-01'),
        new Date('2000-12-31')
      ),
      place_of_birth: randomItem(COUNTRIES),
      nationality: nationality,
      gender: randomItem(['Male', 'Female', 'Other']),
      marital_status: randomItem(['Single', 'Married', 'Divorced', 'Widowed']),
      occupation: randomItem([
        'Software Engineer',
        'Teacher',
        'Doctor',
        'Lawyer',
        'Student',
        'Business Owner',
        'Consultant',
        'Manager',
        'Artist',
        'Writer',
        'Nurse',
        'Engineer',
        'Scientist',
        'Architect',
        'Designer',
        'Researcher',
        'Analyst',
        'Sales Representative',
      ]),
    },
    contact_info: {
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
      alternative_phone:
        Math.random() > 0.5
          ? `+1${randomIntBetween(1000000000, 9999999999)}`
          : null,
      address: {
        street: `${randomIntBetween(1, 9999)} ${randomItem([
          'Main',
          'Oak',
          'First',
          'Second',
          'Park',
          'Washington',
        ])} St`,
        city: randomItem([
          'New York',
          'Los Angeles',
          'Chicago',
          'Houston',
          'Phoenix',
          'Philadelphia',
        ]),
        state: randomItem(['NY', 'CA', 'IL', 'TX', 'AZ', 'PA']),
        zip_code: `${randomIntBetween(10000, 99999)}`,
        country: nationality,
      },
      emergency_contact: {
        name: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
        relationship: randomItem([
          'Spouse',
          'Parent',
          'Sibling',
          'Friend',
          'Colleague',
        ]),
        phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
        email: `emergency.${randomIntBetween(1000, 9999)}@email.com`,
      },
    },
    travel_document: {
      passport_number: `${randomItem([
        'A',
        'B',
        'C',
        'D',
        'E',
      ])}${randomIntBetween(10000000, 99999999)}`,
      issue_date: generateRandomDate(
        new Date('2015-01-01'),
        new Date('2023-12-31')
      ),
      expiry_date: generateRandomDate(
        new Date('2025-01-01'),
        new Date('2035-12-31')
      ),
      issuing_country: nationality,
      issuing_authority: `${nationality} Passport Office`,
      place_of_issue: randomItem([
        'Capital City',
        'Embassy',
        'Consulate',
        'Regional Office',
      ]),
      type: randomItem(['Ordinary', 'Diplomatic', 'Official', 'Service']),
    },
    visa_history: generateVisaHistory(),
    financial_info: {
      bank_balance: randomIntBetween(5000, 100000),
      monthly_income: randomIntBetween(3000, 20000),
      employment_status: randomItem([
        'Employed',
        'Self-employed',
        'Student',
        'Retired',
        'Unemployed',
      ]),
      employer: randomItem(COMPANIES),
      job_title: randomItem([
        'Software Engineer',
        'Manager',
        'Analyst',
        'Consultant',
        'Director',
        'Specialist',
        'Coordinator',
        'Administrator',
        'Supervisor',
        'Executive',
      ]),
      currency: 'USD',
      sponsor_info:
        Math.random() > 0.7
          ? {
              name: randomItem(COMPANIES),
              type: randomItem(['Company', 'Individual', 'Organization']),
              relationship: randomItem([
                'Employer',
                'Family',
                'Friend',
                'Business Partner',
              ]),
              financial_support: randomIntBetween(1000, 10000),
            }
          : null,
    },
    risk_factors: {
      previous_violations: randomItem([true, false]),
      criminal_record: randomItem([true, false]),
      overstay_history: randomItem([true, false]),
      denied_visas: randomItem([true, false]),
      security_concerns: randomItem([true, false]),
      health_issues: randomItem([true, false]),
      risk_score: randomIntBetween(1, 100),
      risk_level: randomItem(['low', 'medium', 'high']),
      watchlist_status: randomItem(['clear', 'flagged', 'monitoring']),
    },
    preferences: {
      language: randomItem([
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'zh',
        'ja',
        'ko',
      ]),
      communication_method: randomItem(['email', 'sms', 'phone', 'whatsapp']),
      timezone: randomItem(['UTC', 'EST', 'PST', 'CST', 'MST', 'GMT']),
      newsletter_subscription: randomItem([true, false]),
      privacy_settings: {
        share_data: randomItem([true, false]),
        marketing_consent: randomItem([true, false]),
        data_retention: randomItem([
          '1_year',
          '2_years',
          '5_years',
          'indefinite',
        ]),
      },
    },
  };
}

// Generate visa history
function generateVisaHistory() {
  const historyCount = randomIntBetween(0, 5);
  const history = [];

  for (let i = 0; i < historyCount; i++) {
    history.push({
      country: randomItem(COUNTRIES),
      visa_type: randomItem(VISA_TYPES),
      issue_date: generateRandomDate(
        new Date('2015-01-01'),
        new Date('2023-12-31')
      ),
      expiry_date: generateRandomDate(
        new Date('2016-01-01'),
        new Date('2024-12-31')
      ),
      status: randomItem(['used', 'expired', 'cancelled']),
      duration_days: randomIntBetween(30, 365),
      purpose: randomItem(PURPOSES),
      entry_count: randomIntBetween(1, 10),
      notes: randomItem([
        'Regular tourist visit',
        'Business conference',
        'Family visit',
        'Medical treatment',
        'Educational program',
        null,
      ]),
    });
  }

  return history;
}

// Generate unique idempotency key
export function generateIdempotencyKey() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `idem_${timestamp}_${random}`;
}

// Generate random date between two dates
function generateRandomDate(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime).toISOString().split('T')[0];
}

// Generate random hash for security features
function generateRandomHash() {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Generate different visa types and statuses for testing
export function generateVisaTestCase() {
  const visaType = randomItem(VISA_TYPES);
  const baseCase = {
    visa_type: visaType,
    expected_processing_time: getExpectedProcessingTime(visaType),
    required_documents: getRequiredDocuments(visaType),
    fee_structure: getFeeStructure(visaType),
    validity_period: getValidityPeriod(visaType),
    restrictions: getRestrictions(visaType),
  };

  return baseCase;
}

// Helper functions for visa test cases
function getExpectedProcessingTime(visaType) {
  const processingTimes = {
    Tourist: randomIntBetween(5, 15),
    Business: randomIntBetween(10, 20),
    Student: randomIntBetween(15, 30),
    Work: randomIntBetween(20, 45),
    Transit: randomIntBetween(3, 7),
    Medical: randomIntBetween(7, 14),
    'Family Visit': randomIntBetween(10, 25),
    Conference: randomIntBetween(5, 12),
    Investment: randomIntBetween(30, 60),
    Diplomatic: randomIntBetween(1, 5),
  };

  return processingTimes[visaType] || randomIntBetween(5, 30);
}

function getRequiredDocuments(visaType) {
  const baseDocuments = [
    'passport',
    'application_form',
    'photo',
    'financial_statements',
  ];

  const additionalDocuments = {
    Tourist: ['travel_itinerary', 'hotel_bookings'],
    Business: ['invitation_letter', 'company_registration', 'business_plan'],
    Student: [
      'admission_letter',
      'academic_transcripts',
      'financial_support_letter',
    ],
    Work: ['employment_contract', 'work_permit', 'employer_letter'],
    Medical: ['medical_reports', 'treatment_plan', 'doctor_referral'],
    'Family Visit': [
      'family_invitation',
      'relationship_proof',
      'sponsor_documents',
    ],
    Conference: [
      'conference_invitation',
      'registration_confirmation',
      'accommodation_proof',
    ],
    Investment: ['investment_proposal', 'financial_records', 'business_plan'],
    Diplomatic: ['diplomatic_note', 'official_passport', 'ministry_letter'],
  };

  return [...baseDocuments, ...(additionalDocuments[visaType] || [])];
}

function getFeeStructure(visaType) {
  const baseFees = {
    Tourist: randomIntBetween(50, 150),
    Business: randomIntBetween(100, 250),
    Student: randomIntBetween(150, 300),
    Work: randomIntBetween(200, 500),
    Transit: randomIntBetween(25, 75),
    Medical: randomIntBetween(100, 200),
    'Family Visit': randomIntBetween(75, 175),
    Conference: randomIntBetween(50, 125),
    Investment: randomIntBetween(500, 1000),
    Diplomatic: 0,
  };

  return {
    base_fee: baseFees[visaType] || randomIntBetween(50, 200),
    processing_fee: randomIntBetween(10, 50),
    service_fee: randomIntBetween(5, 25),
    urgent_processing_fee: randomIntBetween(50, 200),
    currency: 'USD',
  };
}

function getValidityPeriod(visaType) {
  const validityPeriods = {
    Tourist: randomIntBetween(30, 90),
    Business: randomIntBetween(90, 180),
    Student: randomIntBetween(365, 1095), // 1-3 years
    Work: randomIntBetween(365, 1825), // 1-5 years
    Transit: randomIntBetween(3, 7),
    Medical: randomIntBetween(90, 180),
    'Family Visit': randomIntBetween(90, 180),
    Conference: randomIntBetween(14, 30),
    Investment: randomIntBetween(365, 3650), // 1-10 years
    Diplomatic: randomIntBetween(365, 1095), // 1-3 years
  };

  return validityPeriods[visaType] || randomIntBetween(30, 365);
}

function getRestrictions(visaType) {
  const commonRestrictions = {
    Tourist: ['No employment', 'No business activities', 'Single entry'],
    Business: [
      'No employment',
      'Business activities only',
      'Multiple entries allowed',
    ],
    Student: ['Study only', 'Limited work hours', 'Specific institution'],
    Work: ['Specific employer', 'Specific job role', 'Renewable'],
    Transit: ['Transit only', 'No exit from airport', 'Short duration'],
    Medical: [
      'Medical treatment only',
      'Specific hospital',
      'Accompanied by guardian',
    ],
    'Family Visit': ['Family visit only', 'No employment', 'Sponsor required'],
    Conference: [
      'Conference attendance only',
      'Specific dates',
      'No other activities',
    ],
    Investment: [
      'Investment activities only',
      'Minimum investment amount',
      'Job creation requirement',
    ],
    Diplomatic: [
      'Diplomatic activities only',
      'Reciprocal treatment',
      'Official passport required',
    ],
  };

  return commonRestrictions[visaType] || ['Standard visa conditions apply'];
}
